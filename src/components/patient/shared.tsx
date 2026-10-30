"use client";

import { useState, type ReactNode } from "react";
import { History, Trash2 } from "lucide-react";
import type { PresentedPatient } from "@/lib/patient";
import { fmtDate } from "@/lib/format";
import { Card, CardHeader, ConfirmDialog, EmptyState } from "../ui";

export type Patient = PresentedPatient;
export type RecordKind = "anamnesis" | "isak" | "omron" | "glucose" | "meal" | "lab" | "plan" | "note";
export type SaveFn = (kind: RecordKind, payload: Record<string, unknown>, measuredAt?: string, message?: string) => Promise<boolean>;
export type RemoveFn = (kind: RecordKind, recordId: string) => Promise<void>;

export type HistoryItem = { id: string; date: string; title: ReactNode; detail?: ReactNode; extra?: ReactNode };

export function HistoryCard({
  title = "Historial",
  items,
  empty,
  onDelete,
  kindLabel,
}: {
  title?: string;
  items: HistoryItem[];
  empty: string;
  onDelete?: (id: string) => Promise<void>;
  kindLabel?: string;
}) {
  const [pending, setPending] = useState<HistoryItem | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="self-start">
      <CardHeader icon={<History className="h-4 w-4" />} title={title} subtitle={items.length ? `${items.length} ${items.length === 1 ? "registro" : "registros"}` : undefined} />
      {items.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <ul className="max-h-[560px] divide-y divide-ink-900/[0.06] overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="group flex items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-950">{item.title}</p>
                  <p className="shrink-0 text-xs text-ink-500">{fmtDate(item.date)}</p>
                </div>
                {item.detail && <div className="mt-0.5 text-xs leading-relaxed text-ink-600">{item.detail}</div>}
                {item.extra}
              </div>
              {onDelete && (
                <button
                  onClick={() => setPending(item)}
                  className="rounded-lg p-1.5 text-ink-500 opacity-60 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  title="Eliminar registro"
                  aria-label="Eliminar registro"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={pending != null}
        title={`Eliminar ${kindLabel ?? "registro"}`}
        description={`Se va a borrar el registro del ${pending ? fmtDate(pending.date) : ""}. Esta acción no se puede deshacer.`}
        loading={busy}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending || !onDelete) return;
          setBusy(true);
          await onDelete(pending.id);
          setBusy(false);
          setPending(null);
        }}
      />
    </Card>
  );
}

export function numOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : value;
}

export function mapNumbers(source: Record<string, string>) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, numOrNull(value)]));
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-ink-950">{children}</h3>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
