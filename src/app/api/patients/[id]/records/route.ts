import { NextResponse } from "next/server";
import { getSessionNutritionist, ownedPatient, unauthorized } from "@/lib/auth";
import { badRequest, handleError, notFound, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { BREADTHS, GIRTHS, SKINFOLDS } from "@/lib/isak";
import { OMRON_MODELS } from "@/lib/omron";
import { ANAMNESIS_SECTIONS } from "@/lib/anamnesis";
import { ACTIVITY, GOALS, type MealPlanData } from "@/lib/plan";
import { GLUCOSE_SLOTS, MEAL_TYPES } from "@/lib/nutrition";
import { patientInclude, presentPatient } from "@/lib/patient";
import { RANGES, ValidationError, numberMap, optionalNumber, parseDate, requiredNumber, text } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
type Payload = Record<string, unknown>;

async function reload(id: string) {
  const patient = await prisma.patient.findUniqueOrThrow({ where: { id }, include: patientInclude });
  return presentPatient(patient);
}

const ANAMNESIS_KEYS = ANAMNESIS_SECTIONS.flatMap((section) => section.fields.map((field) => field.key));

function anamnesisPayload(payload: Payload) {
  return Object.fromEntries(ANAMNESIS_KEYS.map((key) => [key, text(payload[key], 3000) ?? ""]));
}

function isakPayload(payload: Payload) {
  const data = {
    weightKg: optionalNumber(payload.weightKg, RANGES.weightKg),
    statureCm: optionalNumber(payload.statureCm, RANGES.heightCm),
    skinfolds: numberMap(payload.skinfolds, RANGES.skinfold, SKINFOLDS),
    girths: numberMap(payload.girths, RANGES.girth, GIRTHS),
    breadths: numberMap(payload.breadths, RANGES.breadth, BREADTHS),
  };
  const any = data.weightKg != null || [data.skinfolds, data.girths, data.breadths].some((group) => Object.values(group).some((v) => v != null));
  if (!any) throw new ValidationError("Cargá al menos el peso o una medida");
  return data;
}

function omronPayload(payload: Payload) {
  const data = {
    model: OMRON_MODELS.includes(String(payload.model)) ? String(payload.model) : OMRON_MODELS[0],
    weightKg: optionalNumber(payload.weightKg, RANGES.weightKg),
    bodyFatPercent: optionalNumber(payload.bodyFatPercent, RANGES.bodyFatPercent),
    visceralFat: optionalNumber(payload.visceralFat, RANGES.visceralFat),
    skeletalMusclePercent: optionalNumber(payload.skeletalMusclePercent, RANGES.skeletalMusclePercent),
    restingMetabolism: optionalNumber(payload.restingMetabolism, RANGES.restingMetabolism),
    bodyAge: optionalNumber(payload.bodyAge, RANGES.bodyAge),
    segmental: {},
  };
  if (Object.entries(data).every(([key, value]) => key === "model" || key === "segmental" || value == null)) {
    throw new ValidationError("Cargá al menos un valor de la balanza");
  }
  return data;
}

function planPayload(payload: Payload): MealPlanData {
  const macros = (payload.macros ?? {}) as Payload;
  const carbs = requiredNumber(macros.carbs, { min: 10, max: 75, label: "Carbohidratos %" });
  const protein = requiredNumber(macros.protein, { min: 10, max: 40, label: "Proteínas %" });
  const fat = requiredNumber(macros.fat, { min: 15, max: 50, label: "Grasas %" });
  if (Math.round(carbs + protein + fat) !== 100) throw new ValidationError("Los macronutrientes tienen que sumar 100%");
  const meals = Array.isArray(payload.meals) ? payload.meals.slice(0, 12) : [];
  if (!meals.length) throw new ValidationError("El plan necesita al menos una comida");
  return {
    title: text(payload.title, 120) ?? "Plan alimentario",
    activity: (String(payload.activity) in ACTIVITY ? payload.activity : "sedentario") as MealPlanData["activity"],
    goal: (String(payload.goal) in GOALS ? payload.goal : "mantener") as MealPlanData["goal"],
    kcalTarget: optionalNumber(payload.kcalTarget, RANGES.kcalTarget),
    macros: { carbs, protein, fat },
    meals: meals.map((meal, index) => {
      const row = (meal ?? {}) as Payload;
      return {
        id: text(row.id, 40) ?? String(index),
        name: text(row.name, 60) ?? `Comida ${index + 1}`,
        time: text(row.time, 10) ?? "",
        items: text(row.items, 2000) ?? "",
      };
    }),
    shopping: (Array.isArray(payload.shopping) ? payload.shopping : [])
      .map((item) => text(item, 200))
      .filter((item): item is string => Boolean(item))
      .slice(0, 60),
    recommendations: text(payload.recommendations, 4000) ?? "",
  };
}

export async function POST(request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await ownedPatient(user, id))) return notFound("Paciente no encontrado");

  try {
    const body = await readJson<{ kind?: string; payload?: Payload; measuredAt?: string }>(request);
    const payload = body.payload ?? {};
    const when = parseDate(body.measuredAt);
    if (when.getTime() > Date.now() + 86_400_000 && body.kind !== "note") {
      throw new ValidationError("La fecha no puede ser futura");
    }

    switch (body.kind) {
      case "anamnesis":
        await prisma.anamnesis.create({ data: { patientId: id, payload: JSON.stringify(anamnesisPayload(payload)) } });
        break;
      case "isak":
        await prisma.isakAssessment.create({ data: { patientId: id, measuredAt: when, payload: JSON.stringify(isakPayload(payload)) } });
        break;
      case "omron":
        await prisma.omronReading.create({ data: { patientId: id, measuredAt: when, payload: JSON.stringify(omronPayload(payload)) } });
        break;
      case "glucose": {
        const slot = String(payload.slot || "ayunas");
        await prisma.glucoseReading.create({
          data: {
            patientId: id,
            value: requiredNumber(payload.value, RANGES.glucose),
            slot: GLUCOSE_SLOTS.some(([value]) => value === slot) ? slot : "otro",
            measuredAt: when,
          },
        });
        break;
      }
      case "meal": {
        const name = text(payload.name, 200);
        if (!name) throw new ValidationError("Describí qué comió");
        const type = String(payload.type || "almuerzo");
        await prisma.mealEntry.create({
          data: {
            patientId: id,
            name,
            type: MEAL_TYPES.some(([value]) => value === type) ? type : "almuerzo",
            carbs: optionalNumber(payload.carbs, RANGES.carbs) ?? 0,
            protein: optionalNumber(payload.protein, RANGES.protein),
            calories: optionalNumber(payload.calories, RANGES.calories),
            createdAt: when,
          },
        });
        break;
      }
      case "lab": {
        const data = {
          glucose: optionalNumber(payload.glucose, RANGES.glucose),
          hba1c: optionalNumber(payload.hba1c, RANGES.hba1c),
          creatinine: optionalNumber(payload.creatinine, RANGES.creatinine),
          ldl: optionalNumber(payload.ldl, RANGES.ldl),
          triglycerides: optionalNumber(payload.triglycerides, RANGES.triglycerides),
        };
        if (Object.values(data).every((value) => value == null)) throw new ValidationError("Cargá al menos un valor de laboratorio");
        await prisma.labResult.create({ data: { patientId: id, measuredAt: when, ...data } });
        break;
      }
      case "plan":
        await prisma.mealPlan.create({ data: { patientId: id, payload: JSON.stringify(planPayload(payload)) } });
        break;
      case "note": {
        const summary = text(payload.summary, 5000);
        if (!summary) throw new ValidationError("Escribí la evolución de la consulta");
        await prisma.progressNote.create({
          data: {
            patientId: id,
            visitDate: when,
            summary,
            agreements: text(payload.agreements, 3000),
            nextVisit: text(payload.nextVisit, 120),
          },
        });
        break;
      }
      default:
        return badRequest("Tipo de registro no reconocido");
    }
    return NextResponse.json({ patient: await reload(id) });
  } catch (error) {
    return handleError(error);
  }
}

