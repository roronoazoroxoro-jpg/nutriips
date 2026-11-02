import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, isChief, staffRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  if (!isChief(user)) return forbidden();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekEnd = new Date(dayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const hideEmail = (process.env.INITIAL_EMAIL || "nutricionista@nutriips.local").toLowerCase();
  const [team, patients, todayAppointments, weekAppointments, pendingReferrals, recentActivity] = await Promise.all([
    prisma.nutritionist.findMany({
      where: { NOT: { role: "technical" }, technical: false },
      select: {
        id: true,
        name: true,
        title: true,
        role: true,
        license: true,
        email: true,
        _count: { select: { patients: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.patient.count(),
    prisma.appointment.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd } },
      select: { id: true, status: true, nutritionistId: true },
    }),
    prisma.appointment.count({ where: { startsAt: { gte: dayStart, lt: weekEnd } } }),
    prisma.referral.count({ where: { status: "pendiente" } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { id: true, name: true } } },
    }),
  ]);

  const clinical = team.filter((person) => staffRole(person) !== "technical" && person.email.toLowerCase() !== hideEmail);
  const teamStats = clinical.map((person) => ({
    id: person.id,
    name: person.name,
    title: person.title,
    role: staffRole(person),
    license: person.license,
    email: person.email,
    patients: person._count.patients,
    todayAppointments: todayAppointments.filter((row) => row.nutritionistId === person.id).length,
    todayPresent: todayAppointments.filter((row) => row.nutritionistId === person.id && (row.status === "atendido" || row.status === "presente")).length,
  }));

  return NextResponse.json({
    summary: {
      nutritionists: clinical.length,
      patients,
      todayAppointments: todayAppointments.length,
      weekAppointments,
      pendingReferrals,
      todayPresent: todayAppointments.filter((row) => row.status === "atendido" || row.status === "presente").length,
      todayAbsent: todayAppointments.filter((row) => row.status === "ausente").length,
    },
    team: teamStats,
    activity: recentActivity.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      detail: row.detail,
      createdAt: row.createdAt,
      actor: row.actor,
    })),
  });
}
