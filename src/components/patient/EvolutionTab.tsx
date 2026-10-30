"use client";

import type { Point } from "@/lib/insights";
import { delta } from "@/lib/insights";
import { fmtDate, fmtNumber, signed } from "@/lib/format";
import { LineChart } from "../LineChart";
import { Card, CardHeader, EmptyState } from "../ui";
import type { Patient } from "./shared";
import { LineChart as LineIcon } from "lucide-react";

export function EvolutionTab({ patient }: { patient: Patient }) {
  const t = patient.trends;
  const waistBand = patient.sex === "masculino" ? { from: 0, to: 94 } : { from: 0, to: 80 };
  const fatBand = patient.sex === "masculino" ? { from: 8, to: 20 } : { from: 21, to: 28 };
  const bmiWeightBand = patient.heightCm
    ? { from: Math.round(18.5 * (patient.heightCm / 100) ** 2 * 10) / 10, to: Math.round(24.9 * (patient.heightCm / 100) ** 2 * 10) / 10 }
    : undefined;

  const charts: { title: string; points: Point[]; unit: string; color: string; band?: { from: number; to: number }; bandLabel?: string; digits?: number }[] = [
    { title: "Peso", points: t.weight, unit: "kg", color: "#1f8a62", band: bmiWeightBand, bandLabel: bmiWeightBand ? `Peso saludable según IMC: ${fmtNumber(bmiWeightBand.from)}–${fmtNumber(bmiWeightBand.to)} kg` : undefined },
    { title: "IMC", points: t.bmi, unit: "kg/m²", color: "#0f766e", band: { from: 18.5, to: 24.9 }, bandLabel: "Normopeso OMS: 18,5–24,9" },
    { title: "% de grasa corporal", points: t.bodyFat, unit: "%", color: "#b45309", band: fatBand, bandLabel: `Rango de referencia: ${fatBand.from}–${fatBand.to}%` },
    { title: "Perímetro de cintura", points: t.waist, unit: "cm", color: "#7c3aed", band: waistBand, bandLabel: `Riesgo bajo OMS: < ${waistBand.to} cm` },
    { title: "Grasa visceral (Omron)", points: t.visceral, unit: "", color: "#dc2626", band: { from: 1, to: 9 }, bandLabel: "Normal: 1–9", digits: 0 },
    { title: "Glucemia en ayunas", points: t.fastingGlucose, unit: "mg/dL", color: "#0369a1", band: { from: 70, to: 99 }, bandLabel: "Normal: 70–99 mg/dL", digits: 0 },
    { title: "HbA1c", points: t.hba1c, unit: "%", color: "#be185d", band: { from: 4, to: 5.6 }, bandLabel: "Normal: < 5,7%" },
  ];
  const withData = charts.filter((chart) => chart.points.length > 0);

  if (withData.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<LineIcon className="h-5 w-5" />}
          title="Todavía no hay datos para graficar"
          description="A medida que cargues mediciones, bioimpedancia, glucemias y laboratorio, vas a ver acá la evolución del paciente."
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {withData.map((chart) => {
        const d = delta(chart.points);
        const first = chart.points[0];
        const last = chart.points.at(-1)!;
        const total = chart.points.length > 1 ? last.value - first.value : null;
        return (
          <Card key={chart.title}>
            <CardHeader
              title={chart.title}
              subtitle={chart.bandLabel}
              action={
                <div className="text-right">
                  <p className="text-lg font-semibold leading-tight text-ink-950">
                    {fmtNumber(last.value, chart.digits ?? 1)} <span className="text-xs font-normal text-ink-500">{chart.unit}</span>
                  </p>
                  {d && <p className="text-xs text-ink-600">{signed(d.value, chart.digits ?? 1)} vs. anterior</p>}
                </div>
              }
            />
            <div className="px-3 pb-2 pt-3">
              <LineChart points={chart.points} unit={chart.unit} color={chart.color} band={chart.band} digits={chart.digits ?? 1} />
            </div>
            {total != null && (
              <p className="border-t border-ink-900/[0.06] px-5 py-2.5 text-xs text-ink-600">
                {signed(total, chart.digits ?? 1)} {chart.unit} desde {fmtDate(first.date)} · {chart.points.length} registros
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
