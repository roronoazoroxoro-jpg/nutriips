export type Cie10Selection = {
  code: string;
  description: string;
};

/** Códigos frecuentes en nutrición clínica (atajos). */
export const CIE10_QUICK: Cie10Selection[] = [
  { code: "E66", description: "Obesidad" },
  { code: "E65", description: "Adiposidad localizada" },
  { code: "E11", description: "Diabetes mellitus no insulinodependiente" },
  { code: "E10", description: "Diabetes mellitus insulinodependiente" },
  { code: "E14", description: "Diabetes mellitus, no especificada" },
  { code: "R73", description: "Nivel elevado de glucosa en sangre" },
  { code: "E03", description: "Otros hipotiroidismos" },
  { code: "E78", description: "Trastornos del metabolismo de lipoproteínas y otras lipidemias" },
  { code: "E46", description: "Desnutrición proteicoenergética, no especificada" },
  { code: "E44", description: "Desnutrición proteicoenergética de grado moderado y leve" },
  { code: "E50", description: "Deficiencia de vitamina A" },
  { code: "E55", description: "Deficiencia de vitamina D" },
  { code: "E61", description: "Deficiencia de otros elementos nutricionales" },
  { code: "K90", description: "Malabsorción intestinal" },
  { code: "K90.0", description: "Enfermedad celíaca" },
  { code: "F50", description: "Trastornos de la ingestión de alimentos" },
  { code: "F50.0", description: "Anorexia nerviosa" },
  { code: "F50.2", description: "Bulimia nerviosa" },
  { code: "I10", description: "Hipertensión esencial (primaria)" },
  { code: "N18", description: "Enfermedad renal crónica" },
  { code: "O24", description: "Diabetes mellitus en el embarazo" },
  { code: "Z71.3", description: "Consulta para vigilancia dietética y alimentación" },
];

export function formatCie10Code(code: string) {
  const raw = code.trim().toUpperCase().replace(/\./g, "");
  if (/^[A-Z]\d{2}\d+$/.test(raw)) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
  return code.trim().toUpperCase();
}

export function parseDiagnosisCodes(raw: string | null | undefined): Cie10Selection[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const code = String((item as Cie10Selection).code || "").trim();
        const description = String((item as Cie10Selection).description || "").trim();
        if (!code) return null;
        return { code: formatCie10Code(code), description };
      })
      .filter(Boolean) as Cie10Selection[];
  } catch {
    return [];
  }
}

export function diagnosisLabelFromCodes(codes: Cie10Selection[], fallback?: string | null) {
  if (codes.length) return codes.map((c) => `${c.code} · ${c.description}`).join("; ");
  return fallback?.trim() || "";
}

export function serializeDiagnosisCodes(codes: Cie10Selection[]) {
  return JSON.stringify(
    codes.map((c) => ({
      code: formatCie10Code(c.code),
      description: String(c.description || "").trim(),
    }))
  );
}
