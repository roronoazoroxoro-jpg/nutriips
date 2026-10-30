export type MealLike = {
  name: string;
  type: string;
  carbs: number;
  protein?: number | null;
  fat?: number | null;
  sugar?: number | null;
  calories?: number | null;
};

export function nutritionSnapshot(meals: MealLike[]) {
  const total = meals.length;
  const carbs = meals.reduce((acc, meal) => acc + (meal.carbs || 0), 0);
  const sugar = meals.reduce((acc, meal) => acc + (meal.sugar || 0), 0);
  const protein = meals.reduce((acc, meal) => acc + (meal.protein || 0), 0);
  const calories = meals.reduce((acc, meal) => acc + (meal.calories || 0), 0);
  const avgCarbs = total ? Math.round(carbs / total) : null;
  let carbTone: "low" | "mid" | "high" = "mid";
  if (avgCarbs == null) carbTone = "mid";
  else if (avgCarbs <= 60) carbTone = "low";
  else if (avgCarbs > 75) carbTone = "high";
  return {
    total,
    carbs: Math.round(carbs),
    sugar: Math.round(sugar),
    protein: Math.round(protein),
    calories: Math.round(calories),
    avgCarbs,
    carbTone,
  };
}

export const GLUCOSE_SLOTS = [
  ["ayunas", "Ayunas"],
  ["preprandial", "Antes de comer"],
  ["postprandial", "Después de comer"],
  ["otro", "Otro momento"],
] as const;

export function glucoseSlotLabel(slot: string) {
  return GLUCOSE_SLOTS.find(([value]) => value === slot)?.[1] ?? slot;
}

export const MEAL_TYPES = [
  ["desayuno", "Desayuno"],
  ["almuerzo", "Almuerzo"],
  ["merienda", "Merienda"],
  ["cena", "Cena"],
  ["colacion", "Colación"],
] as const;
