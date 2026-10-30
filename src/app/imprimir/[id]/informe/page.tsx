"use client";

import { useParams } from "next/navigation";
import { delta, type Point } from "@/lib/insights";
import { diabetesLabel, fmtDate, fmtLongDate, fmtNumber, signed } from "@/lib/format";
import { ACTIVITY, GOALS, macroGrams } from "@/lib/plan";
import { glucoseSlotLabel } from "@/lib/nutrition";
import { LineChart } from "@/components/LineChart";
import { Letterhead, PrintFrame, PrintSection, usePrintData } from "@/components/print/PrintFrame";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = usePrintData(id);
  const p = data?.patient;

  return (
    <PrintFrame title={p ? `Informe nutricional - ${p.fullName}` : "Informe nutricional"} loading={!data} error={error} backHref={`/panel/pacientes/${id}`}>
      {data && p && <Report {...data} />}
    </PrintFrame>
  );
}

function Report({ patient: p, user }: NonNullable<ReturnType<typeof usePrintData>["data"]>) {
  const t = p.trends;
  const isak = p.isak[0];
  const omron = p.omron[0];
  const lab = p.labs[0];
  const an = p.anamneses[0]?.payload;
  const note = p.notes[0];
  const plan = p.plans[0]?.plan;
  const grams = plan ? macroGrams(plan.kcalTarget, plan.macros) : null;

  const rows: { label: string; points: Point[]; unit: string; digits?: number }[] = [
    { label: "Peso", points: t.weight, unit: "kg" },
    { label: "IMC", points: t.bmi, unit: "kg/m²" },
    { label: "% grasa corporal", points: t.bodyFat, unit: "%" },
    { label: "Cintura", points: t.waist, unit: "cm" },
    { label: "Grasa visceral", points: t.visceral, unit: "", digits: 0 },
    { label: "Glucemia en ayunas", points: t.fastingGlucose, unit: "mg/dL", digits: 0 },
    { label: "HbA1c", points: t.hba1c, unit: "%" },
  ].filter((row) => row.points.length > 0);

  const clinical = an
    ? ([
        ["Motivo de consulta", an.reason],
        ["Objetivo", an.goal],
        ["Diagnósticos", an.diagnoses],
        ["Medicación", an.medications],
        ["Alergias e intolerancias", an.allergies],
        ["Actividad física", an.activity],
        ["Síntomas digestivos", an.giSymptoms],
        ["Impresión nutricional", an.impression],
      ].filter(([, value]) => value?.trim()) as [string, string][])
    : [];

  return (
    <>
      <Letterhead user={user} subtitle="Informe nutricional" />

      <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1 rounded-lg bg-sand-50 px-4 py-3 print:bg-sand-50">
        <p className="col-span-2 text-base font-semibold">{p.fullName}</p>
        <Field label="Edad" value={p.age != null ? `${p.age} años` : "—"} />
        <Field label="Sexo" value={p.sex === "femenino" ? "Femenino" : "Masculino"} />
        <Field label="DNI" value={p.dni ?? "—"} />
        <Field label="Talla" value={p.heightCm ? `${p.heightCm} cm` : "—"} />
        <Field label="Condición" value={diabetesLabel(p.diabetesType)} />
        <Field label="Fecha del informe" value={fmtDate(new Date())} />
        {p.diagnosis && <Field label="Diagnóstico" value={p.diagnosis} wide />}
      </section>

      {rows.length > 0 && (
        <PrintSection title="Evolución de indicadores">
          <table className="w-full text-left">
            <thead className="text-[11px] uppercase tracking-wide text-ink-600">
              <tr>
                <th className="py-1 font-medium">Indicador</th>
                <th className="py-1 font-medium">Inicial</th>
                <th className="py-1 font-medium">Anterior</th>
                <th className="py-1 font-medium">Actual</th>
                <th className="py-1 text-right font-medium">Cambio total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.08]">
              {rows.map((row) => {
                const first = row.points[0];
                const last = row.points.at(-1)!;
                const prev = row.points.length > 1 ? row.points.at(-2)! : null;
                const d = row.digits ?? 1;
                return (
                  <tr key={row.label}>
                    <td className="py-1.5 font-medium">{row.label}</td>
                    <td className="py-1.5">
                      {fmtNumber(first.value, d)} <span className="text-[11px] text-ink-500">{fmtDate(first.date, { year: "2-digit" })}</span>
                    </td>
                    <td className="py-1.5">{prev ? fmtNumber(prev.value, d) : "—"}</td>
                    <td className="py-1.5 font-semibold">
                      {fmtNumber(last.value, d)} {row.unit} <span className="text-[11px] font-normal text-ink-500">{fmtDate(last.date, { year: "2-digit" })}</span>
                    </td>
                    <td className="py-1.5 text-right">{row.points.length > 1 ? `${signed(last.value - first.value, d)} ${row.unit}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(t.weight.length > 1 || t.bodyFat.length > 1) && (
            <div className="mt-4 grid grid-cols-2 gap-6">
              {t.weight.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-ink-700">Peso (kg)</p>
                  <LineChart points={t.weight} unit="kg" height={150} />
                </div>
              )}
              {t.bodyFat.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-ink-700">% de grasa</p>
                  <LineChart points={t.bodyFat} unit="%" color="#b45309" height={150} />
                </div>
              )}
            </div>
          )}
        </PrintSection>
      )}

      {p.alerts.length > 0 && (
        <PrintSection title="Hallazgos">
          <ul className="space-y-1">
            {p.alerts.map((alert, i) => (
              <li key={i} className="flex gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alert.tone === "high" ? "bg-red-500" : alert.tone === "mid" ? "bg-amber-500" : alert.tone === "good" ? "bg-leaf-500" : "bg-sky-500"}`} />
                <span>
                  <strong>{alert.title}.</strong> {alert.detail}
                </span>
              </li>
            ))}
          </ul>
        </PrintSection>
      )}

      <div className="grid grid-cols-2 gap-x-8">
        {isak && (
          <PrintSection title={`Antropometría ISAK · ${fmtDate(isak.measuredAt)}`}>
            <dl className="space-y-0.5">
              <Line label="Peso / talla" value={`${fmtNumber(isak.input.weightKg)} kg / ${fmtNumber(isak.input.statureCm ?? p.heightCm)} cm`} />
              <Line label="IMC" value={isak.result.bmi != null ? `${fmtNumber(isak.result.bmi)} · ${isak.result.bmiLabel}` : "—"} />
              <Line label="Σ 6 / Σ 8 pliegues" value={`${fmtNumber(isak.result.sum6)} / ${fmtNumber(isak.result.sum8)} mm`} />
              <Line label="% grasa (Durnin-Siri)" value={isak.result.bodyFat ? `${fmtNumber(isak.result.bodyFat.fatPercent)}%` : "—"} />
              <Line label="Área muscular del brazo" value={isak.result.armMuscle ? `${fmtNumber(isak.result.armMuscle.cm2)} cm²` : "—"} />
              <Line label="Cintura / cadera" value={isak.result.waistHipRatio != null ? `${fmtNumber(isak.result.waistHipRatio, 2)}${isak.result.waistRisk ? ` · ${isak.result.waistRisk.label}` : ""}` : "—"} />
            </dl>
          </PrintSection>
        )}
        {omron && (
          <PrintSection title={`Bioimpedancia ${omron.input.model} · ${fmtDate(omron.measuredAt)}`}>
            <dl className="space-y-0.5">
              <Line label="Peso" value={omron.input.weightKg != null ? `${fmtNumber(omron.input.weightKg)} kg` : "—"} />
              <Line label="% grasa" value={omron.input.bodyFatPercent != null ? `${fmtNumber(omron.input.bodyFatPercent)}% · ${omron.result.bodyFat?.label}` : "—"} />
              <Line label="Grasa visceral" value={omron.input.visceralFat != null ? `${omron.input.visceralFat} · ${omron.result.visceral?.label}` : "—"} />
              <Line label="Músculo esquelético" value={omron.input.skeletalMusclePercent != null ? `${fmtNumber(omron.input.skeletalMusclePercent)}%` : "—"} />
              <Line label="Metabolismo basal" value={omron.input.restingMetabolism != null ? `${fmtNumber(omron.input.restingMetabolism, 0)} kcal` : "—"} />
              <Line label="Mifflin-St Jeor" value={omron.result.equationKcal != null ? `${fmtNumber(omron.result.equationKcal, 0)} kcal` : "—"} />
            </dl>
          </PrintSection>
        )}
        {lab && (
          <PrintSection title={`Laboratorio · ${fmtDate(lab.measuredAt)}`}>
            <dl className="space-y-0.5">
              {lab.glucose != null && <Line label="Glucemia" value={`${fmtNumber(lab.glucose, 0)} mg/dL`} />}
              {lab.hba1c != null && <Line label="HbA1c" value={`${fmtNumber(lab.hba1c)}%`} />}
              {lab.ldl != null && <Line label="LDL" value={`${fmtNumber(lab.ldl, 0)} mg/dL`} />}
              {lab.triglycerides != null && <Line label="Triglicéridos" value={`${fmtNumber(lab.triglycerides, 0)} mg/dL`} />}
              {lab.creatinine != null && <Line label="Creatinina" value={`${fmtNumber(lab.creatinine, 2)} mg/dL`} />}
            </dl>
          </PrintSection>
        )}
        {p.glucose.length > 0 && (
          <PrintSection title="Últimas glucemias">
            <dl className="space-y-0.5">
              {p.glucose.slice(0, 6).map((g) => (
                <Line key={g.id} label={`${fmtDate(g.measuredAt)} · ${glucoseSlotLabel(g.slot)}`} value={`${fmtNumber(g.value, 0)} mg/dL`} />
              ))}
            </dl>
          </PrintSection>
        )}
      </div>

      {clinical.length > 0 && (
        <PrintSection title={`Anamnesis · ${fmtDate(p.anamneses[0].createdAt)}`}>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2">
            {clinical.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</dt>
                <dd className="whitespace-pre-line">{value}</dd>
              </div>
            ))}
          </dl>
        </PrintSection>
      )}

      {plan && (
        <PrintSection title={`Plan alimentario indicado · ${fmtDate(p.plans[0].createdAt)}`}>
          <p>
            <strong>{GOALS[plan.goal]?.label}</strong> · {ACTIVITY[plan.activity]?.label}
            {plan.kcalTarget ? ` · ${fmtNumber(plan.kcalTarget, 0)} kcal/día` : ""}
            {grams ? ` · HC ${plan.macros.carbs}% (${grams.carbs} g), proteínas ${plan.macros.protein}% (${grams.protein} g), grasas ${plan.macros.fat}% (${grams.fat} g)` : ""}
          </p>
        </PrintSection>
      )}

      {note && (
        <PrintSection title={`Última evolución · ${fmtLongDate(note.visitDate)}`}>
          <p className="whitespace-pre-line">{note.summary}</p>
          {note.agreements && (
            <p className="mt-2 whitespace-pre-line">
              <strong>Acuerdos:</strong> {note.agreements}
            </p>
          )}
          {note.nextVisit && (
            <p className="mt-1">
              <strong>Próximo control:</strong> {note.nextVisit}
            </p>
          )}
        </PrintSection>
      )}

      <footer className="print-avoid-break mt-16 flex items-end justify-between">
        <p className="text-[11px] text-ink-500">Generado con NutriIPS el {fmtDate(new Date())}.</p>
        <div className="w-56 border-t border-ink-900/40 pt-1 text-center text-xs">
          <p className="font-semibold">{user.name}</p>
          {user.license && <p className="text-ink-600">M.P. {user.license}</p>}
        </div>
      </footer>
    </>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <p className={wide ? "col-span-2" : ""}>
      <span className="text-ink-500">{label}: </span>
      {value}
    </p>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dotted border-ink-900/10 py-0.5">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
