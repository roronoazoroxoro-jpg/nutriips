"use client";

import { useState } from "react";
import { Scale, Sparkles } from "lucide-react";
import { OMRON_MODELS, evaluateOmron } from "@/lib/omron";
import { fmtNumber, signed, toDateInput } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Input, Select } from "../ui";
import { HistoryCard, type Patient, type RemoveFn, type SaveFn } from "./shared";

const FIELDS = [
  { key: "weightKg", label: "Peso", unit: "kg", max: 350 },
  { key: "bodyFatPercent", label: "Grasa corporal", unit: "%", max: 70 },
  { key: "visceralFat", label: "Grasa visceral", unit: "nivel", max: 30 },
  { key: "skeletalMusclePercent", label: "Músculo esquelético", unit: "%", max: 70 },
  { key: "restingMetabolism", label: "Metabolismo basal", unit: "kcal", max: 5000 },
  { key: "bodyAge", label: "Edad corporal", unit: "años", max: 110 },
] as const;

type Key = (typeof FIELDS)[number]["key"];
const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<Key, string>;
const toTone = (tone?: string) => (tone === "high" ? "high" : tone === "mid" ? "mid" : "good");

export function OmronTab({ patient, save, remove }: { patient: Patient; save: SaveFn; remove: RemoveFn }) {
  const [date, setDate] = useState(toDateInput());
  const [model, setModel] = useState(patient.omron[0]?.input.model || OMRON_MODELS[0]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const numbers = Object.fromEntries(FIELDS.map((f) => [f.key, form[f.key] ? Number(form[f.key]) : null])) as Record<Key, number | null>;
  const preview = evaluateOmron({ model, ...numbers, segmental: {} }, { sex: patient.sex, age: patient.age, statureCm: patient.heightCm });
  const hasInput = Object.values(numbers).some((v) => v != null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const ok = await save("omron", { model, ...Object.fromEntries(FIELDS.map((f) => [f.key, form[f.key] === "" ? null : form[f.key]])) }, date);
    setLoading(false);
    if (ok) setForm(EMPTY);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card className="self-start">
        <CardHeader icon={<Scale className="h-4 w-4" />} title="Bioimpedancia Omron" subtitle="Pasá los valores que muestra la pantalla de la balanza" />
        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Fecha" type="date" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} />
            <Select label="Modelo" value={model} onChange={(e) => setModel(e.target.value)}>
              {OMRON_MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {FIELDS.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                type="number"
                step={field.key === "restingMetabolism" || field.key === "bodyAge" || field.key === "visceralFat" ? "1" : "0.1"}
                min={0}
                max={field.max}
                suffix={field.unit}
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={loading} disabled={!hasInput}>
              Guardar lectura
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 bg-ink-950 px-5 py-3 text-white">
            <Sparkles className="h-4 w-4 text-leaf-300" />
            <p className="text-sm font-semibold">Interpretación</p>
          </div>
          {hasInput ? (
            <div className="space-y-3 p-5 text-sm">
              {preview.bodyFat && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-600">Grasa corporal</span>
                  <Badge tone={toTone(preview.bodyFat.tone)}>{preview.bodyFat.label}</Badge>
                </div>
              )}
              {preview.visceral && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-600">Grasa visceral</span>
                  <Badge tone={toTone(preview.visceral.tone)}>{preview.visceral.label}</Badge>
                </div>
              )}
              {preview.equationKcal != null && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-600">Mifflin-St Jeor</span>
                  <span className="font-semibold">
                    {fmtNumber(preview.equationKcal, 0)} kcal
                    {preview.metabolismDelta != null && <span className="ml-1 text-xs font-normal text-ink-500">({signed(preview.metabolismDelta, 0)} vs. balanza)</span>}
                  </span>
                </div>
              )}
              <p className="rounded-xl bg-sand-100 px-3 py-2.5 text-xs leading-relaxed text-ink-700">{preview.note}</p>
            </div>
          ) : (
            <p className="p-5 text-sm text-ink-600">Cargá los valores de la balanza y vas a ver la clasificación y la comparación con la ecuación de Mifflin-St Jeor.</p>
          )}
        </Card>

        <HistoryCard
          kindLabel="lectura"
          empty="Sin lecturas de bioimpedancia"
          onDelete={(id) => remove("omron", id)}
          items={patient.omron.map((row) => ({
            id: row.id,
            date: row.measuredAt,
            title: [row.input.weightKg != null ? `${fmtNumber(row.input.weightKg)} kg` : null, row.input.bodyFatPercent != null ? `${fmtNumber(row.input.bodyFatPercent)}% grasa` : null].filter(Boolean).join(" · ") || "Lectura",
            detail: [
              row.input.visceralFat != null ? `Visceral ${row.input.visceralFat}` : null,
              row.input.skeletalMusclePercent != null ? `Músculo ${fmtNumber(row.input.skeletalMusclePercent)}%` : null,
              row.input.model,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
      </div>
    </div>
  );
}
