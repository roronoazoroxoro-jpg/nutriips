"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, FolderKanban, UserPlus } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, CardHeader, Input, Modal, Spinner } from "@/components/ui";

type TeamMember = { id: string; name: string; title: string | null; role: string; license: string | null; avatarUrl?: string | null };
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

const ACTOR_KEY = "nutriips_shared_actor";

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

function patientOpenHref(patientId: string) {
  return `/?next=${encodeURIComponent(`/panel/pacientes/${patientId}`)}`;
}

export function SharedBoard({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast();
  const [date, setDate] = useState(todayIso);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [unassigned, setUnassigned] = useState<Referral[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [totals, setTotals] = useState({ referrals: 0, appointments: 0, pending: 0 });
  const [actorId, setActorId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [prefillAssigneeId, setPrefillAssigneeId] = useState("");
  const [assignOpen, setAssignOpen] = useState<Referral | null>(null);
  const [profileOpen, setProfileOpen] = useState<TeamMember | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ACTOR_KEY) || "";
      if (saved) setActorId(saved);
    } catch {
      /* ignore */
    }
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const id = data?.user?.id as string | undefined;
        if (id) persistActor(id);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistActor(id: string) {
    setActorId(id);
    try {
      if (id) window.localStorage.setItem(ACTOR_KEY, id);
      else window.localStorage.removeItem(ACTOR_KEY);
    } catch {
      /* ignore */
    }
  }

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
      if (actorId && !teamData.team.some((person) => person.id === actorId)) persistActor("");
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

  const actor = team.find((person) => person.id === actorId) || null;

  function ensureActor() {
    if (!actorId) {
      toast.error("Primero indicá quién sos (arriba). No hace falta clave.");
      return false;
    }
    return true;
  }

  async function updateStatus(referralId: string, status: string) {
    if (!ensureActor()) return;
    try {
      await api(`/api/shared/referrals/${referralId}`, { method: "PATCH", json: { status, actorId } });
      toast.success("Estado actualizado");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf-700">Departamento</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-950">Panel compartido</h1>
          <p className="mt-1 text-sm text-ink-600">Turnos y derivaciones del equipo · {dayLabel}. Sin clave para ver y asignar.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-800">Estoy operando como</span>
            <select className="input min-w-[16rem]" value={actorId} onChange={(e) => persistActor(e.target.value)}>
              <option value="">Elegí tu nombre…</option>
              {team.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.role === "chief" ? " (Jefa)" : ""}
                </option>
              ))}
            </select>
          </label>
          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button
            icon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => {
              if (!ensureActor()) return;
              setCreateOpen(true);
            }}
          >
            Nueva derivación
          </Button>
        </div>
      </div>

      {actor && (
        <p className="rounded-xl bg-leaf-50 px-3 py-2 text-sm text-leaf-800">
          Operando como <strong>{actor.name}</strong>. Tocá el perfil de una nutricionista para derivarle un turno o cambiar asignación. Ella recibe aviso y el paciente queda en su consultorio.
        </p>
      )}

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
                          <p className="text-xs text-ink-500">
                            {[row.dni && `DNI ${row.dni}`, row.affiliateNumber && `Carnet ${row.affiliateNumber}`].filter(Boolean).join(" · ")}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-600">{row.phone || "—"}</td>
                        <td className="py-2.5 pr-3 text-ink-600">{row.reason || "—"}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={STATUS_TONE[row.status] || "neutral"}>{row.status}</Badge>
                        </td>
                        <td className="py-2.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (!ensureActor()) return;
                              setAssignOpen(row);
                            }}
                          >
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
                  .filter(
                    (a) =>
                      !column.referrals.some(
                        (r) =>
                          r.patient?.id === a.patient.id &&
                          r.scheduledAt &&
                          Math.abs(new Date(r.scheduledAt).getTime() - new Date(a.startsAt).getTime()) < 60_000
                      )
                  )
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
                  <button
                    type="button"
                    onClick={() => {
                      if (!ensureActor()) return;
                      setProfileOpen(column.nutritionist);
                    }}
                    className="flex w-full items-center gap-3 border-b border-ink-900/[0.06] bg-sand-50/80 px-4 py-3 text-left transition hover:bg-leaf-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-leaf-400"
                    title={`Derivar o gestionar turnos de ${column.nutritionist.name}`}
                  >
                    <Avatar name={column.nutritionist.name} src={column.nutritionist.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-950">{column.nutritionist.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {column.nutritionist.role === "chief" ? "Jefa · " : ""}
                        {column.nutritionist.title || "Lic. en Nutrición"}
                        {column.nutritionist.license ? ` · M.P. ${column.nutritionist.license}` : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-leaf-700">Tocá para derivar / gestionar</p>
                    </div>
                    <Badge tone="neutral">{rows.length}</Badge>
                  </button>
                  {rows.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-ink-500">Sin turnos ni derivaciones en este día.</p>
                      <Button
                        size="sm"
                        className="mt-3"
                        icon={<CalendarPlus className="h-4 w-4" />}
                        onClick={() => {
                          if (!ensureActor()) return;
                          setPrefillAssigneeId(column.nutritionist.id);
                          setCreateOpen(true);
                        }}
                      >
                        Derivar a {column.nutritionist.name.split(/\s+/)[0]}
                      </Button>
                    </div>
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
                              <td className="space-x-2 px-4 py-2.5 text-right">
                                {row.referral && (
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-ink-600 hover:underline"
                                    onClick={() => {
                                      if (!ensureActor()) return;
                                      setAssignOpen(row.referral);
                                    }}
                                  >
                                    Reasignar
                                  </button>
                                )}
                                {row.patientId ? (
                                  <Link
                                    href={embedded ? `/panel/pacientes/${row.patientId}` : patientOpenHref(row.patientId)}
                                    className="text-xs font-semibold text-leaf-700 hover:underline"
                                  >
                                    Abrir ficha
                                  </Link>
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
        onClose={() => {
          setCreateOpen(false);
          setPrefillAssigneeId("");
        }}
        team={team}
        actorId={actorId}
        defaultDate={date}
        defaultAssigneeId={prefillAssigneeId}
        onSaved={() => {
          setCreateOpen(false);
          setPrefillAssigneeId("");
          load();
        }}
      />
      <AssignReferralModal
        referral={assignOpen}
        team={team}
        actorId={actorId}
        onClose={() => setAssignOpen(null)}
        onSaved={() => {
          setAssignOpen(null);
          load();
        }}
      />
      <NutriProfileModal
        person={profileOpen}
        unassigned={unassigned}
        onClose={() => setProfileOpen(null)}
        onNewReferral={() => {
          if (!profileOpen) return;
          setPrefillAssigneeId(profileOpen.id);
          setProfileOpen(null);
          setCreateOpen(true);
        }}
        onAssignPending={(referral) => {
          const target = profileOpen;
          setProfileOpen(null);
          setAssignOpen({
            ...referral,
            assignedTo: target ? { id: target.id, name: target.name } : referral.assignedTo,
          });
        }}
      />
    </div>
  );
}

function NutriProfileModal({
  person,
  unassigned,
  onClose,
  onNewReferral,
  onAssignPending,
}: {
  person: TeamMember | null;
  unassigned: Referral[];
  onClose: () => void;
  onNewReferral: () => void;
  onAssignPending: (referral: Referral) => void;
}) {
  return (
    <Modal
      open={Boolean(person)}
      onClose={onClose}
      title={person?.name || "Nutricionista"}
      description={person ? `${person.role === "chief" ? "Jefa · " : ""}${person.title || "Lic. en Nutrición"}` : undefined}
      size="sm"
    >
      {person && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-sand-50 px-3 py-3">
            <Avatar name={person.name} src={person.avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="font-semibold text-ink-950">{person.name}</p>
              <p className="text-xs text-ink-500">{person.license ? `M.P. ${person.license}` : "Sin matrícula cargada"}</p>
            </div>
          </div>
          <Button className="w-full" icon={<CalendarPlus className="h-4 w-4" />} onClick={onNewReferral}>
            Derivar turno / paciente a {person.name.split(/\s+/).slice(0, 2).join(" ")}
          </Button>
          {unassigned.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Pendientes para asignarle</p>
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {unassigned.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink-900/10 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-950">{row.fullName}</p>
                      <p className="truncate text-xs text-ink-500">{row.reason || "Sin motivo"}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => onAssignPending(row)}>
                      Asignar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      )}
    </Modal>
  );
}

function CreateReferralModal({
  open,
  onClose,
  team,
  actorId,
  defaultDate,
  defaultAssigneeId = "",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  team: TeamMember[];
  actorId: string;
  defaultDate: string;
  defaultAssigneeId?: string;
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
        assignedToId: defaultAssigneeId || "",
        scheduledAt: `${defaultDate}T09:00`,
      });
    }
  }, [open, defaultDate, defaultAssigneeId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!actorId) return toast.error("Indicá quién sos arriba");
    setLoading(true);
    try {
      await api("/api/shared/referrals", {
        method: "POST",
        json: {
          ...form,
          actorId,
          assignedToId: form.assignedToId || null,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        },
      });
      toast.success(form.assignedToId ? "Asignado · la nutricionista ya fue notificada" : "Derivación creada");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva derivación" description="Cargá el paciente y asignalo a cualquier nutricionista del equipo." size="lg">
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
          <select className="input" value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
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
  actorId,
  onClose,
  onSaved,
}: {
  referral: Referral | null;
  team: TeamMember[];
  actorId: string;
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
    if (!actorId) return toast.error("Indicá quién sos arriba");
    if (!assignedToId) return toast.error("Elegí una nutricionista");
    setLoading(true);
    try {
      await api(`/api/shared/referrals/${referral.id}`, {
        method: "PATCH",
        json: {
          actorId,
          assignedToId,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : referral.scheduledAt,
          status: "asignado",
        },
      });
      toast.success("Asignado · la nutricionista fue notificada y ya puede abrir la ficha");
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
                {person.role === "chief" ? " (Jefa)" : ""}
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
