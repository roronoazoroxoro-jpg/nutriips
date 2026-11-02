"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, FolderKanban, UserPlus } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, CardHeader, Input, Modal, Spinner, cx } from "@/components/ui";

type TeamMember = { id: string; name: string; title: string | null; role: string; license: string | null };
type Referral = {
  id: string;
  fullName: string;
  dni: string | null;
  phone: string | null;
  affiliateNumber: string | null;
  birthDate: string | null;
  reason: string | null;
  status: string;
  scheduledAt: string | null;
  durationMin: number;
  assignedTo: { id: string; name: string } | null;
  patient: { id: string; fullName: string } | null;
};
type Appointment = {
  id: string;
  startsAt: string;
  durationMin: number;
  reason: string | null;
  status: string;
  patient: { id: string; fullName: string; phone: string | null; dni: string | null };
};
type BoardColumn = {
  nutritionist: TeamMember;
  referrals: Referral[];
  appointments: Appointment[];
};

const STATUS_TONE: Record<string, "good" | "mid" | "high" | "neutral" | "info"> = {
  pendiente: "mid",
  asignado: "good",
  presente: "good",
  ausente: "high",
  cancelado: "neutral",
  programado: "mid",
  atendido: "good",
};

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function localDateTimeValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SharedPanelPage() {
  const toast = useToast();
  const [date, setDate] = useState(todayIso);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [unassigned, setUnassigned] = useState<Referral[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [totals, setTotals] = useState({ referrals: 0, appointments: 0, pending: 0 });
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<Referral | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [board, teamData] = await Promise.all([
        api<{ columns: BoardColumn[]; unassigned: Referral[]; totals: typeof totals }>(`/api/shared/board?date=${date}`),
        api<{ team: TeamMember[] }>("/api/shared/team"),
      ]);
      setColumns(board.columns);
      setUnassigned(board.unassigned);
      setTotals(board.totals);
      setTeam(teamData.team);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const dayLabel = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  }, [date]);

  async function updateStatus(referralId: string, status: string) {
    try {
      await api(`/api/shared/referrals/${referralId}`, { method: "PATCH", json: { status } });
      toast.success("Estado actualizado");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf-700">Departamento</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-950">Panel compartido</h1>
          <p className="mt-1 text-sm text-ink-600">Turnos y derivaciones del equipo · {dayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Nueva derivación
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Derivaciones del día</p>
          <p className="mt-1 font-display text-2xl font-semibold">{totals.referrals}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Turnos agendados</p>
          <p className="mt-1 font-display text-2xl font-semibold">{totals.appointments}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Pendientes de asignar</p>
          <p className="mt-1 font-display text-2xl font-semibold">{totals.pending}</p>
        </Card>
      </div>

      {loading ? (
        <Spinner label="Cargando tablero del departamento…" />
      ) : (
        <div className="space-y-6">
          {unassigned.length > 0 && (
            <Card>
              <CardHeader icon={<FolderKanban className="h-4 w-4" />} title="Sin asignar" subtitle="Derivaciones pendientes de nutricionista" />
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Hora</th>
                      <th className="py-2 pr-3 font-semibold">Paciente</th>
                      <th className="py-2 pr-3 font-semibold">Contacto</th>
                      <th className="py-2 pr-3 font-semibold">Motivo</th>
                      <th className="py-2 pr-3 font-semibold">Estado</th>
                      <th className="py-2 font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassigned.map((row) => (
                      <tr key={row.id} className="border-t border-ink-900/[0.06]">
                        <td className="py-2.5 pr-3 font-medium">{fmtTime(row.scheduledAt)}</td>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-ink-950">{row.fullName}</p>
                          <p className="text-xs text-ink-500">{[row.dni && `DNI ${row.dni}`, row.affiliateNumber && `Carnet ${row.affiliateNumber}`].filter(Boolean).join(" · ")}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-600">{row.phone || "—"}</td>
                        <td className="py-2.5 pr-3 text-ink-600">{row.reason || "—"}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={STATUS_TONE[row.status] || "neutral"}>{row.status}</Badge>
                        </td>
                        <td className="py-2.5">
                          <Button size="sm" variant="secondary" onClick={() => setAssignOpen(row)}>
                            Asignar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {columns.map((column) => {
              const rows = [
                ...column.referrals.map((r) => ({
                  key: `ref-${r.id}`,
                  time: r.scheduledAt,
                  name: r.fullName,
                  phone: r.phone,
                  dni: r.dni,
                  reason: r.reason,
                  status: r.status,
                  patientId: r.patient?.id,
                  referral: r,
                })),
                ...column.appointments
                  .filter((a) => !column.referrals.some((r) => r.patient?.id === a.patient.id && r.scheduledAt && Math.abs(new Date(r.scheduledAt).getTime() - new Date(a.startsAt).getTime()) < 60_000))
                  .map((a) => ({
                    key: `appt-${a.id}`,
                    time: a.startsAt,
                    name: a.patient.fullName,
                    phone: a.patient.phone,
                    dni: a.patient.dni,
                    reason: a.reason,
                    status: a.status,
                    patientId: a.patient.id,
                    referral: null as Referral | null,
                  })),
              ].sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());

              return (
                <Card key={column.nutritionist.id} className="overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-ink-900/[0.06] bg-sand-50/80 px-4 py-3">
                    <Avatar name={column.nutritionist.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-950">{column.nutritionist.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {column.nutritionist.role === "chief" ? "Jefa · " : ""}
                        {column.nutritionist.title || "Lic. en Nutrición"}
                        {column.nutritionist.license ? ` · M.P. ${column.nutritionist.license}` : ""}
                      </p>
                    </div>
                    <Badge tone="neutral">{rows.length}</Badge>
                  </div>
                  {rows.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-ink-500">Sin turnos ni derivaciones en este día.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wide text-ink-500">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Hora</th>
                            <th className="px-2 py-2 font-semibold">Paciente</th>
                            <th className="px-2 py-2 font-semibold">Motivo</th>
                            <th className="px-2 py-2 font-semibold">Estado</th>
                            <th className="px-4 py-2 font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.key} className="border-t border-ink-900/[0.05]">
                              <td className="px-4 py-2.5 font-medium tabular-nums">{fmtTime(row.time)}</td>
                              <td className="px-2 py-2.5">
                                <p className="font-medium text-ink-950">{row.name}</p>
                                <p className="text-xs text-ink-500">{[row.phone, row.dni && `DNI ${row.dni}`].filter(Boolean).join(" · ")}</p>
                              </td>
                              <td className="px-2 py-2.5 text-ink-600">{row.reason || "—"}</td>
                              <td className="px-2 py-2.5">
                                {row.referral ? (
                                  <select
                                    className="rounded-lg border border-ink-900/10 bg-white px-2 py-1 text-xs"
                                    value={row.status}
                                    onChange={(e) => updateStatus(row.referral!.id, e.target.value)}
                                  >
                                    {["pendiente", "asignado", "presente", "ausente", "cancelado"].map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Badge tone={STATUS_TONE[row.status] || "neutral"}>{row.status}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {row.patientId ? (
                                  <Link href={`/panel/pacientes/${row.patientId}`} className="text-xs font-semibold text-leaf-700 hover:underline">
                                    Abrir
                                  </Link>
                                ) : row.referral ? (
                                  <button type="button" className="text-xs font-semibold text-leaf-700 hover:underline" onClick={() => setAssignOpen(row.referral)}>
                                    Asignar
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <CreateReferralModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        team={team}
        defaultDate={date}
        onSaved={() => {
          setCreateOpen(false);
          load();
        }}
      />
      <AssignReferralModal
        referral={assignOpen}
        team={team}
        onClose={() => setAssignOpen(null)}
        onSaved={() => {
          setAssignOpen(null);
          load();
        }}
      />
    </div>
  );
}

function CreateReferralModal({
  open,
  onClose,
  team,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  team: TeamMember[];
  defaultDate: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    dni: "",
    phone: "",
    affiliateNumber: "",
    birthDate: "",
    reason: "",
    notes: "",
    assignedToId: "",
    scheduledAt: `${defaultDate}T09:00`,
  });

  useEffect(() => {
    if (open) {
      setForm({
        fullName: "",
        dni: "",
        phone: "",
        affiliateNumber: "",
        birthDate: "",
        reason: "",
        notes: "",
        assignedToId: "",
        scheduledAt: `${defaultDate}T09:00`,
      });
    }
  }, [open, defaultDate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await api("/api/shared/referrals", {
        method: "POST",
        json: {
          ...form,
          assignedToId: form.assignedToId || null,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        },
      });
      toast.success(form.assignedToId ? "Derivación asignada" : "Derivación creada");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva derivación" description="Cargá el paciente y asignalo a una nutricionista del equipo." size="lg">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Input label="Paciente" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required className="sm:col-span-2" />
        <Input label="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
        <Input label="Nº carnet afiliado" value={form.affiliateNumber} onChange={(e) => setForm({ ...form, affiliateNumber: e.target.value })} />
        <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Fecha de nacimiento" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} placeholder="DD/MM/AAAA" />
        <Input label="Motivo de consulta" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="sm:col-span-2" />
        <Input label="Fecha y hora" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink-800">Asignar a</span>
          <select
            className="input"
            value={form.assignedToId}
            onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
          >
            <option value="">Sin asignar todavía</option>
            {team.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.role === "chief" ? " (Jefa)" : ""}
              </option>
            ))}
          </select>
        </label>
        <Input label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" />
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<UserPlus className="h-4 w-4" />}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignReferralModal({
  referral,
  team,
  onClose,
  onSaved,
}: {
  referral: Referral | null;
  team: TeamMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [assignedToId, setAssignedToId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    if (referral) {
      setAssignedToId(referral.assignedTo?.id || "");
      setScheduledAt(localDateTimeValue(referral.scheduledAt));
    }
  }, [referral]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!referral) return;
    if (!assignedToId) return toast.error("Elegí una nutricionista");
    setLoading(true);
    try {
      await api(`/api/shared/referrals/${referral.id}`, {
        method: "PATCH",
        json: {
          assignedToId,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : referral.scheduledAt,
          status: "asignado",
        },
      });
      toast.success("Asignación guardada · se notificó a la nutricionista");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={Boolean(referral)} onClose={onClose} title="Asignar derivación" description={referral?.fullName} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink-800">Nutricionista</span>
          <select className="input" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} required>
            <option value="">Elegí…</option>
            {team.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Fecha y hora" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Asignar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
