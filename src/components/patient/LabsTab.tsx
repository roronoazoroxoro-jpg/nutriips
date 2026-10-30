"use client";

import { useState } from "react";
import { Droplet, FlaskConical, Utensils } from "lucide-react";
import { GLUCOSE_SLOTS, MEAL_TYPES, glucoseSlotLabel } from "@/lib/nutrition";
import { fmtNumber, toDateInput } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Input, Select } from "../ui";
import { HistoryCard, type Patient, type RemoveFn, type SaveFn } from "./shared";

function glucoseTone(value: number, slot: string): "high" | "mid" | "good" {
  if (value < 70) return "high";
  if (slot === "ayunas" || slot === "preprandial") return value >= 126 ? "high" : value >= 100 ? "mid" : "good";
  if (slot === "postprandial") return value >= 180 ? "high" : value >= 140 ? "mid" : "good";
  return value >= 200 ? "high" : value >= 140 ? "mid" : "good";
}

const LAB_FIELDS = [
  { key: "glucose", label: "Glucemia", unit: "mg/dL", step: "1" },
  { key: "hba1c", label: "HbA1c", unit: "%", step: "0.1" },
  { key: "ldl", label: "LDL", unit: "mg/dL", step: "1" },
  { key: "triglycerides", label: "Triglicéridos", unit: "mg/dL", step: "1" },
  { key: "creatinine", label: "Creatinina", unit: "mg/dL", step: "0.01" },
] as const;

export function LabsTab({ patient, save, remove }: { patient: Patient; save: SaveFn; remove: RemoveFn }) {
  const [glucose, setGlucose] = useState({ value: "", slot: "ayunas", date: toDateInput() });
  const [lab, setLab] = useState<Record<string, string>>({ date: toDateInput() });
  const [meal, setMeal] = useState({ name: "", type: "almuerzo", carbs: "", protein: "", calories: "", date: toDateInput() });
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6">
        <Card>
          <CardHeader icon={<Droplet className="h-4 w-4" />} title="Glucemia capilar" subtitle="Controles del paciente o del consultorio" />
          <form
            className="space-y-3 p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy("glucose");
              const ok = await save("glucose", { value: glucose.value, slot: glucose.slot }, glucose.date);
              setBusy(null);
              if (ok) setGlucose({ ...glucose, value: "" });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Input label="Valor" type="number" min={20} max={700} suffix="mg/dL" value={glucose.value} onChange={(e) => setGlucose({ ...glucose, value: e.target.value })} required />
              <Input label="Fecha" type="date" max={toDateInput()} value={glucose.date} onChange={(e) => setGlucose({ ...glucose, date: e.target.value })} />
            </div>
            <Select label="Momento" value={glucose.slot} onChange={(e) => setGlucose({ ...glucose, slot: e.target.value })}>
              {GLUCOSE_SLOTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button type="submit" className="w-full" loading={busy === "glucose"}>
              Registrar glucemia
            </Button>
          </form>
        </Card>
        <HistoryCard
          kindLabel="glucemia"
          empty="Sin glucemias registradas"
          onDelete={(id) => remove("glucose", id)}
          items={patient.glucose.map((row) => ({
            id: row.id,
            date: row.measuredAt,
            title: (
              <span className="inline-flex items-center gap-2">
                {fmtNumber(row.value, 0)} mg/dL <Badge tone={glucoseTone(row.value, row.slot)}>{glucoseSlotLabel(row.slot)}</Badge>
              </span>
            ),
          }))}
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader icon={<FlaskConical className="h-4 w-4" />} title="Laboratorio" subtitle="Cargá solo los valores que tenga el análisis" />
          <form
            className="space-y-3 p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy("lab");
              const { date, ...values } = lab;
              const ok = await save("lab", values, date);
              setBusy(null);
              if (ok) setLab({ date: lab.date });
            }}
          >
            <Input label="Fecha del análisis" type="date" max={toDateInput()} value={lab.date} onChange={(e) => setLab({ ...lab, date: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              {LAB_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  type="number"
                  step={field.step}
                  min={0}
                  suffix={field.unit}
                  value={lab[field.key] ?? ""}
                  onChange={(e) => setLab({ ...lab, [field.key]: e.target.value })}
                />
              ))}
            </div>
            <Button type="submit" className="w-full" loading={busy === "lab"}>
              Guardar laboratorio
            </Button>
          </form>
        </Card>
        <HistoryCard
          kindLabel="laboratorio"
          empty="Sin análisis cargados"
          onDelete={(id) => remove("lab", id)}
          items={patient.labs.map((row) => ({
            id: row.id,
            date: row.measuredAt,
            title: row.hba1c != null ? `HbA1c ${fmtNumber(row.hba1c)}%` : row.glucose != null ? `Glucemia ${fmtNumber(row.glucose, 0)} mg/dL` : "Análisis",
            detail: [
              row.hba1c != null && row.glucose != null ? `Glucemia ${fmtNumber(row.glucose, 0)}` : null,
              row.ldl != null ? `LDL ${fmtNumber(row.ldl, 0)}` : null,
              row.triglycerides != null ? `TG ${fmtNumber(row.triglycerides, 0)}` : null,
              row.creatinine != null ? `Creat. ${fmtNumber(row.creatinine, 2)}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader
            icon={<Utensils className="h-4 w-4" />}
            title="Registro de comidas"
            subtitle={
              patient.nutrition.total
                ? `${patient.nutrition.total} ${patient.nutrition.total === 1 ? "registro" : "registros"} · promedio ${patient.nutrition.avgCarbs ?? "—"} g de carbohidratos por comida`
                : "Lo que el paciente comió, para contar carbohidratos"
            }
          />
          <form
            className="space-y-3 p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy("meal");
              const { date, ...values } = meal;
              const ok = await save("meal", values, date);
              setBusy(null);
              if (ok) setMeal({ ...meal, name: "", carbs: "", protein: "", calories: "" });
            }}
          >
            <Input label="Qué comió" value={meal.name} onChange={(e) => setMeal({ ...meal, name: e.target.value })} required placeholder="Ej.: milanesa con ensalada" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Comida" value={meal.type} onChange={(e) => setMeal({ ...meal, type: e.target.value })}>
                {MEAL_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input label="Fecha" type="date" max={toDateInput()} value={meal.date} onChange={(e) => setMeal({ ...meal, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="HC" type="number" min={0} suffix="g" value={meal.carbs} onChange={(e) => setMeal({ ...meal, carbs: e.target.value })} />
              <Input label="Prot." type="number" min={0} suffix="g" value={meal.protein} onChange={(e) => setMeal({ ...meal, protein: e.target.value })} />
              <Input label="Energía" type="number" min={0} suffix="kcal" value={meal.calories} onChange={(e) => setMeal({ ...meal, calories: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" loading={busy === "meal"}>
              Registrar comida
            </Button>
          </form>
        </Card>
        <HistoryCard
          kindLabel="comida"
          empty="Sin comidas registradas"
          onDelete={(id) => remove("meal", id)}
          items={patient.meals.map((row) => ({
            id: row.id,
            date: row.createdAt,
            title: row.name,
            detail: [MEAL_TYPES.find(([v]) => v === row.type)?.[1] ?? row.type, `${fmtNumber(row.carbs, 0)} g HC`, row.protein != null ? `${fmtNumber(row.protein, 0)} g prot.` : null, row.calories != null ? `${fmtNumber(row.calories, 0)} kcal` : null]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
      </div>
    </div>
  );
}
