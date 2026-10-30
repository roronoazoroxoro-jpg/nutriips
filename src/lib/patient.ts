import { ageFromBirthDate, evaluateIsak, type IsakInput, type Sex } from "./isak";
import { evaluateOmron, type OmronInput } from "./omron";
import { nutritionSnapshot } from "./nutrition";
import { buildAlerts, buildTrends } from "./insights";
import type { MealPlanData } from "./plan";

type Row = { id: string; measuredAt: Date; payload: string };

function parse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const newestFirst = <T>(rows: T[], key: (row: T) => Date) => [...rows].sort((a, b) => key(b).getTime() - key(a).getTime());

export function presentPatient(patient: {
  id: string;
  fullName: string;
  dni: string | null;
  sex: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  diagnosis: string | null;
  diabetesType: string;
  heightCm: number | null;
  createdAt: Date;
  anamneses: { id: string; payload: string; createdAt: Date }[];
  isak: Row[];
  omron: Row[];
  glucose: { id: string; value: number; slot: string; measuredAt: Date }[];
  meals: { id: string; name: string; type: string; carbs: number; protein: number | null; fat: number | null; sugar: number | null; calories: number | null; createdAt: Date }[];
  labs: { id: string; glucose: number | null; hba1c: number | null; creatinine: number | null; ldl: number | null; triglycerides: number | null; measuredAt: Date }[];
  plans: { id: string; payload: string; createdAt: Date }[];
  notes: { id: string; visitDate: Date; summary: string; agreements: string | null; nextVisit: string | null; createdAt: Date }[];
  appointments: { id: string; startsAt: Date; durationMin: number; reason: string | null; status: string }[];
}) {
  const sex = (patient.sex === "masculino" ? "masculino" : "femenino") as Sex;
  const age = ageFromBirthDate(patient.birthDate);
  const iso = (date: Date) => date.toISOString();

  const isak = newestFirst(patient.isak, (row) => row.measuredAt).map((row) => {
    const input = parse<IsakInput>(row.payload, { age: null, sex, weightKg: null, statureCm: null, skinfolds: {}, girths: {}, breadths: {} });
    input.skinfolds ??= {};
    input.girths ??= {};
    input.breadths ??= {};
    return { id: row.id, measuredAt: iso(row.measuredAt), input, result: evaluateIsak({ ...input, age, sex }) };
  });
  const omron = newestFirst(patient.omron, (row) => row.measuredAt).map((row) => {
    const input = parse<OmronInput>(row.payload, {
      model: "",
      weightKg: null,
      bodyFatPercent: null,
      visceralFat: null,
      skeletalMusclePercent: null,
      restingMetabolism: null,
      bodyAge: null,
      segmental: {},
    });
    return { id: row.id, measuredAt: iso(row.measuredAt), input, result: evaluateOmron(input, { sex, age, statureCm: patient.heightCm }) };
  });

  const base = {
    id: patient.id,
    fullName: patient.fullName,
    dni: patient.dni,
    sex,
    age,
    birthDate: patient.birthDate,
    phone: patient.phone,
    email: patient.email,
    occupation: patient.occupation,
    diagnosis: patient.diagnosis,
    diabetesType: patient.diabetesType,
    heightCm: patient.heightCm,
    createdAt: iso(patient.createdAt),
    anamneses: newestFirst(patient.anamneses, (row) => row.createdAt).map((row) => ({
      id: row.id,
      createdAt: iso(row.createdAt),
      payload: parse<Record<string, string>>(row.payload, {}),
    })),
    isak,
    omron,
    glucose: newestFirst(patient.glucose, (row) => row.measuredAt).map((row) => ({ ...row, measuredAt: iso(row.measuredAt) })),
    meals: newestFirst(patient.meals, (row) => row.createdAt).map((row) => ({ ...row, createdAt: iso(row.createdAt) })),
    labs: newestFirst(patient.labs, (row) => row.measuredAt).map((row) => ({ ...row, measuredAt: iso(row.measuredAt) })),
    plans: newestFirst(patient.plans, (row) => row.createdAt).map((row) => ({
      id: row.id,
      createdAt: iso(row.createdAt),
      plan: parse<MealPlanData | null>(row.payload, null),
    })),
    notes: newestFirst(patient.notes, (row) => row.visitDate).map((row) => ({
      ...row,
      visitDate: iso(row.visitDate),
      createdAt: iso(row.createdAt),
    })),
    appointments: [...patient.appointments]
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((row) => ({ ...row, startsAt: iso(row.startsAt) })),
    nutrition: nutritionSnapshot(patient.meals),
  };
  const trends = buildTrends(base);
  return { ...base, trends, alerts: buildAlerts(base, trends) };
}

export type PresentedPatient = ReturnType<typeof presentPatient>;

export const patientInclude = {
  anamneses: true,
  isak: true,
  omron: true,
  glucose: true,
  meals: true,
  labs: true,
  plans: { orderBy: { createdAt: "desc" as const }, take: 10 },
  notes: true,
  appointments: true,
};

export function summarizePatient(p: PresentedPatient) {
  const lastVisit = [p.notes[0]?.visitDate, p.isak[0]?.measuredAt, p.omron[0]?.measuredAt, p.anamneses[0]?.createdAt]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const now = Date.now();
  const nextAppointment = p.appointments.find((row) => new Date(row.startsAt).getTime() >= now && row.status === "programado") ?? null;
  return {
    id: p.id,
    fullName: p.fullName,
    dni: p.dni,
    phone: p.phone,
    sex: p.sex,
    age: p.age,
    diagnosis: p.diagnosis,
    diabetesType: p.diabetesType,
    createdAt: p.createdAt,
    weight: p.trends.weight.at(-1)?.value ?? null,
    bmi: p.trends.bmi.at(-1)?.value ?? null,
    bodyFat: p.trends.bodyFat.at(-1)?.value ?? null,
    visceral: p.omron[0]?.input.visceralFat ?? null,
    alerts: p.alerts.filter((alert) => alert.tone === "high" || alert.tone === "mid").length,
    lastVisit,
    nextAppointment: nextAppointment?.startsAt ?? null,
  };
}

export type PatientSummary = ReturnType<typeof summarizePatient>;
