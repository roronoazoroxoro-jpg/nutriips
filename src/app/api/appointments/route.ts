import { NextResponse } from "next/server";
import { getSessionNutritionist, ownedPatient, unauthorized } from "@/lib/auth";
import { handleError, notFound, readJson } from "@/lib/api";
import { appointmentSelect, assertNoOverlap, parseStart } from "@/lib/appointments-server";
import { prisma } from "@/lib/db";
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
      nutritionistId: user.id,
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
    if (!(await ownedPatient(user, patientId))) return notFound("Paciente no encontrado");
    const startsAt = parseStart(body.startsAt);
    const durationMin = optionalNumber(body.durationMin, { min: 10, max: 240, label: "Duración", unit: "min" }) ?? 45;
    await assertNoOverlap(user.id, startsAt, durationMin);
    const appointment = await prisma.appointment.create({
      data: { nutritionistId: user.id, patientId, startsAt, durationMin, reason: text(body.reason, 300) },
      select: appointmentSelect,
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
