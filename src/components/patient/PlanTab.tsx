"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Calculator, Plus, Printer, RotateCcw, Salad, Sparkles, Trash2, Wand2 } from "lucide-react";
import { ACTIVITY, GOALS, energyTarget, macroGrams, newMeal, suggestedPlan, type MealPlanData } from "@/lib/plan";
import { fmtDate, fmtNumber } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Input, Select, Textarea, cx } from "../ui";
import { HistoryCard, type Patient, type RemoveFn, type SaveFn } from "./shared";

function buildSuggestion(patient: Patient) {
  const lab = patient.labs[0];
  const omron = patient.omron[0];
  const waist = patient.isak[0]?.result.waistRisk;
  const diabetes = patient.diabetesType !== "ninguna" || (lab?.hba1c ?? 0) >= 6.5;
  const highVisceral = (omron?.input.visceralFat ?? 0) >= 10;
  const highWaist = Boolean(waist && waist.tone !== "low");
  const plan = suggestedPlan({
    sex: patient.sex,
    age: patient.age,
    weightKg: patient.trends.weight.at(-1)?.value ?? null,
    statureCm: patient.heightCm,
    diabetes,
    highVisceral,
    highWaist,
    anamnesis: patient.anamneses[0]?.payload,
  });
  const reasons = [
    diabetes && "diabetes / HbA1c elevada: hidratos moderados",
    highVisceral && "grasa visceral alta",
    highWaist && "cintura con riesgo: cena liviana",
    patient.anamneses[0]?.payload.goal && `objetivo: ${patient.anamneses[0].payload.goal.toLowerCase()}`,
    patient.anamneses[0]?.payload.allergies && "alergias registradas",
  ].filter(Boolean) as string[];
  return { plan, reasons };
}

