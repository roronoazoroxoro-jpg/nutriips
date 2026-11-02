import { NextResponse } from "next/server";
import { avatarPublicUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { staffRole } from "@/lib/roles";

export const runtime = "nodejs";

const PIN_FIRST = "valentinavallejos47@gmail.com";
const PIN_CHIEF = "nutricionistamelgareji@gmail.com";

/** Listado público de nutricionistas para la pantalla de ingreso (sin datos sensibles). */
export async function GET() {
  const hideEmail = (process.env.INITIAL_EMAIL || "nutricionista@nutriips.local").toLowerCase();
  const staff = await prisma.nutritionist.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      phone: true,
      area: true,
      manager: true,
      license: true,
      technical: true,
      role: true,
      avatarAt: true,
    },
  });

  const visible = staff.filter((person) => person.email.toLowerCase() !== hideEmail);

  const sorted = [...visible].sort((a, b) => {
    const aFirst = a.email.toLowerCase() === PIN_FIRST ? 0 : 1;
    const bFirst = b.email.toLowerCase() === PIN_FIRST ? 0 : 1;
    if (aFirst !== bFirst) return aFirst - bFirst;

    const aChief = a.email.toLowerCase() === PIN_CHIEF || staffRole(a) === "chief" ? 0 : 1;
    const bChief = b.email.toLowerCase() === PIN_CHIEF || staffRole(b) === "chief" ? 0 : 1;
    if (aChief !== bChief) return aChief - bChief;

    const aTech = staffRole(a) === "technical" || a.technical ? 1 : 0;
    const bTech = staffRole(b) === "technical" || b.technical ? 1 : 0;
    if (aTech !== bTech) return aTech - bTech;

    return a.name.localeCompare(b.name, "es");
  });

  return NextResponse.json({
    staff: sorted.map((person) => {
      const role = staffRole(person);
      const technical = role === "technical" || person.technical;
      return {
        id: person.id,
        name: person.name,
        email: person.email,
        title: person.title,
        license: person.license,
        role,
        technical,
        avatarUrl: avatarPublicUrl(person),
        phone: technical ? person.phone : undefined,
        area: technical ? person.area : undefined,
        manager: technical ? person.manager : undefined,
      };
    }),
  });
}
