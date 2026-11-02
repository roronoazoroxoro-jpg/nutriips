import { NextResponse } from "next/server";
import { canAccessPatient, getSessionNutritionist, unauthorized } from "@/lib/auth";
import { handleError, notFound, patientData, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { patientInclude, presentPatient } from "@/lib/patient";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await canAccessPatient(user, id))) return notFound("Paciente no encontrado");
  const patient = await prisma.patient.findFirst({ where: { id }, include: patientInclude });
  if (!patient) return notFound("Paciente no encontrado");
  return NextResponse.json({ patient: presentPatient(patient) });
}

export async function PATCH(request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await canAccessPatient(user, id))) return notFound("Paciente no encontrado");
  try {
    const data = patientData(await readJson(request));
    const patient = await prisma.patient.update({ where: { id }, data, include: patientInclude });
    await logActivity({
      actorId: user.id,
      action: "patient.update",
      entity: "patient",
      entityId: id,
      detail: { fullName: patient.fullName },
    });
    return NextResponse.json({ patient: presentPatient(patient) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await canAccessPatient(user, id))) return notFound("Paciente no encontrado");
  await prisma.patient.delete({ where: { id } });
  await logActivity({ actorId: user.id, action: "patient.delete", entity: "patient", entityId: id });
  return NextResponse.json({ ok: true });
}
