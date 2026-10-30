import { NextResponse } from "next/server";
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
  return {
    fullName,
    dni: text(body.dni, 20),
    sex: body.sex === "masculino" ? "masculino" : "femenino",
    birthDate,
    phone: text(body.phone, 40),
    email,
    occupation: text(body.occupation, 120),
    diagnosis: text(body.diagnosis, 1000),
    diabetesType: DIABETES.includes(diabetesType) ? diabetesType : "ninguna",
    heightCm: optionalNumber(body.heightCm, RANGES.heightCm),
  };
}
