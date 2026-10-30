/**
 * Cambia el provider de Prisma a PostgreSQL (para Neon / Vercel).
 * Uso: node scripts/switch-to-postgres.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "prisma", "schema.prisma");
let schema = readFileSync(schemaPath, "utf8");
if (schema.includes('provider = "postgresql"')) {
  console.log("Ya está en PostgreSQL");
  process.exit(0);
}
schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
writeFileSync(schemaPath, schema);
console.log("schema.prisma → postgresql");
console.log("Siguiente: definí DATABASE_URL de Neon y corré: npx prisma db push && npm run db:seed -- --reset-passwords");
