import { NextResponse } from "next/server";
import { getSessionNutritionist, patientScope, unauthorized } from "@/lib/auth";
import { handleError, patientData, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { patientInclude, presentPatient, summarizePatient } from "@/lib/patient";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const patients = await prisma.patient.findMany({
    where: patientScope(user),
    include: patientInclude,
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json({ patients: patients.map((row) => summarizePatient(presentPatient(row))) });
}

export async function POST(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  try {
    const data = patientData(await readJson(request));
    const patient = await prisma.patient.create({ data: { ...data, nutritionistId: user.id } });
    await logActivity({
      actorId: user.id,
      action: "patient.create",
      entity: "patient",
      entityId: patient.id,
      detail: { fullName: patient.fullName },
    });
    return NextResponse.json({ patient: { id: patient.id } }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
