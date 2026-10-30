"use client";

import { Activity, ClipboardList, Flame, HeartPulse, Ruler, Salad, Scale, Stethoscope } from "lucide-react";
import { delta } from "@/lib/insights";
import { fmtDate, fmtNumber, relativeDay, signed } from "@/lib/format";
import { ACTIVITY, GOALS, energyTarget, goalFromAnamnesis, activityFromAnamnesis } from "@/lib/plan";
import { AlertRow, Button, Card, CardHeader, EmptyState, Stat } from "../ui";
import type { Patient } from "./shared";
import type { TabKey } from "./PatientWorkspace";

export function SummaryTab({ patient, goTo }: { patient: Patient; goTo: (tab: TabKey) => void }) {
  const t = patient.trends;
  const change = (points: typeof t.weight, digits = 1) => {
    const d = delta(points);
    if (!d) return null;
    const since = fmtDate(d.since, { year: undefined });
    return { value: d.value, text: d.value === 0 ? `Sin cambios desde ${since}` : `${signed(d.value, digits)} desde ${since}` };
  };
  const isak = patient.isak[0];
  const omron = patient.omron[0];
  const lab = patient.labs[0];
  const anamnesis = patient.anamneses[0]?.payload;
  const note = patient.notes[0];
  const plan = patient.plans[0]?.plan;
  const weight = t.weight.at(-1)?.value ?? null;
  const goal = plan?.goal ?? goalFromAnamnesis(anamnesis?.goal);
  const activity = plan?.activity ?? activityFromAnamnesis(anamnesis?.activity);
  const energy = energyTarget({ sex: patient.sex, age: patient.age, weightKg: weight, statureCm: patient.heightCm, goal, activity });
  const hasData = patient.isak.length + patient.omron.length + patient.labs.length + patient.anamneses.length + patient.notes.length > 0;

  if (!hasData) {
    return (
      <Card>
        <EmptyState
          icon={<Stethoscope className="h-5 w-5" />}
          title="Ficha lista para la primera consulta"
          description="Te sugerimos este orden: anamnesis alimentaria, medición antropométrica o bioimpedancia, y después el plan alimentario."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={<ClipboardList className="h-4 w-4" />} onClick={() => goTo("anamnesis")}>
                Empezar anamnesis
              </Button>
              <Button variant="secondary" icon={<Ruler className="h-4 w-4" />} onClick={() => goTo("isak")}>
                Cargar medición
              </Button>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Peso" value={fmtNumber(weight)} unit="kg" change={change(t.weight)} goodWhen={goal === "ganar" ? "up" : goal === "bajar" ? "down" : "none"} />
        <Stat label="IMC" value={fmtNumber(t.bmi.at(-1)?.value)} detail={isak?.result.bmiLabel?.replace(" (OMS)", "")} change={change(t.bmi)} goodWhen={goal === "bajar" ? "down" : "none"} />
        <Stat label="% grasa" value={fmtNumber(t.bodyFat.at(-1)?.value)} unit="%" change={change(t.bodyFat)} />
        <Stat label="Cintura" value={fmtNumber(t.waist.at(-1)?.value)} unit="cm" change={change(t.waist)} />
        <Stat label="Grasa visceral" value={fmtNumber(t.visceral.at(-1)?.value, 0)} detail={omron?.result.visceral?.label} change={change(t.visceral, 0)} />
        <Stat label="HbA1c" value={fmtNumber(t.hba1c.at(-1)?.value)} unit="%" change={change(t.hba1c)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader icon={<HeartPulse className="h-4 w-4" />} title="Alertas y observaciones" subtitle="Calculadas con los últimos registros" />
          {patient.alerts.length === 0 ? (
            <EmptyState title="Sin alertas" description="Los últimos valores cargados están dentro de los rangos de referencia." />
          ) : (
            <ul className="divide-y divide-ink-900/[0.06] px-5">
              {patient.alerts.map((alert, index) => (
                <AlertRow key={index} {...alert} />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader icon={<Flame className="h-4 w-4" />} title="Requerimiento energético" subtitle="Mifflin-St Jeor × factor de actividad" />
          {energy ? (
            <div className="grid grid-cols-3 divide-x divide-ink-900/[0.06] py-4 text-center">
              <div>
                <p className="text-xs text-ink-600">Basal</p>
                <p className="mt-1 text-xl font-semibold">{fmtNumber(energy.bmr, 0)}</p>
                <p className="text-xs text-ink-500">kcal</p>
              </div>
              <div>
                <p className="text-xs text-ink-600">Gasto total</p>
                <p className="mt-1 text-xl font-semibold">{fmtNumber(energy.tdee, 0)}</p>
                <p className="text-xs text-ink-500">kcal</p>
              </div>
              <div>
                <p className="text-xs text-ink-600">Meta</p>
                <p className="mt-1 text-xl font-semibold text-leaf-700">{fmtNumber(plan?.kcalTarget ?? energy.target, 0)}</p>
                <p className="text-xs text-ink-500">kcal/día</p>
              </div>
            </div>
          ) : (
            <p className="px-5 py-6 text-sm text-ink-600">Para calcularlo hacen falta fecha de nacimiento, talla y un peso registrado.</p>
          )}
          {energy && (
            <p className="border-t border-ink-900/[0.06] px-5 py-3 text-xs text-ink-600">
              {GOALS[goal].label} · {ACTIVITY[activity].label}
              {omron?.input.restingMetabolism ? ` · Omron estimó ${fmtNumber(omron.input.restingMetabolism, 0)} kcal basales` : ""}
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            icon={<Ruler className="h-4 w-4" />}
            title="Composición corporal"
            subtitle={isak ? `ISAK del ${fmtDate(isak.measuredAt)}` : undefined}
            action={<Button size="sm" variant="ghost" onClick={() => goTo("isak")}>Ver</Button>}
          />
          {isak ? (
            <dl className="divide-y divide-ink-900/[0.06] px-5 text-sm">
              <Row label="Σ 6 pliegues" value={isak.result.sum6 != null ? `${fmtNumber(isak.result.sum6)} mm` : "—"} />
              <Row label="Σ 8 pliegues" value={isak.result.sum8 != null ? `${fmtNumber(isak.result.sum8)} mm` : "—"} />
              <Row label="% grasa (Durnin)" value={isak.result.bodyFat ? `${fmtNumber(isak.result.bodyFat.fatPercent)}%` : "—"} />
              <Row label="Área muscular brazo" value={isak.result.armMuscle ? `${fmtNumber(isak.result.armMuscle.cm2)} cm²` : "—"} />
              <Row label="Cintura / cadera" value={fmtNumber(isak.result.waistHipRatio, 2)} />
            </dl>
          ) : (
            <EmptyState title="Sin antropometría" action={<Button size="sm" variant="soft" onClick={() => goTo("isak")}>Cargar</Button>} />
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<Scale className="h-4 w-4" />}
            title="Bioimpedancia"
            subtitle={omron ? `${omron.input.model} · ${fmtDate(omron.measuredAt)}` : undefined}
            action={<Button size="sm" variant="ghost" onClick={() => goTo("omron")}>Ver</Button>}
          />
          {omron ? (
            <>
              <dl className="divide-y divide-ink-900/[0.06] px-5 text-sm">
                <Row label="% grasa" value={omron.input.bodyFatPercent != null ? `${fmtNumber(omron.input.bodyFatPercent)}%` : "—"} note={omron.result.bodyFat?.label} />
                <Row label="Músculo esquelético" value={omron.input.skeletalMusclePercent != null ? `${fmtNumber(omron.input.skeletalMusclePercent)}%` : "—"} />
                <Row label="Metabolismo basal" value={omron.input.restingMetabolism != null ? `${fmtNumber(omron.input.restingMetabolism, 0)} kcal` : "—"} />
                <Row label="Edad corporal" value={omron.input.bodyAge != null ? `${omron.input.bodyAge} años` : "—"} />
              </dl>
              <p className="border-t border-ink-900/[0.06] px-5 py-3 text-xs leading-relaxed text-ink-600">{omron.result.note}</p>
            </>
          ) : (
            <EmptyState title="Sin lecturas" action={<Button size="sm" variant="soft" onClick={() => goTo("omron")}>Cargar</Button>} />
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<Activity className="h-4 w-4" />}
            title="Última consulta"
            subtitle={note ? relativeDay(note.visitDate) : undefined}
            action={<Button size="sm" variant="ghost" onClick={() => goTo("consultas")}>Ver</Button>}
          />
          {note ? (
            <div className="space-y-3 px-5 py-4 text-sm">
              <p className="line-clamp-5 whitespace-pre-line leading-relaxed text-ink-800">{note.summary}</p>
              {note.agreements && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Acuerdos</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-ink-800">{note.agreements}</p>
                </div>
              )}
              {note.nextVisit && <p className="text-xs text-ink-600">Próximo control: {note.nextVisit}</p>}
            </div>
          ) : anamnesis ? (
            <div className="space-y-2 px-5 py-4 text-sm text-ink-800">
              <p><span className="text-ink-500">Motivo:</span> {anamnesis.reason || "—"}</p>
              <p><span className="text-ink-500">Objetivo:</span> {anamnesis.goal || "—"}</p>
              <p><span className="text-ink-500">Acuerdos:</span> {anamnesis.agreements || "—"}</p>
            </div>
          ) : (
            <EmptyState title="Sin evoluciones" action={<Button size="sm" variant="soft" onClick={() => goTo("consultas")}>Registrar</Button>} />
          )}
        </Card>
      </div>

      {!plan && (
        <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-br from-leaf-50 to-white p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
              <Salad className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-ink-950">Todavía no tiene plan alimentario</p>
              <p className="text-sm text-ink-600">NutriIPS arma una propuesta con su anamnesis, mediciones y laboratorio. Vos la ajustás y la imprimís.</p>
            </div>
          </div>
          <Button onClick={() => goTo("plan")}>Armar plan</Button>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-right font-medium text-ink-950">
        {value}
        {note && <span className="block text-xs font-normal text-ink-500">{note}</span>}
      </dd>
    </div>
  );
}
