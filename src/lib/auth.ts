import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { avatarPublicUrl } from "./avatar";
import { prisma } from "./db";
import { isChief, staffRole } from "./roles";

export const SESSION_COOKIE = "nutriips_session";
const SESSION_DAYS = 14;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("Falta AUTH_SECRET en el archivo .env");
  }
  return value || "nutriips-dev-secret";
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signSession(id: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS;
  const body = Buffer.from(JSON.stringify({ id, exp })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      // Solo HTTPS real (Vercel / COOKIE_SECURE). En `npm start` local sobre http://localhost la cookie Secure no se guarda.
      secure: process.env.COOKIE_SECURE === "true" || process.env.VERCEL === "1",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
    },
  };
}

function readSession(raw: string | undefined) {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as { id?: string; exp?: number };
    if (!data.id || !data.exp || data.exp < Date.now()) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function getSessionNutritionist() {
  const jar = await cookies();
  const id = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return prisma.nutritionist.findUnique({ where: { id } });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionNutritionist>>>;

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    license: user.license,
    phone: user.phone,
    clinicName: user.clinicName,
    address: user.address,
    title: user.title,
    role: staffRole(user),
    technical: user.technical || staffRole(user) === "technical",
    mustChangePassword: user.mustChangePassword,
    avatarUrl: avatarPublicUrl(user),
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Tu sesión terminó. Volvé a ingresar." }, { status: 401 });
}

export async function ownedPatient(user: SessionUser, patientId: string) {
  return prisma.patient.findFirst({ where: { id: patientId, nutritionistId: user.id }, select: { id: true } });
}

/** Acceso a ficha: titular o jefa del departamento. */
export async function canAccessPatient(user: SessionUser, patientId: string) {
  if (isChief(user)) {
    return prisma.patient.findFirst({ where: { id: patientId }, select: { id: true, nutritionistId: true } });
  }
  return prisma.patient.findFirst({ where: { id: patientId, nutritionistId: user.id }, select: { id: true, nutritionistId: true } });
}

export function patientScope(user: SessionUser) {
  return isChief(user) ? {} : { nutritionistId: user.id };
}
