/**
 * Importa entregables/full-export.json a la base actual (Neon/PostgreSQL).
 * Uso (con DATABASE_URL y DIRECT_URL de Neon en .env):
 *   node scripts/import-export.mjs
 */
import { existsSync, readFileSync } from "fs";
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

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const exportPath = join(root, "entregables", "full-export.json");
if (!existsSync(exportPath)) {
  console.error("No existe entregables/full-export.json. Corré antes: node scripts/export-all.mjs");
  process.exit(1);
}

const dump = JSON.parse(readFileSync(exportPath, "utf8"));
const prisma = new PrismaClient();

let nutritionists = 0;
let patients = 0;

for (const n of dump.nutritionists ?? []) {
  const existing = await prisma.nutritionist.findUnique({ where: { email: n.email } });
  const nutritionist = existing
    ? await prisma.nutritionist.update({
        where: { id: existing.id },
        data: {
          name: n.name,
          passwordHash: n.passwordHash,
          license: n.license,
          phone: n.phone,
          clinicName: n.clinicName,
          address: n.address,
          mustChangePassword: Boolean(n.mustChangePassword),
        },
      })
    : await prisma.nutritionist.create({
        data: {
          id: n.id,
          email: n.email,
          name: n.name,
          passwordHash: n.passwordHash,
          license: n.license,
          phone: n.phone,
          clinicName: n.clinicName,
          address: n.address,
          mustChangePassword: Boolean(n.mustChangePassword),
          createdAt: n.createdAt ? new Date(n.createdAt) : undefined,
        },
      });
  nutritionists++;

  for (const p of n.patients ?? []) {
    const patient = await prisma.patient.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        nutritionistId: nutritionist.id,
        fullName: p.fullName,
        dni: p.dni,
        sex: p.sex,
        birthDate: p.birthDate,
        phone: p.phone,
        email: p.email,
        occupation: p.occupation,
        diagnosis: p.diagnosis,
        diagnosisCodes: p.diagnosisCodes ?? null,
        diabetesType: p.diabetesType || "ninguna",
        heightCm: p.heightCm,
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
      },
      update: {
        nutritionistId: nutritionist.id,
        fullName: p.fullName,
        dni: p.dni,
        sex: p.sex,
        birthDate: p.birthDate,
        phone: p.phone,
        email: p.email,
        occupation: p.occupation,
        diagnosis: p.diagnosis,
        diagnosisCodes: p.diagnosisCodes ?? null,
        diabetesType: p.diabetesType || "ninguna",
        heightCm: p.heightCm,
      },
    });
    patients++;

    const wipe = async (model) => {
      // @ts-expect-error dynamic
      await prisma[model].deleteMany({ where: { patientId: patient.id } });
    };
    for (const model of ["anamnesis", "isakAssessment", "omronReading", "glucoseReading", "mealEntry", "labResult", "mealPlan", "progressNote"]) {
      await wipe(model);
    }
    await prisma.appointment.deleteMany({ where: { patientId: patient.id } });

    if (p.anamneses?.length) {
      await prisma.anamnesis.createMany({
        data: p.anamneses.map((row) => ({
          id: row.id,
          patientId: patient.id,
          payload: row.payload,
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        })),
      });
    }
    if (p.isak?.length) {
      await prisma.isakAssessment.createMany({
        data: p.isak.map((row) => ({
          id: row.id,
          patientId: patient.id,
          measuredAt: new Date(row.measuredAt),
          payload: row.payload,
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        })),
      });
    }
    if (p.omron?.length) {
      await prisma.omronReading.createMany({
        data: p.omron.map((row) => ({
          id: row.id,
          patientId: patient.id,
          measuredAt: new Date(row.measuredAt),
          payload: row.payload,
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        })),
      });
    }
    if (p.glucose?.length) {
      await prisma.glucoseReading.createMany({
        data: p.glucose.map((row) => ({
          id: row.id,
          patientId: patient.id,
          value: row.value,
          slot: row.slot || "ayunas",
          measuredAt: new Date(row.measuredAt),
        })),
      });
    }
    if (p.meals?.length) {
      await prisma.mealEntry.createMany({
        data: p.meals.map((row) => ({
          id: row.id,
          patientId: patient.id,
          name: row.name,
          type: row.type,
          carbs: row.carbs ?? 0,
          protein: row.protein,
          fat: row.fat,
          sugar: row.sugar,
          calories: row.calories,
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        })),
      });
    }
    if (p.labs?.length) {
      await prisma.labResult.createMany({
        data: p.labs.map((row) => ({
          id: row.id,
          patientId: patient.id,
          glucose: row.glucose,
          hba1c: row.hba1c,
          creatinine: row.creatinine,
          ldl: row.ldl,
          triglycerides: row.triglycerides,
          measuredAt: new Date(row.measuredAt),
        })),
      });
    }
    if (p.plans?.length) {
      await prisma.mealPlan.createMany({
        data: p.plans.map((row) => ({
          id: row.id,
          patientId: patient.id,
          payload: row.payload,
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        })),
      });
    }
    if (p.notes?.length) {
      await prisma.progressNote.createMany({
        data: p.notes.map((row) => ({
          id: row.id,
          patientId: patient.id,
          visitDate: new Date(row.visitDate),
          summary: row.summary,
          agreements: row.agreements,
          nextVisit: row.nextVisit,
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        })),
      });
    }
    if (p.appointments?.length) {
      await prisma.appointment.createMany({
        data: p.appointments.map((row) => ({
          id: row.id,
          nutritionistId: nutritionist.id,
          patientId: patient.id,
          startsAt: new Date(row.startsAt),
          durationMin: row.durationMin ?? 45,
          reason: row.reason,
          status: row.status || "programado",
          createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        })),
        skipDuplicates: true,
      });
    }
  }
}

console.log(`Importado: ${nutritionists} profesionales, ${patients} pacientes`);
await prisma.$disconnect();
