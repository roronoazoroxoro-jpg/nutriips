"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/client";
import type { AppointmentRow } from "@/lib/appointments";
import { fmtLongDate, toDateInput } from "@/lib/format";
import { AppointmentItem } from "@/components/AppointmentItem";
import { AppointmentModal } from "@/components/AppointmentModal";
import { Button, Card, CardHeader, EmptyState, PageHeader, Skeleton, cx } from "@/components/ui";

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(() => toDateInput());
  const [appointments, setAppointments] = useState<AppointmentRow[] | null>(null);
  const [modal, setModal] = useState<{ open: boolean; appointment?: AppointmentRow | null; date?: Date }>({ open: false });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(() => {
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 7).toISOString();
    api<{ appointments: AppointmentRow[] }>(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((data) => setAppointments(data.appointments))
      .catch(() => setAppointments([]));
  }, [weekStart]);

  useEffect(load, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const row of appointments ?? []) {
      const key = toDateInput(row.startsAt);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return map;
  }, [appointments]);

  const dayList = byDay.get(selected) ?? [];
  const counts = useMemo(() => {
    const list = appointments ?? [];
    return {
      total: list.filter((a) => a.status !== "cancelado").length,
      atendido: list.filter((a) => a.status === "atendido").length,
      ausente: list.filter((a) => a.status === "ausente").length,
      programado: list.filter((a) => a.status === "programado").length,
    };
  }, [appointments]);

  function shiftWeek(delta: number) {
    const next = addDays(weekStart, delta * 7);
    setWeekStart(next);
    setSelected(toDateInput(next));
  }

  function goToday() {
    setWeekStart(startOfWeek(new Date()));
    setSelected(toDateInput());
  }

  const today = toDateInput();
  const rangeLabel = `${days[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Consultorio"
        title="Agenda"
        description={rangeLabel}
        actions={
          <>
            <div className="flex items-center rounded-xl border border-ink-900/10 bg-white shadow-sm">
              <button onClick={() => shiftWeek(-1)} className="rounded-l-xl p-2.5 hover:bg-sand-50" aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToday} className="border-x border-ink-900/10 px-3 py-2 text-sm font-medium hover:bg-sand-50">
                Hoy
              </button>
              <button onClick={() => shiftWeek(1)} className="rounded-r-xl p-2.5 hover:bg-sand-50" aria-label="Semana siguiente">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setModal({ open: true, date: new Date(`${selected}T00:00:00`) })}>
              Nuevo turno
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => {
          const key = toDateInput(day);
          const list = (byDay.get(key) ?? []).filter((a) => a.status !== "cancelado");
          const active = key === selected;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={cx(
                "flex flex-col items-center rounded-2xl border px-1 py-3 transition",
                active ? "border-ink-900 bg-ink-900 text-white shadow-lift" : "border-ink-900/[0.06] bg-white hover:border-ink-900/20",
                key === today && !active && "ring-2 ring-leaf-400/60"
              )}
            >
              <span className={cx("text-[11px] font-medium uppercase", active ? "text-white/70" : "text-ink-500")}>{day.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")}</span>
              <span className="mt-0.5 text-xl font-semibold">{day.getDate()}</span>
              <span className="mt-1 flex h-4 items-center gap-0.5">
                {list.slice(0, 4).map((a) => (
                  <span key={a.id} className={cx("h-1.5 w-1.5 rounded-full", active ? "bg-leaf-300" : a.status === "atendido" ? "bg-leaf-500" : "bg-ink-900/30")} />
                ))}
                {list.length > 4 && <span className={cx("text-[10px]", active ? "text-white/70" : "text-ink-500")}>+{list.length - 4}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader
            icon={<CalendarDays className="h-4 w-4" />}
            title={fmtLongDate(new Date(`${selected}T12:00:00`))}
            subtitle={dayList.length ? `${dayList.length} ${dayList.length === 1 ? "turno" : "turnos"}` : undefined}
            action={
              <Button size="sm" variant="soft" icon={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => setModal({ open: true, date: new Date(`${selected}T00:00:00`) })}>
                Agendar
              </Button>
            }
          />
          {appointments == null ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : dayList.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Sin turnos este día" description="Elegí otro día de la semana o agendá una consulta." />
          ) : (
            <ul className="divide-y divide-ink-900/[0.06]">
              {dayList.map((row) => (
                <AppointmentItem
                  key={row.id}
                  appointment={row}
                  onChange={(updated) => setAppointments((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? null)}
                  onDeleted={(id) => setAppointments((list) => list?.filter((a) => a.id !== id) ?? null)}
                  onReschedule={(appointment) => setModal({ open: true, appointment })}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start p-5">
          <p className="text-sm font-semibold text-ink-950">Resumen de la semana</p>
          <dl className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Turnos" value={counts.total} />
            <SummaryRow label="Por atender" value={counts.programado} dot="bg-ink-900/30" />
            <SummaryRow label="Atendidos" value={counts.atendido} dot="bg-leaf-500" />
            <SummaryRow label="Ausentes" value={counts.ausente} dot="bg-amber-400" />
          </dl>
          {counts.atendido + counts.ausente > 0 && (
            <p className="mt-4 border-t border-ink-900/[0.06] pt-3 text-xs text-ink-600">
              Asistencia: {Math.round((counts.atendido / (counts.atendido + counts.ausente)) * 100)}%
            </p>
          )}
        </Card>
      </div>

      <AppointmentModal
        open={modal.open}
        appointment={modal.appointment}
        defaultDate={modal.date}
        onClose={() => setModal({ open: false })}
        onSaved={(saved) => {
          const key = toDateInput(saved.startsAt);
          const inWeek = days.some((d) => toDateInput(d) === key);
          if (inWeek) setSelected(key);
          else {
            setWeekStart(startOfWeek(new Date(saved.startsAt)));
            setSelected(key);
            return;
          }
          load();
        }}
      />
    </div>
  );
}

function SummaryRow({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-ink-600">
        {dot && <span className={cx("h-2 w-2 rounded-full", dot)} />}
        {label}
      </dt>
      <dd className="font-semibold text-ink-950">{value}</dd>
    </div>
  );
}
