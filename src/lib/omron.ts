import type { Sex } from "./isak";

export type OmronInput = {
  model: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  visceralFat: number | null;
  skeletalMusclePercent: number | null;
  restingMetabolism: number | null;
  bodyAge: number | null;
  segmental: {
    rightArmFat?: number | null;
    leftArmFat?: number | null;
    trunkFat?: number | null;
    rightLegFat?: number | null;
    leftLegFat?: number | null;
    rightArmMuscle?: number | null;
    leftArmMuscle?: number | null;
    trunkMuscle?: number | null;
    rightLegMuscle?: number | null;
    leftLegMuscle?: number | null;
  };
};

export const OMRON_MODELS = ["HBF-222T", "HBF-514C", "HBF-516", "HBF-702T", "Otro modelo Omron"];

export function visceralFatLabel(level: number) {
  if (level <= 9) return { label: "Normal (1–9)", tone: "low" as const };
  if (level <= 14) return { label: "Alto (10–14)", tone: "mid" as const };
  return { label: "Muy alto (≥15)", tone: "high" as const };
}

export function bodyFatLabel(sex: Sex, percent: number) {
  const high = sex === "masculino" ? 25 : 32;
  const mid = sex === "masculino" ? 20 : 28;
  if (percent >= high) return { label: "Elevado para seguimiento", tone: "high" as const };
  if (percent >= mid) return { label: "En vigilancia", tone: "mid" as const };
  return { label: "Aceptable", tone: "low" as const };
}

export function mifflinStJeor(input: {
  sex: Sex;
  age: number | null;
  weightKg: number | null;
  statureCm: number | null;
}) {
  if (!input.age || !input.weightKg || !input.statureCm) return null;
  const base =
    10 * input.weightKg + 6.25 * input.statureCm - 5 * input.age + (input.sex === "masculino" ? 5 : -161);
  return Math.round(base);
}

export function evaluateOmron(
  input: OmronInput,
  context: { sex: Sex; age: number | null; statureCm: number | null }
) {
  const equation = mifflinStJeor({
    sex: context.sex,
    age: context.age,
    weightKg: input.weightKg,
    statureCm: context.statureCm,
  });
  const device = input.restingMetabolism;
  const delta = equation != null && device != null ? device - equation : null;
  return {
    visceral: input.visceralFat != null ? visceralFatLabel(input.visceralFat) : null,
    bodyFat: input.bodyFatPercent != null ? bodyFatLabel(context.sex, input.bodyFatPercent) : null,
    equationKcal: equation,
    metabolismDelta: delta,
    note:
      delta != null && Math.abs(delta) >= 250
        ? "La balanza y la ecuación de Mifflin-St Jeor difieren bastante. Conviene revisar edad, talla y si la medición fue en ayunas."
        : "Compará siempre el dato de la balanza con el contexto clínico. Omron estima, no mide grasa de forma directa.",
  };
}
