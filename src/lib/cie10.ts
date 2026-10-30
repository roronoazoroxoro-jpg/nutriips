import catalog from "@/data/cie10.json";
import { CIE10_QUICK, formatCie10Code, type Cie10Selection } from "./cie10-shared";

export type { Cie10Selection };
export { CIE10_QUICK, formatCie10Code, parseDiagnosisCodes, diagnosisLabelFromCodes, serializeDiagnosisCodes } from "./cie10-shared";

export type Cie10Entry = {
  code: string;
  description: string;
  level: number;
  chapter: string;
};

const CIE10 = catalog as Cie10Entry[];

export function normalizeCie10Query(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchCie10(query: string, limit = 25): Cie10Entry[] {
  const q = normalizeCie10Query(query);
  if (q.length < 1) return [];
  const compact = q.replace(/\s/g, "").replace(/\./g, "");
  const tokens = q.split(" ").filter(Boolean);

  const scored: { entry: Cie10Entry; score: number }[] = [];
  for (const entry of CIE10) {
    const codeNorm = entry.code.replace(/\./g, "").toUpperCase();
    const descNorm = normalizeCie10Query(entry.description);
    let score = 0;
    if (codeNorm === compact.toUpperCase()) score = 1000;
    else if (codeNorm.startsWith(compact.toUpperCase())) score = 800 - Math.min(codeNorm.length, 40);
    else if (descNorm.startsWith(q)) score = 600;
    else if (tokens.every((t) => descNorm.includes(t) || codeNorm.includes(t.toUpperCase()))) score = 400;
    else if (descNorm.includes(q) || codeNorm.includes(compact.toUpperCase())) score = 200;
    else continue;
    score += Math.min(entry.level, 4) * 2;
    scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.code.localeCompare(b.entry.code));
  return scored.slice(0, limit).map((s) => ({
    ...s.entry,
    code: formatCie10Code(s.entry.code),
  }));
}

export function catalogSize() {
  return CIE10.length;
}
