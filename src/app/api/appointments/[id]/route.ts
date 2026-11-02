import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { handleError, notFound, readJson } from "@/lib/api";
import { APPOINTMENT_STATUS } from "@/lib/appointments";
import { appointmentSelect, assertNoOverlap, parseStart } from "@/lib/appointments-server";
import { prisma } from "@/lib/db";
import { isChief } from "@/lib/roles";
import { ValidationError, optionalNumber, text } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const current = await prisma.appointment.findFirst({
    where: isChief(user) ? { id } : { id, nutritionistId: user.id },
  });
  if (!current) return notFound("Turno no encontrado");
  try {
    const body = await readJson(request);
    const data: { status?: string; startsAt?: Date; durationMin?: number; reason?: string | null } = {};
    if (body.status !== undefined) {
      if (!APPOINTMENT_STATUS.some(([value]) => value === body.status)) throw new ValidationError("Estado de turno inválido");
      data.status = String(body.status);
    }
    if (body.startsAt !== undefined) data.startsAt = parseStart(body.startsAt);
    if (body.durationMin !== undefined) {
      data.durationMin = optionalNumber(body.durationMin, { min: 10, max: 240, label: "Duración", unit: "min" }) ?? 45;
    }
    if (body.reason !== undefined) data.reason = text(body.reason, 300);
    if (data.startsAt || data.durationMin) {
      await assertNoOverlap(current.nutritionistId, data.startsAt ?? current.startsAt, data.durationMin ?? current.durationMin, id);
    }
    const appointment = await prisma.appointment.update({ where: { id }, data, select: appointmentSelect });
    return NextResponse.json({ appointment });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const result = await prisma.appointment.deleteMany({
    where: isChief(user) ? { id } : { id, nutritionistId: user.id },
  });
  if (!result.count) return notFound("Turno no encontrado");
  return NextResponse.json({ ok: true });
}
