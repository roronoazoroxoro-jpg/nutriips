import type { Sex } from "./isak";

export type Tone = "high" | "mid" | "good" | "info";
export type Alert = { tone: Tone; title: string; detail: string };
export type Point = { date: string; value: number };

type Source = {
  sex: Sex;
  heightCm: number | null;
  anamneses: { payload: Record<string, string> }[];
  isak: {
    measuredAt: string;
    input: { weightKg: number | null; girths: Record<string, number | null> };
    result: { bmi: number | null; bodyFat: { fatPercent: number } | null; waistRisk: { label: string; tone: string } | null };
  }[];
  omron: { measuredAt: string; input: { weightKg: number | null; bodyFatPercent: number | null; visceralFat: number | null } }[];
  glucose: { value: number; slot: string; measuredAt: string }[];
  labs: { hba1c: number | null; ldl: number | null; triglycerides: number | null; creatinine: number | null; glucose: number | null; measuredAt: string }[];
  notes: { visitDate: string }[];
};

function series(rows: { date: string; value: number | null | undefined }[]): Point[] {
  const byDay = new Map<string, Point>();
  for (const row of rows) {
    if (row.value == null || !Number.isFinite(row.value)) continue;
    byDay.set(row.date.slice(0, 10), { date: row.date, value: row.value });
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const n = (value: number, digits = 1) => value.toLocaleString("es-AR", { maximumFractionDigits: digits });

export function buildTrends(p: Source) {
  const weight = series([
    ...p.isak.map((row) => ({ date: row.measuredAt, value: row.input.weightKg })),
    ...p.omron.map((row) => ({ date: row.measuredAt, value: row.input.weightKg })),
  ]);
  const bmi = p.heightCm
    ? weight.map((point) => ({ date: point.date, value: round1(point.value / (p.heightCm! / 100) ** 2) }))
    : series(p.isak.map((row) => ({ date: row.measuredAt, value: row.result.bmi })));
  return {
    weight,
    bmi,
    bodyFat: series([
      ...p.isak.map((row) => ({ date: row.measuredAt, value: row.result.bodyFat?.fatPercent })),
      ...p.omron.map((row) => ({ date: row.measuredAt, value: row.input.bodyFatPercent })),
    ]),
    waist: series(p.isak.map((row) => ({ date: row.measuredAt, value: row.input.girths?.waist }))),
    visceral: series(p.omron.map((row) => ({ date: row.measuredAt, value: row.input.visceralFat }))),
    fastingGlucose: series(p.glucose.filter((row) => row.slot === "ayunas").map((row) => ({ date: row.measuredAt, value: row.value }))),
    hba1c: series(p.labs.map((row) => ({ date: row.measuredAt, value: row.hba1c }))),
  };
}

export type Trends = ReturnType<typeof buildTrends>;

export function delta(points: Point[]) {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return { value: round1(last.value - prev.value), since: prev.date };
}

function daysBetween(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

export function buildAlerts(p: Source, trends: Trends): Alert[] {
  const alerts: Alert[] = [];
  const lab = p.labs[0];
  const push = (tone: Tone, title: string, detail: string) => alerts.push({ tone, title, detail });

  if (lab?.hba1c != null) {
    if (lab.hba1c >= 6.5) push("high", `HbA1c ${n(lab.hba1c)}%`, "En rango de diabetes (ADA ≥ 6,5%).");
    else if (lab.hba1c >= 5.7) push("mid", `HbA1c ${n(lab.hba1c)}%`, "En rango de prediabetes (ADA 5,7–6,4%).");
  }
  const fasting = p.glucose.find((row) => row.slot === "ayunas");
  if (fasting && fasting.value >= 126) push("high", `Glucemia en ayunas ${n(fasting.value, 0)} mg/dL`, "Por encima de 126 mg/dL.");
  else if (fasting && fasting.value >= 100) push("mid", `Glucemia en ayunas ${n(fasting.value, 0)} mg/dL`, "Glucemia alterada en ayunas (100–125 mg/dL).");
  const post = p.glucose.find((row) => row.slot === "postprandial");
  if (post && post.value >= 180) push("mid", `Glucemia posprandial ${n(post.value, 0)} mg/dL`, "Por encima del objetivo habitual de 180 mg/dL.");
  const low = p.glucose.find((row) => row.value < 70 && daysBetween(row.measuredAt, new Date().toISOString()) <= 30);
  if (low) push("high", `Hipoglucemia registrada (${n(low.value, 0)} mg/dL)`, "Revisar horarios de comidas y medicación con el médico.");

  if (lab?.ldl != null && lab.ldl >= 160) push("high", `LDL ${n(lab.ldl, 0)} mg/dL`, "Colesterol LDL elevado.");
  else if (lab?.ldl != null && lab.ldl >= 130) push("mid", `LDL ${n(lab.ldl, 0)} mg/dL`, "LDL por encima del deseable.");
  if (lab?.triglycerides != null && lab.triglycerides >= 200) push("high", `Triglicéridos ${n(lab.triglycerides, 0)} mg/dL`, "Elevados (≥ 200 mg/dL).");
  else if (lab?.triglycerides != null && lab.triglycerides >= 150) push("mid", `Triglicéridos ${n(lab.triglycerides, 0)} mg/dL`, "Limítrofes (150–199 mg/dL).");
  const creatLimit = p.sex === "masculino" ? 1.3 : 1.1;
  if (lab?.creatinine != null && lab.creatinine > creatLimit) push("mid", `Creatinina ${n(lab.creatinine, 2)} mg/dL`, "Revisar función renal antes de indicar proteínas altas.");

  const omron = p.omron[0];
  if (omron?.input.visceralFat != null && omron.input.visceralFat >= 10) {
    push(omron.input.visceralFat >= 15 ? "high" : "mid", `Grasa visceral ${omron.input.visceralFat}`, "Por encima del rango normal Omron (1–9).");
  }
  const waist = p.isak[0]?.result.waistRisk;
  if (waist && waist.tone !== "low") push(waist.tone === "high" ? "high" : "mid", "Perímetro de cintura", waist.label);

  const bmi = trends.bmi.at(-1)?.value;
  if (bmi != null && bmi < 18.5) push("high", `IMC ${n(bmi)}`, "Bajo peso: evaluar riesgo de desnutrición.");
  else if (bmi != null && bmi >= 30) push("mid", `IMC ${n(bmi)}`, "Obesidad según OMS.");

  const w = trends.weight;
  if (w.length >= 2) {
    const last = w[w.length - 1];
    const rapid = w.slice(0, -1).find((point) => {
      const days = daysBetween(point.date, last.date);
      const pct = ((last.value - point.value) / point.value) * 100;
      return (days <= 45 && pct <= -5) || (days <= 100 && pct <= -7.5) || (days <= 200 && pct <= -10);
    });
    if (rapid) {
      const pct = round1(((rapid.value - last.value) / rapid.value) * 100);
      push("mid", `Pérdida de peso de ${n(pct)}% en ${Math.round(daysBetween(rapid.date, last.date))} días`, "Supera el criterio ASPEN de descenso significativo: confirmar que sea buscado y sin pérdida muscular.");
    }
    const first = w[0];
    const change = round1(last.value - first.value);
    const pct = round1((change / first.value) * 100);
    const since = new Date(first.date).toLocaleDateString("es-AR");
    if (pct <= -3) push("good", `Bajó ${n(Math.abs(change))} kg desde el inicio`, `${n(Math.abs(pct))}% del peso desde el ${since}.`);
    else if (pct >= 3) push("info", `Subió ${n(change)} kg desde el inicio`, `${n(pct)}% del peso desde el ${since}.`);
  }

  const lastContact = [p.notes[0]?.visitDate, p.isak[0]?.measuredAt, p.omron[0]?.measuredAt].filter(Boolean).sort().at(-1);
  if (lastContact) {
    const days = Math.round(daysBetween(lastContact, new Date().toISOString()));
    if (days > 60) push("info", `Sin controles hace ${days} días`, "Conviene agendar un seguimiento.");
  }
  const allergies = p.anamneses[0]?.payload.allergies?.trim();
  if (allergies) push("info", "Alergias e intolerancias", allergies);

  const order: Record<Tone, number> = { high: 0, mid: 1, info: 2, good: 3 };
  return alerts.sort((a, b) => order[a.tone] - order[b.tone]);
}
