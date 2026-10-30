import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawPath = join(root, "data", "cie10-raw.csv");
const outJson = join(root, "data", "cie10.json");
const outSrc = join(root, "src", "data", "cie10.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

let buf = readFileSync(rawPath);
let text = buf.toString("utf8");
if (text.includes("\uFFFD") || /Ã.|Â./.test(text.slice(0, 2000))) text = buf.toString("latin1");

const rows = parseCsv(text);
const header = rows[0].map((h) => h.trim());
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const CHAPTERS = {
  A: "Infecciosas y parasitarias",
  B: "Infecciosas y parasitarias",
  C: "Tumores",
  D: "Sangre / tumores in situ / inmunidad",
  E: "Endocrinas, nutricionales y metabólicas",
  F: "Trastornos mentales",
  G: "Sistema nervioso",
  H: "Ojo / oído",
  I: "Circulatorio",
  J: "Respiratorio",
  K: "Digestivo",
  L: "Piel",
  M: "Osteomuscular",
  N: "Genitourinario",
  O: "Embarazo, parto y puerperio",
  P: "Período perinatal",
  Q: "Malformaciones congénitas",
  R: "Síntomas y signos",
  S: "Traumatismos",
  T: "Traumatismos / intoxicaciones",
  U: "Códigos especiales",
  V: "Causas externas",
  W: "Causas externas",
  X: "Causas externas",
  Y: "Causas externas",
  Z: "Factores que influyen en el estado de salud",
};

const codes = [];
for (const row of rows.slice(1)) {
  const code = (row[idx.code] || "").trim().toUpperCase();
  const description = (row[idx.description] || "").trim();
  const level = Number(row[idx.level] ?? 0);
  if (!code || !description) continue;
  // Omitimos solo capítulos amplios (rangos tipo A00-B99)
  if (code.includes("-")) continue;
  const letter = code[0];
  codes.push({
    code,
    description: description.replace(/\s+/g, " "),
    level: Number.isFinite(level) ? level : 0,
    chapter: CHAPTERS[letter] || "Otros",
  });
}

codes.sort((a, b) => a.code.localeCompare(b.code, "en"));

mkdirSync(join(root, "data"), { recursive: true });
mkdirSync(join(root, "src", "data"), { recursive: true });
const payload = JSON.stringify(codes);
writeFileSync(outJson, payload);
writeFileSync(outSrc, payload);

console.log(`CIE-10 importado: ${codes.length} códigos`);
console.log(`JSON: ${outJson}`);
console.log(
  "Ejemplos:",
  codes.filter((c) => c.code === "E66" || c.code.startsWith("E66.") || c.code.startsWith("E11")).slice(0, 10)
);
