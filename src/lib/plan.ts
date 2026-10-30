import type { Sex } from "./isak";
import { mifflinStJeor } from "./omron";

export type PlanMeal = { id: string; name: string; time: string; items: string };

export type MealPlanData = {
  title: string;
  activity: ActivityKey;
  goal: GoalKey;
  kcalTarget: number | null;
  macros: { carbs: number; protein: number; fat: number };
  meals: PlanMeal[];
  shopping: string[];
  recommendations: string;
};

export const ACTIVITY = {
  sedentario: { label: "Sedentario", factor: 1.2 },
  ligera: { label: "Actividad ligera (1–3 días)", factor: 1.375 },
  moderada: { label: "Actividad moderada (3–5 días)", factor: 1.55 },
  intensa: { label: "Actividad intensa (6–7 días)", factor: 1.725 },
} as const;
export type ActivityKey = keyof typeof ACTIVITY;

export const GOALS = {
  bajar: { label: "Descenso de peso", adjust: -0.15 },
  mantener: { label: "Mantenimiento", adjust: 0 },
  ganar: { label: "Ganancia de masa muscular", adjust: 0.1 },
} as const;
export type GoalKey = keyof typeof GOALS;

export function goalFromAnamnesis(goal?: string): GoalKey {
  if (!goal) return "mantener";
  if (/bajar/i.test(goal)) return "bajar";
  if (/ganar|masa|rendimiento/i.test(goal)) return "ganar";
  return "mantener";
}

export function activityFromAnamnesis(activity?: string): ActivityKey {
  if (!activity?.trim()) return "sedentario";
  const perWeek = Number(activity.match(/(\d+)\s*(veces|días|dias|x)/i)?.[1] ?? 0);
  if (perWeek >= 6) return "intensa";
  if (perWeek >= 3) return "moderada";
  if (/no\b|nada|ninguna|sedentari/i.test(activity)) return "sedentario";
  return "ligera";
}

export function energyTarget(input: {
  sex: Sex;
  age: number | null;
  weightKg: number | null;
  statureCm: number | null;
  activity: ActivityKey;
  goal: GoalKey;
}) {
  const bmr = mifflinStJeor(input);
  if (bmr == null) return null;
  const tdee = bmr * ACTIVITY[input.activity].factor;
  const raw = tdee * (1 + GOALS[input.goal].adjust);
  const capped = input.goal === "bajar" ? Math.max(raw, tdee - 500) : raw;
  const floor = input.sex === "masculino" ? 1500 : 1200;
  return { bmr, tdee: Math.round(tdee), target: Math.max(floor, Math.round(capped / 50) * 50) };
}

export function macroGrams(kcal: number | null, macros: MealPlanData["macros"]) {
  if (!kcal) return null;
  return {
    carbs: Math.round((kcal * macros.carbs) / 100 / 4),
    protein: Math.round((kcal * macros.protein) / 100 / 4),
    fat: Math.round((kcal * macros.fat) / 100 / 9),
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function suggestedPlan(input: {
  sex: Sex;
  age: number | null;
  weightKg: number | null;
  statureCm: number | null;
  diabetes: boolean;
  highVisceral: boolean;
  highWaist: boolean;
  anamnesis?: Record<string, string>;
}): MealPlanData {
  const a = input.anamnesis ?? {};
  const goal = goalFromAnamnesis(a.goal);
  const activity = activityFromAnamnesis(a.activity);
  const energy = energyTarget({ ...input, activity, goal });
  const lighterCarbs = input.diabetes || input.highVisceral || goal === "bajar";
  const carb = lighterCarbs ? "1 porción medida (½ taza cocida) de arroz, papa o fideos" : "arroz integral, papa o legumbres";
  const macros = input.diabetes
    ? { carbs: 45, protein: 20, fat: 35 }
    : goal === "ganar"
      ? { carbs: 45, protein: 25, fat: 30 }
      : { carbs: 50, protein: 20, fat: 30 };

  const allergies = a.allergies?.trim();
  const recommendations = [
    "Tomá agua durante el día: 8 vasos como referencia, más si hacés actividad.",
    "Armá el plato: mitad verduras, un cuarto proteína y un cuarto carbohidrato.",
    input.diabetes ? "Controlá la glucosa como indicó tu médico y anotá los valores para la próxima consulta." : "Preferí frutas enteras en lugar de jugos.",
    "Evitá las bebidas azucaradas y los ultraprocesados como rutina.",
    allergies ? `Tené en cuenta: ${allergies}.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: "Plan alimentario",
    activity,
    goal,
    kcalTarget: energy?.target ?? null,
    macros,
    meals: [
      { id: uid(), name: "Desayuno", time: a.breakfastTime || "07:30", items: "Infusión sin azúcar\nHuevo o yogur natural\nFruta entera\nAvena o pan integral" },
      { id: uid(), name: "Almuerzo", time: a.lunchTime || "12:30", items: `Medio plato de verduras\nProteína magra (pollo, pescado, carne o legumbres)\n${carb}` },
      { id: uid(), name: "Merienda", time: a.snackTime || "17:00", items: "Fruta\nYogur natural o queso fresco" },
      {
        id: uid(),
        name: "Cena",
        time: a.dinnerTime || "21:00",
        items: input.highWaist ? "Verduras cocidas o crudas\nHuevo, pescado o pollo" : "Verduras\nProteína\nPorción chica de carbohidrato si tiene hambre",
      },
      { id: uid(), name: "Colación", time: "", items: "Solo si pasan muchas horas entre comidas: fruta o yogur sin azúcar" },
    ],
    shopping: [
      "Verduras de hoja, zapallo, zanahoria, tomate y brócoli",
      "Frutas enteras de estación",
      "Huevos, pollo, pescado o carne magra",
      "Yogur natural y quesos frescos",
      "Avena, legumbres y pan integral",
      input.diabetes ? "Bebidas sin azúcar; edulcorante solo si el médico lo indica" : "Agua e infusiones sin azúcar",
      "Aceite de oliva en poca cantidad, palta o semillas",
    ],
    recommendations,
  };
}

export function newMeal(): PlanMeal {
  return { id: uid(), name: "Nueva comida", time: "", items: "" };
}
