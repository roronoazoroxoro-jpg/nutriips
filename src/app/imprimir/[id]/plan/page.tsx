"use client";

import { useParams } from "next/navigation";
import { Clock, ShoppingBasket, Sparkles } from "lucide-react";
import { fmtDate, fmtDateTime, fmtNumber } from "@/lib/format";
import { Letterhead, PrintFrame, PrintSection, usePrintData } from "@/components/print/PrintFrame";

export default function PatientPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = usePrintData(id);
  const saved = data?.patient.plans[0];
  const notice =
    data && !saved?.plan
      ? { title: "Todavía no hay un plan guardado", text: "Armá y guardá el plan desde la pestaña Plan alimentario para poder entregarlo.", action: "Ir a armar el plan" }
      : undefined;

  return (
    <PrintFrame
      title={data ? `Plan alimentario - ${data.patient.fullName}` : "Plan alimentario"}
      loading={!data && !error}
      error={error}
      notice={notice}
      backHref={`/panel/pacientes/${id}#plan`}
    >
      {data && saved?.plan && <PlanSheet data={data} />}
    </PrintFrame>
  );
}

function PlanSheet({ data }: { data: NonNullable<ReturnType<typeof usePrintData>["data"]> }) {
  const { patient, user } = data;
  const saved = patient.plans[0];
  const plan = saved.plan!;
  const next = patient.appointments.find((a) => a.status === "programado" && new Date(a.startsAt).getTime() > Date.now());
  const recommendations = plan.recommendations.split("\n").map((r) => r.trim()).filter(Boolean);

  return (
    <>
      <Letterhead user={user} subtitle="Plan alimentario" />

      <section className="mt-6 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-500">Para</p>
          <h1 className="text-2xl font-semibold">{patient.fullName}</h1>
          <p className="mt-0.5 text-sm text-ink-600">{plan.title} · entregado el {fmtDate(saved.createdAt)}</p>
        </div>
        {plan.kcalTarget && (
          <div className="rounded-xl bg-leaf-50 px-4 py-2 text-right print:bg-leaf-50">
            <p className="text-[11px] uppercase tracking-wide text-leaf-700">Energía diaria orientativa</p>
            <p className="text-lg font-semibold text-leaf-800">{fmtNumber(plan.kcalTarget, 0)} kcal</p>
          </div>
        )}
      </section>

      <PrintSection title="Tu día">
        <div className="grid grid-cols-2 gap-3">
          {plan.meals.map((meal) => (
            <div key={meal.id} className="print-avoid-break rounded-xl border border-ink-900/10 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-ink-950">{meal.name}</p>
                {meal.time && (
                  <p className="inline-flex items-center gap-1 text-xs text-ink-600">
                    <Clock className="h-3 w-3" />
                    {meal.time} h
                  </p>
                )}
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {meal.items
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-500" />
                      <span>{item}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </PrintSection>

      {recommendations.length > 0 && (
        <PrintSection title="Recomendaciones">
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf-600" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </PrintSection>
      )}

      {plan.shopping.length > 0 && (
        <PrintSection title="Lista de compras">
          <ul className="columns-2 gap-8">
            {plan.shopping.map((item, i) => (
              <li key={i} className="mb-1.5 flex break-inside-avoid items-start gap-2">
                <span className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded border border-ink-900/30" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PrintSection>
      )}

      <footer className="print-avoid-break mt-10 flex items-center justify-between gap-6 rounded-xl bg-sand-50 px-4 py-3 text-sm print:bg-sand-50">
        <div className="flex items-center gap-2">
          <ShoppingBasket className="h-4 w-4 text-leaf-600" />
          <span>{next ? <>Próximo control: <strong>{fmtDateTime(next.startsAt)}</strong></> : "Traé este plan a tu próximo control."}</span>
        </div>
        <div className="text-right text-xs text-ink-600">
          <p className="font-semibold text-ink-900">{user.name}</p>
          {[user.license ? `M.P. ${user.license}` : null, user.phone].filter(Boolean).join(" · ")}
        </div>
      </footer>
    </>
  );
}
