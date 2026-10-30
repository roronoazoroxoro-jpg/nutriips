"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CalendarClock, MoreHorizontal, Trash2, UserX, X } from "lucide-react";
import { api } from "@/lib/client";
import { statusLabel, type AppointmentRow } from "@/lib/appointments";
import { fmtTime } from "@/lib/format";
import { Badge, ConfirmDialog, cx } from "./ui";
import { useToast } from "./toast";

const STATUS_TONE: Record<string, "neutral" | "good" | "mid" | "high"> = {
  programado: "neutral",
  atendido: "good",
  ausente: "mid",
  cancelado: "high",
};

export function AppointmentItem({
  appointment,
  onChange,
  onDeleted,
  onReschedule,
  showDate,
}: {
  appointment: AppointmentRow;
  onChange: (appointment: AppointmentRow) => void;
  onDeleted: (id: string) => void;
  onReschedule: (appointment: AppointmentRow) => void;
  showDate?: boolean;
}) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = new Date(appointment.startsAt);
  const end = new Date(start.getTime() + appointment.durationMin * 60_000);
  const past = end.getTime() < Date.now();

  async function setStatus(status: string) {
    setMenu(false);
    try {
      const data = await api<{ appointment: AppointmentRow }>(`/api/appointments/${appointment.id}`, { method: "PATCH", json: { status } });
      onChange(data.appointment);
      toast.success(`Turno marcado como ${statusLabel(status).toLowerCase()}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      onDeleted(appointment.id);
      toast.success("Turno eliminado");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <li className={cx("group relative flex items-center gap-3 px-4 py-3", appointment.status === "cancelado" && "opacity-60")}>
      <div className="w-14 shrink-0 text-center">
        {showDate && <p className="text-[11px] font-medium uppercase text-ink-500">{start.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}</p>}
        <p className="text-sm font-semibold text-ink-950">{fmtTime(start)}</p>
        <p className="text-[11px] text-ink-500">{appointment.durationMin} min</p>
      </div>
      <div className={cx("h-10 w-1 shrink-0 rounded-full", appointment.status === "atendido" ? "bg-leaf-400" : appointment.status === "programado" ? "bg-ink-900/15" : "bg-amber-300")} />
      <div className="min-w-0 flex-1">
        <Link href={`/panel/pacientes/${appointment.patient.id}`} className="block truncate text-sm font-semibold text-ink-950 hover:underline">
          {appointment.patient.fullName}
        </Link>
        <p className="truncate text-xs text-ink-600">{appointment.reason || "Consulta"}</p>
      </div>
      <Badge tone={STATUS_TONE[appointment.status] ?? "neutral"}>{statusLabel(appointment.status)}</Badge>
      {appointment.status === "programado" && past && (
        <button onClick={() => setStatus("atendido")} className="hidden rounded-lg p-1.5 text-leaf-700 hover:bg-leaf-50 sm:block" title="Marcar atendido">
          <Check className="h-4 w-4" />
        </button>
      )}
      <div className="relative">
        <button onClick={() => setMenu((v) => !v)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-900/5" aria-label="Acciones del turno">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-20 w-48 animate-fade-in overflow-hidden rounded-xl border border-ink-900/10 bg-white py-1 text-sm shadow-lift">
              <MenuItem icon={<Check className="h-4 w-4" />} onClick={() => setStatus("atendido")}>Atendido</MenuItem>
              <MenuItem icon={<UserX className="h-4 w-4" />} onClick={() => setStatus("ausente")}>No vino</MenuItem>
              <MenuItem icon={<X className="h-4 w-4" />} onClick={() => setStatus("cancelado")}>Cancelado</MenuItem>
              {appointment.status !== "programado" && <MenuItem icon={<CalendarClock className="h-4 w-4" />} onClick={() => setStatus("programado")}>Volver a programado</MenuItem>}
              <MenuItem icon={<CalendarClock className="h-4 w-4" />} onClick={() => { setMenu(false); onReschedule(appointment); }}>Reprogramar</MenuItem>
              <div className="my-1 border-t border-ink-900/[0.06]" />
              <MenuItem icon={<Trash2 className="h-4 w-4" />} danger onClick={() => { setMenu(false); setConfirm(true); }}>Eliminar</MenuItem>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        title="Eliminar turno"
        description={`Se va a eliminar el turno de ${appointment.patient.fullName}. Si solo no asistió, conviene marcarlo como "No vino" para conservar el historial.`}
        loading={busy}
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </li>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx("flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-sand-50", danger ? "text-red-600" : "text-ink-800")}>
      {icon}
      {children}
    </button>
  );
}
