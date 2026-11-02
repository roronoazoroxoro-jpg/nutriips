import { NextResponse } from "next/server";
import { getSessionNutritionist, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, isClinical, staffRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  if (!isClinical(user)) return forbidden();

  const hideEmail = (process.env.INITIAL_EMAIL || "nutricionista@nutriips.local").toLowerCase();
  const team = await prisma.nutritionist.findMany({
    where: { technical: false, role: { not: "technical" } },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      license: true,
      role: true,
      technical: true,
      _count: { select: { patients: true, appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    team: team
      .filter((person) => staffRole(person) !== "technical" && person.email.toLowerCase() !== hideEmail)
      .map((person) => ({
        id: person.id,
        name: person.name,
        email: person.email,
        title: person.title,
        license: person.license,
        role: staffRole(person),
        patients: person._count.patients,
        appointments: person._count.appointments,
      })),
  });
}