const DELETERS: Record<string, (patientId: string, recordId: string) => Promise<{ count: number }>> = {
  anamnesis: (patientId, id) => prisma.anamnesis.deleteMany({ where: { id, patientId } }),
  isak: (patientId, id) => prisma.isakAssessment.deleteMany({ where: { id, patientId } }),
  omron: (patientId, id) => prisma.omronReading.deleteMany({ where: { id, patientId } }),
  glucose: (patientId, id) => prisma.glucoseReading.deleteMany({ where: { id, patientId } }),
  meal: (patientId, id) => prisma.mealEntry.deleteMany({ where: { id, patientId } }),
  lab: (patientId, id) => prisma.labResult.deleteMany({ where: { id, patientId } }),
  plan: (patientId, id) => prisma.mealPlan.deleteMany({ where: { id, patientId } }),
  note: (patientId, id) => prisma.progressNote.deleteMany({ where: { id, patientId } }),
};

export async function DELETE(request: Request, context: Ctx) {
  const user = await getSessionNutritionist();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await ownedPatient(user, id))) return notFound("Paciente no encontrado");
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "";
  const recordId = url.searchParams.get("recordId") ?? "";
  const remove = DELETERS[kind];
  if (!remove || !recordId) return badRequest("Registro no reconocido");
  const result = await remove(id, recordId);
  if (!result.count) return notFound("El registro ya no existe");
  return NextResponse.json({ patient: await reload(id) });
}
