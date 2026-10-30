import { NextResponse } from "next/server";
import { getSessionNutritionist, ownedPatient, unauthorized } from "@/lib/auth";
import { handleError, notFound, patientData, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { patientInclude, presentPatient } from "@/lib/patient";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const patient = await prisma.patient.findFirst({ where: { id, nutritionistId: user.id }, include: patientInclude });
  if (!patient) return notFound("Paciente no encontrado");
  return NextResponse.json({ patient: presentPatient(patient) });
}

export async function PATCH(request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await ownedPatient(user, id))) return notFound("Paciente no encontrado");
  try {
    const data = patientData(await readJson(request));
    const patient = await prisma.patient.update({ where: { id }, data, include: patientInclude });
    return NextResponse.json({ patient: presentPatient(patient) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await ownedPatient(user, id))) return notFound("Paciente no encontrado");
  await prisma.patient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
