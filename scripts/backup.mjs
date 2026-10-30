import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "prisma", "dev.db");
const folder = join(root, "respaldos");
const KEEP = 30;

if (!existsSync(source)) {
  console.error("No se encontró la base de datos en prisma/dev.db");
  process.exit(1);
}

mkdirSync(folder, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const target = join(folder, `nutriips-${stamp}.db`);
copyFileSync(source, target);
console.log("Respaldo creado:", target);

const old = readdirSync(folder)
  .filter((name) => /^nutriips-.*\.db$/.test(name))
  .sort()
  .slice(0, -KEEP);
for (const name of old) rmSync(join(folder, name));
if (old.length) console.log(`Se borraron ${old.length} respaldos antiguos (se conservan los últimos ${KEEP}).`);
