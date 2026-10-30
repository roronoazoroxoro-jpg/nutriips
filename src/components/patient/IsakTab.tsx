"use client";

import { useMemo, useState } from "react";
import { Copy, Ruler, Sparkles } from "lucide-react";
import { BREADTHS, GIRTHS, SKINFOLDS, evaluateIsak } from "@/lib/isak";
import { fmtNumber, toDateInput } from "@/lib/format";
import { Button, Card, CardHeader, Input } from "../ui";
import { HistoryCard, SectionTitle, mapNumbers, type Patient, type RemoveFn, type SaveFn } from "./shared";

type Group = Record<string, string>;
const toGroup = (source: Record<string, number | null> | undefined) =>
  Object.fromEntries(Object.entries(source ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
const numeric = (group: Group) =>
  Object.fromEntries(Object.entries(group).map(([k, v]) => [k, v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v)]));

export function IsakTab({ patient, save, remove }: { patient: Patient; save: SaveFn; remove: RemoveFn }) {
  const [date, setDate] = useState(toDateInput());
  const [weightKg, setWeightKg] = useState("");
  const [statureCm, setStatureCm] = useState(patient.heightCm ? String(patient.heightCm) : "");
  const [skinfolds, setSkinfolds] = useState<Group>({});
  const [girths, setGirths] = useState<Group>({});
  const [breadths, setBreadths] = useState<Group>({});
  const [loading, setLoading] = useState(false);
  const last = patient.isak[0];

  const preview = useMemo(
    () =>
      evaluateIsak({
        age: patient.age,
        sex: patient.sex,
        weightKg: weightKg ? Number(weightKg) : null,
        statureCm: statureCm ? Number(statureCm) : null,
        skinfolds: numeric(skinfolds),
        girths: numeric(girths),
        breadths: numeric(breadths),
      }),
    [patient.age, patient.sex, weightKg, statureCm, skinfolds, girths, breadths]
  );

  function copyLast() {
    if (!last) return;
    setWeightKg(last.input.weightKg != null ? String(last.input.weightKg) : "");
    if (last.input.statureCm) setStatureCm(String(last.input.statureCm));
    setSkinfolds(toGroup(last.input.skinfolds));
    setGirths(toGroup(last.input.girths));
    setBreadths(toGroup(last.input.breadths));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const ok = await save(
      "isak",
      {
        weightKg: weightKg ? Number(weightKg) : null,
        statureCm: statureCm ? Number(statureCm) : null,
        skinfolds: mapNumbers(skinfolds),
        girths: mapNumbers(girths),
        breadths: mapNumbers(breadths),
      },
      date
    );
    setLoading(false);
    if (ok) {
      setWeightKg("");
      setSkinfolds({});
      setGirths({});
      setBreadths({});
    }
  }

  const missingForFat = !patient.age ? "Falta la fecha de nacimiento en la ficha" : "Cargá bíceps, tríceps, subescapular y cresta ilíaca";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card className="self-start">
        <CardHeader
          icon={<Ruler className="h-4 w-4" />}
          title="Perfil antropométrico ISAK"
          subtitle="Pliegues en mm · perímetros y diámetros en cm · lado derecho"
          action={
            last && (
              <Button size="sm" variant="ghost" icon={<Copy className="h-3.5 w-3.5" />} onClick={copyLast}>
                Copiar última
              </Button>
            )
          }
        />
        <form onSubmit={submit} className="space-y-6 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Fecha" type="date" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} />
            <Input label="Peso" type="number" step="0.1" min={2} max={350} suffix="kg" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            <Input label="Talla" type="number" step="0.1" min={40} max={230} suffix="cm" value={statureCm} onChange={(e) => setStatureCm(e.target.value)} />
          </div>
          <MeasureGroup title="Pliegues cutáneos" unit="mm" fields={SKINFOLDS} values={skinfolds} onChange={setSkinfolds} max={80} />
          <MeasureGroup title="Perímetros" unit="cm" fields={GIRTHS} values={girths} onChange={setGirths} max={250} />
          <MeasureGroup title="Diámetros óseos" unit="cm" fields={BREADTHS} values={breadths} onChange={setBreadths} max={20} />
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              Guardar medición
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 bg-ink-950 px-5 py-3 text-white">
            <Sparkles className="h-4 w-4 text-leaf-300" />
            <p className="text-sm font-semibold">Resultados en vivo</p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-y divide-ink-900/[0.06] text-sm">
            <Result label="IMC" value={fmtNumber(preview.bmi)} note={preview.bmiLabel?.replace(" (OMS)", "") ?? "Peso y talla"} />
            <Result label="% grasa (Durnin-Siri)" value={preview.bodyFat ? `${fmtNumber(preview.bodyFat.fatPercent)}%` : "—"} note={preview.bodyFat ? `Densidad ${preview.bodyFat.density}` : missingForFat} />
            <Result label="Σ 6 pliegues" value={preview.sum6 != null ? `${fmtNumber(preview.sum6)} mm` : "—"} />
            <Result label="Σ 8 pliegues" value={preview.sum8 != null ? `${fmtNumber(preview.sum8)} mm` : "—"} />
            <Result label="Área muscular brazo" value={preview.armMuscle ? `${fmtNumber(preview.armMuscle.cm2)} cm²` : "—"} note={preview.armMuscle ? "Heymsfield 1982" : "Brazo relajado + tríceps"} />
            <Result label="Cintura / cadera" value={fmtNumber(preview.waistHipRatio, 2)} note={preview.waistRisk?.label ?? "Cintura y cadera"} />
          </dl>
        </Card>

        <HistoryCard
          kindLabel="medición"
          empty="Sin antropometrías todavía"
          onDelete={(id) => remove("isak", id)}
          items={patient.isak.map((row) => ({
            id: row.id,
            date: row.measuredAt,
            title: [row.input.weightKg != null ? `${fmtNumber(row.input.weightKg)} kg` : null, row.result.bmi != null ? `IMC ${fmtNumber(row.result.bmi)}` : null].filter(Boolean).join(" · ") || "Medición",
            detail: [
              row.result.bodyFat ? `${fmtNumber(row.result.bodyFat.fatPercent)}% grasa` : null,
              row.result.sum6 != null ? `Σ6 ${fmtNumber(row.result.sum6)} mm` : null,
              row.input.girths?.waist ? `Cintura ${fmtNumber(row.input.girths.waist)} cm` : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
      </div>
    </div>
  );
}

function MeasureGroup({
  title,
  unit,
  fields,
  values,
  onChange,
  max,
}: {
  title: string;
  unit: string;
  fields: readonly (readonly [string, string])[];
  values: Group;
  onChange: (values: Group) => void;
  max: number;
}) {
  const filled = fields.filter(([key]) => values[key]?.trim()).length;
  return (
    <div>
      <SectionTitle hint={`${filled} de ${fields.length} cargados`}>{title}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {fields.map(([key, label]) => (
          <Input
            key={key}
            label={label}
            type="number"
            step="0.1"
            min={0}
            max={max}
            suffix={unit}
            value={values[key] ?? ""}
            onChange={(e) => onChange({ ...values, [key]: e.target.value })}
          />
        ))}
      </div>
    </div>
  );
}

function Result({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="p-4">
      <dt className="text-xs text-ink-600">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-ink-950">{value}</dd>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{note}</p>}
    </div>
  );
}
