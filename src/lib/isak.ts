export type Sex = "femenino" | "masculino";

export type IsakInput = {
  age: number | null;
  sex: Sex;
  weightKg: number | null;
  statureCm: number | null;
  skinfolds: Record<string, number | null>;
  girths: Record<string, number | null>;
  breadths: Record<string, number | null>;
};

export const SKINFOLDS = [
  ["triceps", "Tríceps"],
  ["subscapular", "Subescapular"],
  ["biceps", "Bíceps"],
  ["iliacCrest", "Cresta ilíaca"],
  ["supraspinale", "Supraespinal"],
  ["abdominal", "Abdominal"],
  ["thigh", "Muslo frontal"],
  ["calf", "Pantorrilla medial"],
] as const;

export const GIRTHS = [
  ["armRelaxed", "Brazo relajado"],
  ["armFlexed", "Brazo contraído"],
  ["waist", "Cintura"],
  ["hip", "Cadera"],
  ["calf", "Pantorrilla"],
] as const;

export const BREADTHS = [
  ["humerus", "Húmero"],
  ["femur", "Fémur"],
] as const;

function num(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export function ageFromBirthDate(birthDate?: string | null, at = new Date()) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const month = at.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && at.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function bmi(weightKg: number, statureCm: number) {
  const meters = statureCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function bmiLabel(value: number) {
  if (value < 18.5) return "Bajo peso (OMS)";
  if (value < 25) return "Normopeso (OMS)";
  if (value < 30) return "Sobrepeso (OMS)";
  if (value < 35) return "Obesidad clase I (OMS)";
  if (value < 40) return "Obesidad clase II (OMS)";
  return "Obesidad clase III (OMS)";
}

export function waistRisk(sex: Sex, waistCm: number) {
  const high = sex === "masculino" ? 102 : 88;
  const mid = sex === "masculino" ? 94 : 80;
  if (waistCm >= high) return { label: "Riesgo sustancial (OMS)", tone: "high" as const };
  if (waistCm >= mid) return { label: "Riesgo aumentado (OMS)", tone: "mid" as const };
  return { label: "Riesgo bajo (OMS)", tone: "low" as const };
}

export function sumSkinfolds(values: Array<number | null | undefined>) {
  const present = values.map(num).filter((value): value is number => value != null);
  if (!present.length) return null;
  return Math.round(present.reduce((acc, value) => acc + value, 0) * 10) / 10;
}

/** Durnin & Womersley 1974 + Siri 1961. Usa bíceps, tríceps, subescapular y cresta ilíaca. */
export function bodyFatDurnin(input: IsakInput) {
  const folds = [
    num(input.skinfolds.biceps),
    num(input.skinfolds.triceps),
    num(input.skinfolds.subscapular),
    num(input.skinfolds.iliacCrest),
  ];
  if (folds.some((value) => value == null) || !input.age || input.age < 16) return null;
  const sum = folds.reduce<number>((acc, value) => acc + (value ?? 0), 0);
  const log = Math.log10(sum);
  const age = input.age;
  let intercept = 1.1631;
  let slope = 0.0632;
  if (input.sex === "masculino") {
    if (age < 20) [intercept, slope] = [1.162, 0.063];
    else if (age < 30) [intercept, slope] = [1.1631, 0.0632];
    else if (age < 40) [intercept, slope] = [1.1422, 0.0544];
    else if (age < 50) [intercept, slope] = [1.162, 0.07];
    else [intercept, slope] = [1.1715, 0.0779];
  } else if (age < 20) [intercept, slope] = [1.1549, 0.0678];
  else if (age < 30) [intercept, slope] = [1.1599, 0.0717];
  else if (age < 40) [intercept, slope] = [1.1423, 0.0632];
  else if (age < 50) [intercept, slope] = [1.1333, 0.0612];
  else [intercept, slope] = [1.1339, 0.0645];

  const density = intercept - slope * log;
  const fatPercent = (4.95 / density - 4.5) * 100;
  if (!Number.isFinite(fatPercent) || fatPercent < 2 || fatPercent > 70) return null;
  return {
    density: Math.round(density * 10000) / 10000,
    fatPercent: Math.round(fatPercent * 10) / 10,
    source: "Durnin y Womersley 1974 + Siri 1961",
  };
}

/** Área muscular del brazo corregida. Heymsfield 1982. */
export function armMuscleArea(input: IsakInput) {
  const girth = num(input.girths.armRelaxed);
  const triceps = num(input.skinfolds.triceps);
  if (!girth || !triceps) return null;
  const muscleCirc = girth - Math.PI * (triceps / 10);
  const raw = (muscleCirc * muscleCirc) / (4 * Math.PI);
  const corrected = input.sex === "masculino" ? raw - 10 : raw - 6.5;
  return {
    cm2: Math.round(corrected * 10) / 10,
    source: "Heymsfield 1982",
  };
}

export function evaluateIsak(input: IsakInput) {
  const weight = num(input.weightKg);
  const stature = num(input.statureCm);
  const bmiValue = weight && stature ? bmi(weight, stature) : null;
  const waist = num(input.girths.waist);
  const hip = num(input.girths.hip);
  const sum6 = sumSkinfolds([
    input.skinfolds.triceps,
    input.skinfolds.subscapular,
    input.skinfolds.supraspinale,
    input.skinfolds.abdominal,
    input.skinfolds.thigh,
    input.skinfolds.calf,
  ]);
  const sum8 = sumSkinfolds([
    ...SKINFOLDS.map(([key]) => input.skinfolds[key]),
  ]);
  return {
    bmi: bmiValue,
    bmiLabel: bmiValue != null ? bmiLabel(bmiValue) : null,
    waistHipRatio: waist && hip ? Math.round((waist / hip) * 100) / 100 : null,
    waistRisk: waist ? waistRisk(input.sex, waist) : null,
    sum6,
    sum8,
    bodyFat: bodyFatDurnin(input),
    armMuscle: armMuscleArea(input),
  };
}
