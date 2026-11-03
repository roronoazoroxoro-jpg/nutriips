import { NextResponse } from "next/server";
import { avatarPublicUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { staffRole } from "@/lib/roles";

export const runtime = "nodejs";

function dayBounds(isoDate: string) {
  const start = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start: today, end };
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Público: tablero del día (sin clave). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const { start, end } = dayBounds(date);

  const hideEmail = (process.env.INITIAL_EMAIL || "nutricionista@nutriips.local").toLowerCase();
  const [team, referrals, appointments] = await Promise.all([
    prisma.nutritionist.findMany({
      where: { NOT: { role: "technical" }, technical: false },
      select: { id: true, name: true, title: true, role: true, license: true, email: true, avatarAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.referral.findMany({
      where: {
        OR: [
          { scheduledAt: { gte: start, lt: end } },
          { status: "pendiente", scheduledAt: null },
          { status: "pendiente", scheduledAt: { gte: start, lt: end } },
          { status: "asignado", scheduledAt: null, updatedAt: { gte: start, lt: end } },
        ],
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true } },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: start, lt: end } },
      select: {
        id: true,
        startsAt: true,
        durationMin: true,
        reason: true,
        status: true,
        nutritionistId: true,
        patient: { select: { id: true, fullName: true, phone: true, dni: true } },
        nutritionist: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const clinical = team.filter((person) => staffRole(person) !== "technical" && person.email.toLowerCase() !== hideEmail);

  const columns = clinical.map((person) => {
    const personReferrals = referrals.filter((row) => row.assignedToId === person.id);
    const personAppointments = appointments.filter((row) => row.nutritionistId === person.id);
    return {
      nutritionist: {
        id: person.id,
        name: person.name,
        title: person.title,
        role: staffRole(person),
        license: person.license,
        avatarUrl: avatarPublicUrl(person),
      },
      referrals: personReferrals,
      appointments: personAppointments,
    };
  });

  const unassigned = referrals.filter((row) => !row.assignedToId);

  return NextResponse.json({
    date,
    columns,
    unassigned,
    totals: {
      referrals: referrals.length,
      appointments: appointments.length,
      pending: referrals.filter((row) => row.status === "pendiente" || !row.assignedToId).length,
    },
  });
}
