/**
 * Exporta toda la base local (SQLite) a entregables/full-export.json
 * para poder cargarla luego en PostgreSQL/Neon.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
}

const prisma = new PrismaClient();
const nutritionists = await prisma.nutritionist.findMany({
  include: {
    patients: {
      include: {
        anamneses: true,
        isak: true,
        omron: true,
        glucose: true,
        meals: true,
        labs: true,
        plans: true,
        notes: true,
        appointments: true,
      },
    },
    appointments: true,
  },
});

const outDir = join(root, "entregables");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "full-export.json");
writeFileSync(
  out,
  JSON.stringify(
    {
      app: "NutriIPS",
      version: 1,
      exportedAt: new Date().toISOString(),
      nutritionists,
    },
    null,
    2
  )
);
console.log(`Exportado ${nutritionists.length} profesionales → ${out}`);
await prisma.$disconnect();
