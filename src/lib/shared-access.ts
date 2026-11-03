import { getSessionNutritionist, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isClinical, staffRole } from "@/lib/roles";
import { ValidationError } from "@/lib/validation";

const clinicalSelect = {
  id: true,
  name: true,
  email: true,
  title: true,
  license: true,
  role: true,
  technical: true,
  avatarAt: true,
} as const;

export type ClinicalActor = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  license: string | null;
  role: string;
  technical: boolean;
  avatarAt: Date | null;
};

/** Sesión clínica o actorId del equipo (panel compartido sin clave). */
export async function resolveClinicalActor(actorId?: string | null): Promise<ClinicalActor | SessionUser | null> {
  const session = await getSessionNutritionist();
  if (session && isClinical(session)) return session;

  const id = actorId ? String(actorId).trim() : "";
  if (!id) return null;

  const person = await prisma.nutritionist.findFirst({
    where: { id, technical: false, role: { not: "technical" } },
    select: clinicalSelect,
  });
  if (!person || staffRole(person) === "technical") return null;
  return person;
}

export async function requireClinicalActor(actorId?: string | null) {
  const actor = await resolveClinicalActor(actorId);
  if (!actor) {
    throw new ValidationError("Elegí quién está operando en el panel compartido");
  }
  return actor;
}

export async function listClinicalTeam() {
  const hideEmail = (process.env.INITIAL_EMAIL || "nutricionista@nutriips.local").toLowerCase();
  const team = await prisma.nutritionist.findMany({
    where: { technical: false, role: { not: "technical" } },
    select: {
      ...clinicalSelect,
      _count: { select: { patients: true, appointments: true } },
    },
    orderBy: { name: "asc" },
  });
  return team
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
    }));
}
