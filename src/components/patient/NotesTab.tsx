"use client";

import { useState } from "react";
import { FileText, Sparkles, Stethoscope, Trash2 } from "lucide-react";
import { delta } from "@/lib/insights";
import { fmtDate, fmtLongDate, fmtNumber, signed, toDateInput } from "@/lib/format";
import { Button, Card, CardHeader, ConfirmDialog, EmptyState, Input, Textarea } from "../ui";
import type { Patient, RemoveFn, SaveFn } from "./shared";

const SOAP = "Subjetivo: \n\nObjetivo: \n\nEvaluación: \n\nPlan: ";

function objectiveSummary(patient: Patient) {
  const t = patient.trends;
  const parts: string[] = [];
  const add = (label: string, points: typeof t.weight, unit: string, digits = 1) => {
    const last = points.at(-1);
    if (!last) return;
    const d = delta(points);
    parts.push(`${label} ${fmtNumber(last.value, digits)}${unit}${d ? ` (${signed(d.value, digits)})` : ""}`);
  };
  add("Peso", t.weight, " kg");
  add("IMC", t.bmi, "");
  add("Grasa", t.bodyFat, "%");
  add("Cintura", t.waist, " cm");
  add("Visceral", t.visceral, "", 0);
  add("Glucemia ayunas", t.fastingGlucose, " mg/dL", 0);
  add("HbA1c", t.hba1c, "%");
  return parts.join(" · ");
}

export function NotesTab({ patient, save, remove }: { patient: Patient; save: SaveFn; remove: RemoveFn }) {
  const [date, setDate] = useState(toDateInput());
  const [summary, setSummary] = useState("");
  const [agreements, setAgreements] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const objective = objectiveSummary(patient);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const ok = await save("note", { summary, agreements, nextVisit }, date);
    setLoading(false);
    if (ok) {
      setSummary("");
      setAgreements("");
      setNextVisit("");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card className="self-start">
        <CardHeader icon={<Stethoscope className="h-4 w-4" />} title="Nueva evolución" subtitle="Lo que se trabajó hoy y lo acordado con el paciente" />
        <form onSubmit={submit} className="space-y-4 p-5">
          <Input label="Fecha de la consulta" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[200px]" />
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="text-[13px] font-medium text-ink-800" htmlFor="note-summary">
                Evolución *
              </label>
              <div className="flex gap-1">
                {!summary && (
                  <Button size="sm" variant="ghost" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => setSummary(SOAP)}>
                    Plantilla SOAP
                  </Button>
                )}
                {objective && (
                  <Button
                    size="sm"
                    variant="soft"
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    onClick={() => setSummary((s) => (s.includes("Objetivo: ") ? s.replace("Objetivo: ", `Objetivo: ${objective}`) : `${s}${s ? "\n" : ""}${objective}`))}
                  >
                    Insertar mediciones
                  </Button>
                )}
              </div>
            </div>
            <textarea id="note-summary" className="input min-h-[180px]" value={summary} onChange={(e) => setSummary(e.target.value)} required placeholder="Cómo llegó, adherencia al plan, cambios, dificultades..." />
          </div>
          <Textarea label="Acuerdos con el paciente" value={agreements} onChange={(e) => setAgreements(e.target.value)} placeholder="Metas concretas hasta el próximo control" />
          <Input label="Próximo control" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} placeholder="En 30 días" />
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              Guardar evolución
            </Button>
          </div>
        </form>
      </Card>

      <Card className="self-start">
        <CardHeader title="Historia de consultas" subtitle={patient.notes.length ? `${patient.notes.length} ${patient.notes.length === 1 ? "consulta" : "consultas"}` : undefined} />
        {patient.notes.length === 0 ? (
          <EmptyState title="Sin evoluciones registradas" description="Cada consulta que registres queda acá, ordenada en el tiempo." />
        ) : (
          <ol className="relative space-y-0 px-5 py-4">
            {patient.notes.map((note, index) => (
              <li key={note.id} className="group relative pb-6 pl-6 last:pb-0">
                {index < patient.notes.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-ink-900/10" />}
                <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-leaf-500 bg-white" />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-950">{fmtLongDate(note.visitDate)}</p>
                  <button
                    onClick={() => setPending(note.id)}
                    className="rounded-lg p-1 text-ink-500 opacity-60 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    aria-label="Eliminar evolución"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-800">{note.summary}</p>
                {note.agreements && (
                  <div className="mt-2 rounded-xl bg-leaf-50 px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-leaf-800">Acuerdos</p>
                    <p className="mt-0.5 whitespace-pre-line text-ink-800">{note.agreements}</p>
                  </div>
                )}
                {note.nextVisit && <p className="mt-1.5 text-xs text-ink-600">Próximo control: {note.nextVisit}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <ConfirmDialog
        open={pending != null}
        title="Eliminar evolución"
        description={`Se va a borrar la evolución del ${fmtDate(patient.notes.find((n) => n.id === pending)?.visitDate)}.`}
        loading={busy}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          setBusy(true);
          await remove("note", pending);
          setBusy(false);
          setPending(null);
        }}
      />
    </div>
  );
}
