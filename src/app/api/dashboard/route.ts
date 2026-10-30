import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { appointmentSelect } from "@/lib/appointments-server";
import { prisma } from "@/lib/db";
import { patientInclude, presentPatient, summarizePatient } from "@/lib/patient";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const offset = Number(url.searchParams.get("tz") ?? 0);
  const now = new Date();
  const local = new Date(now.getTime() - offset * 60_000);
  const dayStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + offset * 60_000);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const monthStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + offset * 60_000);

  const [rows, today, upcoming, notesThisMonth, attendedThisMonth, newThisMonth] = await Promise.all([
    prisma.patient.findMany({ where: { nutritionistId: user.id }, include: patientInclude }),
    prisma.appointment.findMany({
      where: { nutritionistId: user.id, startsAt: { gte: dayStart, lt: dayEnd } },
      select: appointmentSelect,
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { nutritionistId: user.id, status: "programado", startsAt: { gte: dayEnd } },
      select: appointmentSelect,
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.progressNote.count({ where: { patient: { nutritionistId: user.id }, visitDate: { gte: monthStart } } }),
    prisma.appointment.count({ where: { nutritionistId: user.id, status: "atendido", startsAt: { gte: monthStart } } }),
    prisma.patient.count({ where: { nutritionistId: user.id, createdAt: { gte: monthStart } } }),
  ]);

  const patients = rows.map((row) => {
    const presented = presentPatient(row);
    return { ...summarizePatient(presented), topAlert: presented.alerts.find((a) => a.tone === "high" || a.tone === "mid") ?? null };
  });
  const attention = patients
    .filter((p) => p.topAlert)
    .sort((a, b) => b.alerts - a.alerts)
    .slice(0, 6);
  const overdue = patients
    .filter((p) => p.lastVisit && now.getTime() - new Date(p.lastVisit).getTime() > 60 * 86_400_000 && !p.nextAppointment)
    .sort((a, b) => (a.lastVisit ?? "").localeCompare(b.lastVisit ?? ""))
    .slice(0, 6);
  const recent = [...patients].sort((a, b) => (b.lastVisit ?? b.createdAt).localeCompare(a.lastVisit ?? a.createdAt)).slice(0, 5);

  return NextResponse.json({
    stats: {
      patients: patients.length,
      newThisMonth,
      today: today.filter((a) => a.status !== "cancelado").length,
      visitsThisMonth: Math.max(notesThisMonth, attendedThisMonth),
      withAlerts: patients.filter((p) => p.alerts > 0).length,
    },
    today,
    upcoming,
    attention,
    overdue,
    recent,
  });
}
