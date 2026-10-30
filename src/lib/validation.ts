export type Range = { min: number; max: number; label: string; unit?: string };

export const RANGES = {
  heightCm: { min: 40, max: 230, label: "Talla", unit: "cm" },
  weightKg: { min: 2, max: 350, label: "Peso", unit: "kg" },
  skinfold: { min: 1, max: 80, label: "Pliegue", unit: "mm" },
  girth: { min: 10, max: 250, label: "Perímetro", unit: "cm" },
  breadth: { min: 2, max: 20, label: "Diámetro", unit: "cm" },
  bodyFatPercent: { min: 3, max: 70, label: "Grasa corporal", unit: "%" },
  visceralFat: { min: 1, max: 30, label: "Grasa visceral" },
  skeletalMusclePercent: { min: 5, max: 70, label: "Músculo esquelético", unit: "%" },
  restingMetabolism: { min: 500, max: 5000, label: "Metabolismo basal", unit: "kcal" },
  bodyAge: { min: 10, max: 110, label: "Edad corporal", unit: "años" },
  glucose: { min: 20, max: 700, label: "Glucosa", unit: "mg/dL" },
  hba1c: { min: 3, max: 20, label: "HbA1c", unit: "%" },
  creatinine: { min: 0.1, max: 20, label: "Creatinina", unit: "mg/dL" },
  ldl: { min: 10, max: 600, label: "LDL", unit: "mg/dL" },
  triglycerides: { min: 10, max: 5000, label: "Triglicéridos", unit: "mg/dL" },
  carbs: { min: 0, max: 600, label: "Carbohidratos", unit: "g" },
  protein: { min: 0, max: 400, label: "Proteínas", unit: "g" },
  calories: { min: 0, max: 6000, label: "Calorías", unit: "kcal" },
  kcalTarget: { min: 800, max: 6000, label: "Meta calórica", unit: "kcal" },
} satisfies Record<string, Range>;

export class ValidationError extends Error {}

/** Devuelve null si está vacío; lanza ValidationError si está fuera de rango. */
export function optionalNumber(value: unknown, range: Range): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) throw new ValidationError(`${range.label}: no es un número válido`);
  if (parsed < range.min || parsed > range.max) {
    const unit = range.unit ? ` ${range.unit}` : "";
    throw new ValidationError(`${range.label} debe estar entre ${range.min} y ${range.max}${unit}`);
  }
  return parsed;
}

export function requiredNumber(value: unknown, range: Range): number {
  const parsed = optionalNumber(value, range);
  if (parsed == null) throw new ValidationError(`${range.label} es obligatorio`);
  return parsed;
}

export function numberMap(source: unknown, range: Range, labels: readonly (readonly [string, string])[]) {
  const input = (source && typeof source === "object" ? source : {}) as Record<string, unknown>;
  return Object.fromEntries(
    labels.map(([key, label]) => [key, optionalNumber(input[key], { ...range, label: `${range.label} ${label.toLowerCase()}` })])
  );
}

export function text(value: unknown, max = 2000) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function parseDate(value: unknown, fallback = new Date()) {
  if (value == null || value === "") return fallback;
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ValidationError("Fecha inválida");
  return date;
}
