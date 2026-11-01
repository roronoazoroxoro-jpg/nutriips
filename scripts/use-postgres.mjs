/**
 * Cambia schema.prisma a PostgreSQL (Neon) y regenera el client.
 * Uso: node scripts/use-postgres.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "prisma", "schema.prisma");
const modelsPath = join(root, "prisma", "schema.postgres.prisma");

copyFileSync(schemaPath, join(root, "prisma", "schema.sqlite.bak.prisma"));

const full = readFileSync(schemaPath, "utf8");
const header = readFileSync(modelsPath, "utf8").replace(/^\/\/.*\n/gm, "").trim();
const modelsStart = full.indexOf("model Nutritionist");
if (modelsStart < 0) {
  console.error("No se encontró el modelo Nutritionist");
  process.exit(1);
}
const models = full.slice(modelsStart);
writeFileSync(schemaPath, `${header}\n\n${models}`);
console.log("schema.prisma → postgresql (Neon)");

const gen = spawnSync("npx", ["prisma", "generate"], { cwd: root, stdio: "inherit", shell: true });
process.exit(gen.status ?? 1);
