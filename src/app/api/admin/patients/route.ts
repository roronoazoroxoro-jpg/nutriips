import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { handleError, readJson } from "@/lib/api";
import { logActivity, notifyNutritionist } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { forbidden, isChief } from "@/lib/roles";
import { ValidationError, text } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  if (!isChief(user)) return forbidden();

  const q = (new URL(request.url).searchParams.get("q") || "").trim().toLowerCase();
  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { dni: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      fullName: true,
      dni: true,
      phone: true,
      diagnosis: true,
      createdAt: true,
      nutritionist: { select: { id: true, name: true } },
    },
    orderBy: { fullName: "asc" },
    take: 80,
  });

  return NextResponse.json({ patients });
}

export async function PATCH(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  if (!isChief(user)) return forbidden();

  try {
    const body = await readJson(request);
    const patientId = text(body.patientId, 40);
    const nutritionistId = text(body.nutritionistId, 40);
    if (!patientId || !nutritionistId) throw new ValidationError("Indicá paciente y nutricionista");

    const [patient, assignee] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, fullName: true, nutritionistId: true } }),
      prisma.nutritionist.findFirst({
        where: { id: nutritionistId, NOT: { role: "technical" } },
        select: { id: true, name: true },
      }),
    ]);
    if (!patient) throw new ValidationError("Paciente no encontrado");
    if (!assignee) throw new ValidationError("Nutricionista no válida");

    await prisma.patient.update({ where: { id: patientId }, data: { nutritionistId } });
    await notifyNutritionist({
      nutritionistId,
      type: "patient.reassigned",
      title: "Paciente reasignado a tu consultorio",
      body: `${patient.fullName} quedó a tu cargo por jefatura.`,
      href: `/panel/pacientes/${patientId}`,
    });
    await logActivity({
      actorId: user.id,
      action: "patient.reassign",
      entity: "patient",
      entityId: patientId,
      detail: { from: patient.nutritionistId, to: nutritionistId, fullName: patient.fullName },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
