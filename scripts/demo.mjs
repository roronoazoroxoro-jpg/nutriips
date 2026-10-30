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

const prisma = new PrismaClient();
const DEMO_NAME = "María Demo (paciente de ejemplo)";

if (process.argv.includes("--borrar")) {
  const { count } = await prisma.patient.deleteMany({ where: { fullName: DEMO_NAME } });
  console.log(count ? "Paciente de ejemplo eliminado." : "No había paciente de ejemplo.");
  await prisma.$disconnect();
  process.exit(0);
}

const owner = await prisma.nutritionist.findFirst({ orderBy: { createdAt: "asc" } });
if (!owner) {
  console.error("Primero ejecutá npm run setup");
  process.exit(1);
}
await prisma.patient.deleteMany({ where: { fullName: DEMO_NAME } });

const day = (offset, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const patient = await prisma.patient.create({
  data: {
    nutritionistId: owner.id,
    fullName: DEMO_NAME,
    dni: "30123456",
    sex: "femenino",
    birthDate: "1982-05-14",
    phone: "11 5555-1234",
    email: "maria.demo@example.com",
    occupation: "Docente",
    diagnosis: "Sobrepeso, prediabetes e hipotiroidismo tratado",
    diabetesType: "prediabetes",
    heightCm: 162,
  },
});

const visits = [
  { offset: -120, weight: 84.2, fat: 38.1, visceral: 11, waist: 98, folds: [24, 28, 14, 30, 22, 32, 30, 20] },
  { offset: -90, weight: 82.6, fat: 37.0, visceral: 10, waist: 95, folds: [23, 26, 13, 28, 21, 30, 29, 19] },
  { offset: -60, weight: 80.9, fat: 35.8, visceral: 10, waist: 92.5, folds: [21, 25, 12, 26, 19, 28, 28, 18] },
  { offset: -30, weight: 79.4, fat: 34.6, visceral: 9, waist: 90, folds: [20, 23, 11, 24, 18, 26, 27, 17] },
  { offset: -2, weight: 78.1, fat: 33.5, visceral: 9, waist: 88, folds: [19, 22, 10, 22, 17, 24, 26, 16] },
];
const keys = ["triceps", "subscapular", "biceps", "iliacCrest", "supraspinale", "abdominal", "thigh", "calf"];

for (const v of visits) {
  await prisma.isakAssessment.create({
    data: {
      patientId: patient.id,
      measuredAt: day(v.offset),
      payload: JSON.stringify({
        weightKg: v.weight,
        statureCm: 162,
        skinfolds: Object.fromEntries(keys.map((k, i) => [k, v.folds[i]])),
        girths: { armRelaxed: 31, armFlexed: 32, waist: v.waist, hip: 110, calf: 37 },
        breadths: { humerus: 6.2, femur: 9.1 },
      }),
    },
  });
  await prisma.omronReading.create({
    data: {
      patientId: patient.id,
      measuredAt: day(v.offset),
      payload: JSON.stringify({
        model: "HBF-514C",
        weightKg: v.weight,
        bodyFatPercent: v.fat,
        visceralFat: v.visceral,
        skeletalMusclePercent: 24.5,
        restingMetabolism: 1480,
        bodyAge: 48,
        segmental: {},
      }),
    },
  });
}

for (const [offset, value, slot] of [[-100, 118, "ayunas"], [-70, 112, "ayunas"], [-40, 106, "ayunas"], [-10, 101, "ayunas"], [-9, 152, "postprandial"]]) {
  await prisma.glucoseReading.create({ data: { patientId: patient.id, value, slot, measuredAt: day(offset, 8) } });
}
await prisma.labResult.create({ data: { patientId: patient.id, measuredAt: day(-118), glucose: 117, hba1c: 6.1, ldl: 148, triglycerides: 182, creatinine: 0.8 } });
await prisma.labResult.create({ data: { patientId: patient.id, measuredAt: day(-5), glucose: 102, hba1c: 5.8, ldl: 131, triglycerides: 150, creatinine: 0.8 } });

await prisma.anamnesis.create({
  data: {
    patientId: patient.id,
    createdAt: day(-120),
    payload: JSON.stringify({
      reason: "Quiere bajar de peso; la médica le indicó cambios por prediabetes.",
      goal: "Bajar peso",
      expectation: "Sentirse con más energía y mejorar los análisis.",
      diagnoses: "Prediabetes. Hipotiroidismo.",
      medications: "Levotiroxina 75 mcg.",
      allergies: "Intolerancia a la lactosa",
      familyHistory: "Madre con diabetes tipo 2.",
      mealsPerDay: "3",
      breakfastTime: "07:00",
      lunchTime: "13:00",
      snackTime: "17:30",
      dinnerTime: "21:30",
      snacking: "Frecuente",
      activity: "Camina 2 veces por semana, 30 minutos",
      sleep: "6",
      water: "4",
      sweetDrinks: "Diario",
      bread: "Diario",
      vegetables: "1 a 2 veces/semana",
      impression: "Exceso de harinas y bebidas azucaradas; baja ingesta de verduras.",
      agreements: "Reemplazar gaseosa por agua saborizada natural. Sumar verduras en el almuerzo.",
      nextVisit: "En 30 días",
    }),
  },
});

const notes = [
  [-120, "Primera consulta. Se realiza anamnesis completa y medición ISAK. Refiere picoteo por la tarde.", "Dejar la gaseosa. Verduras en el almuerzo."],
  [-90, "Buena adherencia. Bajó 1,6 kg. Dejó la gaseosa de lunes a viernes.", "Sumar colación de media tarde planificada."],
  [-60, "Continúa descenso. Aumentó a 3 caminatas semanales.", "Incorporar legumbres 2 veces por semana."],
  [-30, "Semana con eventos sociales; igual mantuvo el descenso. Glucemias en ayunas mejorando.", "Planificar salidas: elegir plato con verduras."],
  [-2, "Control mensual: −6,1 kg desde el inicio, cintura −10 cm. HbA1c bajó a 5,8%.", "Mantener plan. Fuerza 2 veces por semana."],
];
for (const [offset, summary, agreements] of notes) {
  await prisma.progressNote.create({ data: { patientId: patient.id, visitDate: day(offset), summary, agreements, nextVisit: "En 30 días" } });
}

await prisma.appointment.create({ data: { nutritionistId: owner.id, patientId: patient.id, startsAt: day(-2, 10), durationMin: 45, reason: "Control mensual", status: "atendido" } });
await prisma.appointment.create({ data: { nutritionistId: owner.id, patientId: patient.id, startsAt: day(0, 16), durationMin: 30, reason: "Entrega de plan", status: "programado" } });
await prisma.appointment.create({ data: { nutritionistId: owner.id, patientId: patient.id, startsAt: day(28, 10), durationMin: 45, reason: "Control mensual", status: "programado" } });

console.log("Paciente de ejemplo creado:", DEMO_NAME);
console.log("Para borrarlo: npm run demo -- --borrar");
await prisma.$disconnect();
