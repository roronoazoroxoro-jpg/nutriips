"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CalendarPlus, ChevronRight, Clock, HeartPulse, Stethoscope, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/client";
import type { AppointmentRow } from "@/lib/appointments";
import type { PatientSummary } from "@/lib/patient";
import type { Alert } from "@/lib/insights";
import { fmtDate, fmtLongDate, fmtTime, greeting, relativeDay } from "@/lib/format";
import { useSession } from "@/components/session";
import { AppointmentItem } from "@/components/AppointmentItem";
import { AppointmentModal } from "@/components/AppointmentModal";
import { Avatar, Badge, Button, ButtonLink, Card, CardHeader, EmptyState, PageHeader, Skeleton, Stat } from "@/components/ui";

type Dashboard = {
  stats: { patients: number; newThisMonth: number; today: number; visitsThisMonth: number; withAlerts: number };
  today: AppointmentRow[];
  upcoming: AppointmentRow[];
  attention: (PatientSummary & { topAlert: Alert | null })[];
  overdue: PatientSummary[];
  recent: PatientSummary[];
};

export default function HomePage() {
  const { user } = useSession();
  const [data, setData] = useState<Dashboard | null>(null);
  const [modal, setModal] = useState<{ open: boolean; appointment?: AppointmentRow | null }>({ open: false });

  const load = useCallback(() => {
    api<Dashboard>(`/api/dashboard?tz=${new Date().getTimezoneOffset()}`)
      .then(setData)
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  const firstName = user?.name.replace(/^(lic\.?|dr\.?|dra\.?)\s+/i, "").split(" ")[0];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow={fmtLongDate(new Date())}
        title={user ? `${greeting()}${firstName ? `, ${firstName}` : ""}` : greeting()}
        description={
          data
            ? data.stats.today
              ? `Tenés ${data.stats.today} ${data.stats.today === 1 ? "turno" : "turnos"} hoy.`
              : "No tenés turnos para hoy."
            : "Preparando tu día..."
        }
        actions={
          <>
            <Button variant="secondary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setModal({ open: true })}>
              Nuevo turno
            </Button>
            <ButtonLink href="/panel/pacientes/nuevo" icon={<UserPlus className="h-4 w-4" />}>
              Nuevo paciente
            </ButtonLink>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data ? (
          <>
            <Stat label="Pacientes" value={data.stats.patients} icon={<Users className="h-4 w-4" />} detail={data.stats.newThisMonth ? `${data.stats.newThisMonth} ${data.stats.newThisMonth === 1 ? "nuevo" : "nuevos"} este mes` : "En tu consultorio"} />
            <Stat label="Turnos hoy" value={data.stats.today} icon={<CalendarDays className="h-4 w-4" />} detail={data.upcoming[0] ? `Próximo: ${fmtDate(data.upcoming[0].startsAt, { year: undefined })}` : "Sin próximos turnos"} />
            <Stat label="Consultas del mes" value={data.stats.visitsThisMonth} icon={<Stethoscope className="h-4 w-4" />} detail="Evoluciones y turnos atendidos" />
            <Stat label="Con alertas" value={data.stats.withAlerts} icon={<HeartPulse className="h-4 w-4" />} detail="Valores fuera de rango" />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px]" />)
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            icon={<Clock className="h-4 w-4" />}
            title="Agenda de hoy"
            action={
              <Link href="/panel/agenda" className="text-sm font-medium text-leaf-700 hover:underline">
                Ver agenda
              </Link>
            }
          />
          {!data ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data.today.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Día libre de turnos"
              description="Agendá una consulta o aprovechá para revisar a los pacientes que necesitan seguimiento."
              action={
                <Button size="sm" variant="soft" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setModal({ open: true })}>
                  Agendar turno
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-900/[0.06]">
              {data.today.map((appointment) => (
                <AppointmentItem
                  key={appointment.id}
                  appointment={appointment}
                  onChange={load}
                  onDeleted={load}
                  onReschedule={(row) => setModal({ open: true, appointment: row })}
                />
              ))}
            </ul>
          )}
          {data && data.upcoming.length > 0 && (
            <div className="border-t border-ink-900/[0.06] px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Próximos</p>
              <ul className="mt-2 space-y-1.5">
                {data.upcoming.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/panel/pacientes/${row.patient.id}`} className="truncate text-ink-800 hover:underline">
                      {row.patient.fullName}
                    </Link>
                    <span className="shrink-0 text-xs text-ink-500">
                      {new Date(row.startsAt).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(row.startsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader icon={<AlertTriangle className="h-4 w-4" />} title="Requieren atención" subtitle="Alertas clínicas de la última medición" />
          {!data ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data.attention.length === 0 ? (
            <EmptyState title="Todo en orden" description="Ningún paciente tiene valores fuera de rango en sus últimos registros." />
          ) : (
            <ul className="divide-y divide-ink-900/[0.06]">
              {data.attention.map((patient) => (
                <PatientRow key={patient.id} patient={patient} detail={patient.topAlert?.title} tone={patient.topAlert?.tone === "high" ? "high" : "mid"} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Seguimiento pendiente" subtitle="Más de 60 días sin control y sin turno agendado" />
          {!data ? (
            <div className="p-4">
              <Skeleton className="h-12" />
            </div>
          ) : data.overdue.length === 0 ? (
            <EmptyState title="Sin pendientes" description="Todos tus pacientes tienen un control reciente o un turno próximo." />
          ) : (
            <ul className="divide-y divide-ink-900/[0.06]">
              {data.overdue.map((patient) => (
                <PatientRow key={patient.id} patient={patient} detail={`Último control: ${relativeDay(patient.lastVisit).toLowerCase()}`} />
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Actividad reciente"
            action={
              <Link href="/panel/pacientes" className="text-sm font-medium text-leaf-700 hover:underline">
                Ver todos
              </Link>
            }
          />
          {!data ? (
            <div className="p-4">
              <Skeleton className="h-12" />
            </div>
          ) : data.recent.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="Empezá cargando tu primer paciente"
              description="Con la ficha creada vas a poder registrar anamnesis, mediciones y armar su plan."
              action={
                <ButtonLink href="/panel/pacientes/nuevo" size="sm" icon={<UserPlus className="h-4 w-4" />}>
                  Nuevo paciente
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-900/[0.06]">
              {data.recent.map((patient) => (
                <PatientRow key={patient.id} patient={patient} detail={patient.lastVisit ? relativeDay(patient.lastVisit) : "Ficha creada, sin consultas"} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AppointmentModal open={modal.open} appointment={modal.appointment} onClose={() => setModal({ open: false })} onSaved={load} />
    </div>
  );
}

function PatientRow({ patient, detail, tone }: { patient: PatientSummary; detail?: string; tone?: "high" | "mid" }) {
  return (
    <li>
      <Link href={`/panel/pacientes/${patient.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-sand-50">
        <Avatar name={patient.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-950">{patient.fullName}</p>
          {detail && !tone && <p className="truncate text-xs text-ink-600">{detail}</p>}
          {detail && tone && (
            <Badge tone={tone} className="mt-1">
              {detail}
            </Badge>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-ink-500" />
      </Link>
    </li>
  );
}
