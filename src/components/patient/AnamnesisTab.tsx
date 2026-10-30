"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import { ANAMNESIS_SECTIONS, emptyAnamnesis } from "@/lib/anamnesis";
import { fmtDate } from "@/lib/format";
import { Button, Card, Modal, cx } from "../ui";
import { HistoryCard, type Patient, type RemoveFn, type SaveFn } from "./shared";

export function AnamnesisTab({ patient, save, remove }: { patient: Patient; save: SaveFn; remove: RemoveFn }) {
  const latest = patient.anamneses[0];
  const [values, setValues] = useState<Record<string, string>>({ ...emptyAnamnesis(), ...latest?.payload });
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<(typeof patient.anamneses)[number] | null>(null);

  const progress = useMemo(
    () =>
      ANAMNESIS_SECTIONS.map((section) => {
        const filled = section.fields.filter((field) => values[field.key]?.trim()).length;
        return { id: section.id, title: section.title, filled, total: section.fields.length };
      }),
    [values]
  );
  const totalFilled = progress.reduce((acc, p) => acc + p.filled, 0);
  const total = progress.reduce((acc, p) => acc + p.total, 0);

  const versions =
    patient.anamneses.length > 0 ? (
      <HistoryCard
        title="Versiones"
        kindLabel="versión de anamnesis"
        empty=""
        items={patient.anamneses.map((row, index) => ({
          id: row.id,
          date: row.createdAt,
          title: index === 0 ? "Vigente" : `Versión ${patient.anamneses.length - index}`,
          extra: (
            <button onClick={() => setViewing(row)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-leaf-700 hover:underline">
              <Eye className="h-3 w-3" /> Ver
            </button>
          ),
        }))}
        onDelete={(id) => remove("anamnesis", id)}
      />
    ) : null;

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const ok = await save("anamnesis", values, undefined, latest ? "Anamnesis actualizada (se guardó una nueva versión)" : "Anamnesis guardada");
    setLoading(false);
    if (ok) setDirty(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <Card className="p-4">
            <p className="text-xs font-medium text-ink-600">Completado</p>
            <p className="mt-1 text-2xl font-semibold">{Math.round((totalFilled / total) * 100)}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-900/[0.06]">
              <div className="h-full rounded-full bg-leaf-500 transition-all" style={{ width: `${(totalFilled / total) * 100}%` }} />
            </div>
            <nav className="mt-4 space-y-0.5">
              {progress.map((p) => (
                <a key={p.id} href={`#sec-${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-sand-100">
                  {p.filled === p.total ? <CheckCircle2 className="h-4 w-4 text-leaf-600" /> : <Circle className={cx("h-4 w-4", p.filled ? "text-amber-500" : "text-ink-900/20")} />}
                  <span className="truncate">{p.title}</span>
                </a>
              ))}
            </nav>
          </Card>
          {versions}
        </div>
      </aside>

      <form onSubmit={submit} className="space-y-5">
        {latest && (
          <p className="text-xs text-ink-600">
            Mostrando la versión del {fmtDate(latest.createdAt)}. Al guardar se crea una nueva versión y la anterior queda en el historial.
          </p>
        )}
        {ANAMNESIS_SECTIONS.map((section) => (
          <Card key={section.id} id={`sec-${section.id}`} className="scroll-mt-6 p-5">
            <h2 className="text-[15px] font-semibold text-ink-950">{section.title}</h2>
            <p className="mt-0.5 text-xs text-ink-600">{section.hint}</p>
            <div className={cx("mt-4 grid gap-4", section.id === "frecuencia" ? "sm:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
              {section.fields.map((field) => (
                <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                  <label className="label" htmlFor={`an-${field.key}`}>
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select id={`an-${field.key}`} className="input" value={values[field.key] || ""} onChange={(e) => set(field.key, e.target.value)}>
                      <option value="">Sin dato</option>
                      {field.options?.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea id={`an-${field.key}`} className="input" placeholder={field.placeholder} value={values[field.key] || ""} onChange={(e) => set(field.key, e.target.value)} />
                  ) : (
                    <input
                      id={`an-${field.key}`}
                      className="input"
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder}
                      value={values[field.key] || ""}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
        <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-ink-900/[0.06] bg-white/90 p-3 shadow-lift backdrop-blur">
          <p className="mr-auto pl-2 text-xs text-ink-600">{dirty ? "Hay cambios sin guardar" : latest ? `Guardada el ${fmtDate(latest.createdAt)}` : "Sin guardar"}</p>
          <Button type="submit" loading={loading} disabled={!dirty && Boolean(latest)}>
            Guardar anamnesis
          </Button>
        </div>
      </form>
      {versions && <div className="lg:hidden">{versions}</div>}

      <Modal open={viewing != null} onClose={() => setViewing(null)} title="Anamnesis" description={viewing ? `Versión del ${fmtDate(viewing.createdAt)}` : undefined} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewing(null)}>Cerrar</Button>
            <Button
              onClick={() => {
                if (viewing) {
                  setValues({ ...emptyAnamnesis(), ...viewing.payload });
                  setDirty(true);
                }
                setViewing(null);
              }}
            >
              Usar como base
            </Button>
          </>
        }
      >
        {viewing && (
          <div className="space-y-5">
            {ANAMNESIS_SECTIONS.map((section) => {
              const rows = section.fields.filter((field) => viewing.payload[field.key]?.trim());
              if (!rows.length) return null;
              return (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-ink-950">{section.title}</h3>
                  <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {rows.map((field) => (
                      <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                        <dt className="text-xs text-ink-500">{field.label}</dt>
                        <dd className="whitespace-pre-line text-ink-900">{viewing.payload[field.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
