import { NextResponse } from "next/server";
import { canAccessPatient, getSessionNutritionist, unauthorized } from "@/lib/auth";
import { handleError, notFound, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { appointmentSelect, assertNoOverlap, parseStart } from "@/lib/appointments-server";
import { prisma } from "@/lib/db";
import { isChief } from "@/lib/roles";
import { ValidationError, optionalNumber, text } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const appointments = await prisma.appointment.findMany({
    where: {
      ...(isChief(user) ? {} : { nutritionistId: user.id }),
      startsAt: {
        gte: from ? new Date(from) : undefined,
        lt: to ? new Date(to) : undefined,
      },
    },
    select: appointmentSelect,
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  try {
    const body = await readJson(request);
    const patientId = String(body.patientId ?? "");
    if (!patientId) throw new ValidationError("Elegí el paciente");
    const access = await canAccessPatient(user, patientId);
    if (!access) return notFound("Paciente no encontrado");
    const ownerId = access.nutritionistId || user.id;
    const forNutritionistId = isChief(user) && body.nutritionistId ? String(body.nutritionistId) : ownerId;
    const startsAt = parseStart(body.startsAt);
    const durationMin = optionalNumber(body.durationMin, { min: 10, max: 240, label: "Duración", unit: "min" }) ?? 45;
    await assertNoOverlap(forNutritionistId, startsAt, durationMin);
    const appointment = await prisma.appointment.create({
      data: {
        nutritionistId: forNutritionistId,
        patientId,
        startsAt,
        durationMin,
        reason: text(body.reason, 300),
      },
      select: appointmentSelect,
    });
    await logActivity({
      actorId: user.id,
      action: "appointment.create",
      entity: "appointment",
      entityId: appointment.id,
      detail: { patientId, nutritionistId: forNutritionistId },
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