export function PlanTab({ patient, save, remove }: { patient: Patient; save: SaveFn; remove: RemoveFn }) {
  const saved = patient.plans[0];
  const suggestion = useMemo(() => buildSuggestion(patient), [patient]);
  const [plan, setPlan] = useState<MealPlanData>(() => saved?.plan ?? suggestion.plan);
  const [shoppingText, setShoppingText] = useState(() => (saved?.plan ?? suggestion.plan).shopping.join("\n"));
  const [dirty, setDirty] = useState(!saved);
  const [loading, setLoading] = useState(false);

  const weight = patient.trends.weight.at(-1)?.value ?? null;
  const energy = energyTarget({ sex: patient.sex, age: patient.age, weightKg: weight, statureCm: patient.heightCm, activity: plan.activity, goal: plan.goal });
  const grams = macroGrams(plan.kcalTarget, plan.macros);
  const macroSum = plan.macros.carbs + plan.macros.protein + plan.macros.fat;
  const proteinPerKg = grams && weight ? Math.round((grams.protein / weight) * 10) / 10 : null;

  const update = (patch: Partial<MealPlanData>) => {
    setPlan((p) => ({ ...p, ...patch }));
    setDirty(true);
  };
  const updateMeal = (index: number, patch: Partial<MealPlanData["meals"][number]>) =>
    update({ meals: plan.meals.map((meal, i) => (i === index ? { ...meal, ...patch } : meal)) });
  const moveMeal = (index: number, dir: -1 | 1) => {
    const meals = [...plan.meals];
    const target = index + dir;
    if (target < 0 || target >= meals.length) return;
    [meals[index], meals[target]] = [meals[target], meals[index]];
    update({ meals });
  };

  function load(next: MealPlanData) {
    setPlan(next);
    setShoppingText(next.shopping.join("\n"));
    setDirty(true);
  }

  async function submit() {
    setLoading(true);
    const ok = await save("plan", { ...plan, shopping: shoppingText.split("\n").map((s) => s.trim()).filter(Boolean) });
    setLoading(false);
    if (ok) setDirty(false);
  }

  return (
    <div className="space-y-6">
      {!saved && (
        <Card className="flex items-start gap-3 border-leaf-200 bg-gradient-to-br from-leaf-50 to-white p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-ink-950">Propuesta armada automáticamente</p>
            <p className="mt-0.5 text-ink-700">
              Se tuvo en cuenta {suggestion.reasons.length ? suggestion.reasons.join(", ") : "el perfil del paciente"}. Revisala, ajustala y guardala para poder imprimirla.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader icon={<Calculator className="h-4 w-4" />} title="Meta energética y macronutrientes" />
            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Objetivo" value={plan.goal} onChange={(e) => update({ goal: e.target.value as MealPlanData["goal"] })}>
                  {Object.entries(GOALS).map(([key, goal]) => (
                    <option key={key} value={key}>
                      {goal.label}
                    </option>
                  ))}
                </Select>
                <Select label="Actividad física" value={plan.activity} onChange={(e) => update({ activity: e.target.value as MealPlanData["activity"] })}>
                  {Object.entries(ACTIVITY).map(([key, activity]) => (
                    <option key={key} value={key}>
                      {activity.label}
                    </option>
                  ))}
                </Select>
                <div>
                  <label className="label" htmlFor="kcal">
                    Meta calórica
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id="kcal"
                        className="input pr-12"
                        type="number"
                        min={800}
                        max={6000}
                        step={50}
                        value={plan.kcalTarget ?? ""}
                        onChange={(e) => update({ kcalTarget: e.target.value ? Number(e.target.value) : null })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-500">kcal</span>
                    </div>
                    {energy && energy.target !== plan.kcalTarget && (
                      <Button variant="soft" className="px-3" title={`Usar ${energy.target} kcal calculadas`} onClick={() => update({ kcalTarget: energy.target })}>
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink-600">
                {energy
                  ? `Calculado: basal ${fmtNumber(energy.bmr, 0)} kcal × ${ACTIVITY[plan.activity].factor} = ${fmtNumber(energy.tdee, 0)} kcal de gasto; con el objetivo, ${fmtNumber(energy.target, 0)} kcal.`
                  : "Para calcular la meta hacen falta fecha de nacimiento, talla y un peso registrado. Podés escribirla a mano."}
              </p>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-ink-800">Distribución</p>
                  <Badge tone={macroSum === 100 ? "good" : "high"}>Suma {macroSum}%</Badge>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="bg-amber-400 transition-all" style={{ width: `${plan.macros.carbs}%` }} />
                  <div className="bg-leaf-500 transition-all" style={{ width: `${plan.macros.protein}%` }} />
                  <div className="bg-sky-500 transition-all" style={{ width: `${plan.macros.fat}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {(
                    [
                      ["carbs", "Carbohidratos", "bg-amber-400"],
                      ["protein", "Proteínas", "bg-leaf-500"],
                      ["fat", "Grasas", "bg-sky-500"],
                    ] as const
                  ).map(([key, label, dot]) => (
                    <div key={key}>
                      <label className="label flex items-center gap-1.5" htmlFor={`macro-${key}`}>
                        <span className={cx("h-2 w-2 rounded-full", dot)} />
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          id={`macro-${key}`}
                          className="input pr-8"
                          type="number"
                          min={0}
                          max={100}
                          value={plan.macros[key]}
                          onChange={(e) => update({ macros: { ...plan.macros, [key]: Number(e.target.value) || 0 } })}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-500">%</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-600">{grams ? `${grams[key]} g/día` : "—"}</p>
                    </div>
                  ))}
                </div>
                {proteinPerKg != null && <p className="mt-2 text-xs text-ink-600">Proteínas: {fmtNumber(proteinPerKg)} g por kg de peso actual.</p>}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Salad className="h-4 w-4" />}
              title="Comidas del día"
              subtitle="Un alimento o indicación por renglón"
              action={
                <Button size="sm" variant="soft" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => update({ meals: [...plan.meals, newMeal()] })}>
                  Agregar comida
                </Button>
              }
            />
            <ul className="divide-y divide-ink-900/[0.06]">
              {plan.meals.map((meal, index) => (
                <li key={meal.id} className="grid gap-3 p-5 md:grid-cols-[180px_1fr_auto]">
                  <div className="space-y-2">
                    <input className="input font-semibold" value={meal.name} onChange={(e) => updateMeal(index, { name: e.target.value })} aria-label="Nombre de la comida" />
                    <input className="input" type="time" value={meal.time} onChange={(e) => updateMeal(index, { time: e.target.value })} aria-label="Horario" />
                  </div>
                  <textarea className="input min-h-[96px]" value={meal.items} onChange={(e) => updateMeal(index, { items: e.target.value })} aria-label={`Alimentos de ${meal.name}`} />
                  <div className="flex gap-1 md:flex-col">
                    <Button size="sm" variant="ghost" className="px-2" onClick={() => moveMeal(index, -1)} disabled={index === 0} aria-label="Subir">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="px-2" onClick={() => moveMeal(index, 1)} disabled={index === plan.meals.length - 1} aria-label="Bajar">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2 text-red-600 hover:bg-red-50"
                      onClick={() => update({ meals: plan.meals.filter((_, i) => i !== index) })}
                      disabled={plan.meals.length === 1}
                      aria-label="Quitar comida"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <Textarea
                label="Lista de compras"
                hint="Un ítem por renglón"
                className="[&_textarea]:min-h-[200px]"
                value={shoppingText}
                onChange={(e) => {
                  setShoppingText(e.target.value);
                  setDirty(true);
                }}
              />
            </Card>
            <Card className="p-5">
              <Textarea
                label="Recomendaciones"
                hint="Aparecen en la hoja del paciente"
                className="[&_textarea]:min-h-[200px]"
                value={plan.recommendations}
                onChange={(e) => update({ recommendations: e.target.value })}
              />
            </Card>
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="sticky top-6 p-5">
            <Input label="Título del plan" value={plan.title} onChange={(e) => update({ title: e.target.value })} />
            <div className="mt-4 space-y-2">
              <Button className="w-full" loading={loading} disabled={!dirty || macroSum !== 100} onClick={submit}>
                {saved ? "Guardar nueva versión" : "Guardar plan"}
              </Button>
              {macroSum !== 100 && <p className="text-xs text-red-600">Los macronutrientes tienen que sumar 100%.</p>}
              <Link
                href={`/imprimir/${patient.id}/plan`}
                target="_blank"
                className={cx(
                  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-ink-900/10 bg-white text-sm font-semibold text-ink-900 shadow-sm hover:bg-sand-50",
                  !saved && "pointer-events-none opacity-50"
                )}
                aria-disabled={!saved}
              >
                <Printer className="h-4 w-4" />
                Imprimir para el paciente
              </Link>
              {dirty && saved && <p className="text-xs text-amber-700">Hay cambios sin guardar. La impresión usa la última versión guardada.</p>}
              <Button variant="ghost" size="sm" className="w-full" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => load(buildSuggestion(patient).plan)}>
                Regenerar propuesta automática
              </Button>
            </div>
          </Card>

          <HistoryCard
            title="Versiones del plan"
            kindLabel="versión del plan"
            empty="Todavía no se guardó ningún plan"
            onDelete={(id) => remove("plan", id)}
            items={patient.plans.map((row, index) => ({
              id: row.id,
              date: row.createdAt,
              title: `${index === 0 ? "Vigente" : row.plan?.title ?? "Plan"}${row.plan?.kcalTarget ? ` · ${fmtNumber(row.plan.kcalTarget, 0)} kcal` : ""}`,
              detail: row.plan ? `${GOALS[row.plan.goal]?.label ?? ""} · ${row.plan.meals.length} comidas` : undefined,
              extra:
                index > 0 && row.plan ? (
                  <button onClick={() => load(row.plan!)} className="mt-1 text-xs font-medium text-leaf-700 hover:underline">
                    Cargar esta versión ({fmtDate(row.createdAt)})
                  </button>
                ) : undefined,
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
