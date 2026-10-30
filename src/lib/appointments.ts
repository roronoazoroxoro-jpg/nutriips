export const APPOINTMENT_STATUS = [
  ["programado", "Programado"],
  ["atendido", "Atendido"],
  ["ausente", "Ausente"],
  ["cancelado", "Cancelado"],
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number][0];

export function statusLabel(status: string) {
  return APPOINTMENT_STATUS.find(([value]) => value === status)?.[1] ?? status;
}

export type AppointmentRow = {
  id: string;
  startsAt: string;
  durationMin: number;
  reason: string | null;
  status: string;
  patient: { id: string; fullName: string; phone: string | null };
};
