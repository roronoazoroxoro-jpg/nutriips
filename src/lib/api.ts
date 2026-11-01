import { NextResponse } from "next/server";
import { formatCie10Code, serializeDiagnosisCodes, type Cie10Selection } from "./cie10-shared";
import { RANGES, ValidationError, optionalNumber, text } from "./validation";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "No encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError("Los datos enviados no son válidos");
  }
}

/** Convierte errores de validación en 400 y el resto en 500 con mensaje legible. */
export function handleError(error: unknown) {
  if (error instanceof ValidationError) return badRequest(error.message);
  console.error(error);
  const message = error instanceof Error ? error.message : "";
  if (/Can't reach database|P1001|P1002|P1017|ECONNREFUSED|timeout/i.test(message)) {
    return NextResponse.json(
      { error: "No hay conexión con la base de datos. Revisá DATABASE_URL / DIRECT_URL o el estado de Neon." },
      { status: 503 }
    );
  }
  if (/Unique constraint|P2002/i.test(message)) {
    return badRequest("Ese dato ya existe (por ejemplo un email o DNI duplicado).");
  }
  return NextResponse.json({ error: "Ocurrió un error inesperado. Probá de nuevo." }, { status: 500 });
}

const DIABETES = ["ninguna", "prediabetes", "tipo 1", "tipo 2", "gestacional"];

export function patientData(body: Record<string, unknown>) {
  const fullName = text(body.fullName, 120);
  if (!fullName) throw new ValidationError("El nombre y apellido es obligatorio");
  const birthDate = text(body.birthDate, 10);
  if (birthDate) {
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime()) || date > new Date() || date.getFullYear() < 1900) {
      throw new ValidationError("La fecha de nacimiento no es válida");
    }
  }
  const email = text(body.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("El email del paciente no es válido");
  const diabetesType = String(body.diabetesType || "ninguna");
  const diagnosisCodes = normalizeDiagnosisCodes(body.diagnosisCodes);
  return {
    fullName,
    dni: text(body.dni, 20),
    sex: body.sex === "masculino" ? "masculino" : "femenino",
    birthDate,
    phone: text(body.phone, 40),
    email,
    occupation: text(body.occupation, 120),
    diagnosis: text(body.diagnosis, 1000),
    diagnosisCodes: diagnosisCodes.length ? serializeDiagnosisCodes(diagnosisCodes) : null,
    diabetesType: DIABETES.includes(diabetesType) ? diabetesType : "ninguna",
    heightCm: optionalNumber(body.heightCm, RANGES.heightCm),
  };
}

function normalizeDiagnosisCodes(raw: unknown): Cie10Selection[] {
  if (!Array.isArray(raw)) return [];
  const out: Cie10Selection[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const code = formatCie10Code(String((item as Cie10Selection).code || ""));
    const description = text((item as Cie10Selection).description, 240);
    if (!code || !/^[A-Z][0-9]{2}/.test(code.replace(/\./g, ""))) continue;
    const key = code.replace(/\./g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ code, description: description || code });
  }
  return out;
}
