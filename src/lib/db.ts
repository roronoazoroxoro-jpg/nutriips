import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[NutriIPS] Falta DATABASE_URL en las variables de entorno");
  } else if (url.startsWith("file:")) {
    console.error("[NutriIPS] DATABASE_URL apunta a SQLite. En producción usá PostgreSQL (Neon).");
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "minimal",
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Comprueba que la base responde. */
export async function pingDatabase() {
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true as const, ms: Date.now() - started };
}
