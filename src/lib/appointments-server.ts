import { prisma } from "./db";
import { ValidationError } from "./validation";

export const appointmentSelect = {
  id: true,
  startsAt: true,
  durationMin: true,
  reason: true,
  status: true,
  patient: { select: { id: true, fullName: true, phone: true } },
} as const;

export function parseStart(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (!value || Number.isNaN(date.getTime())) throw new ValidationError("Elegí fecha y hora del turno");
  return date;
}

export async function assertNoOverlap(nutritionistId: string, startsAt: Date, durationMin: number, excludeId?: string) {
  const end = new Date(startsAt.getTime() + durationMin * 60_000);
  const nearby = await prisma.appointment.findMany({
    where: {
      nutritionistId,
      status: { in: ["programado", "atendido"] },
      id: excludeId ? { not: excludeId } : undefined,
      startsAt: { gte: new Date(startsAt.getTime() - 6 * 3_600_000), lt: end },
    },
    include: { patient: { select: { fullName: true } } },
  });
  const clash = nearby.find((row) => row.startsAt.getTime() + row.durationMin * 60_000 > startsAt.getTime());
  if (clash) {
    const hour = clash.startsAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    throw new ValidationError(`Se superpone con el turno de ${clash.patient.fullName} (${hour})`);
  }
}
