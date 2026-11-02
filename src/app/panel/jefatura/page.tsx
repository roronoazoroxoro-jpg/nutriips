"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Search, Shield, Users } from "lucide-react";
import { api } from "@/lib/client";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, CardHeader, Input, Modal, Spinner } from "@/components/ui";

type TeamRow = {
  id: string;
  name: string;
  title: string | null;
  role: string;
  license: string | null;
  patients: number;
  todayAppointments: number;
  todayPresent: number;
};

type ActivityRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
  actor: { id: string; name: string };
};

type DeptPatient = {
  id: string;
  fullName: string;
  dni: string | null;
  phone: string | null;
  diagnosis: string | null;
  nutritionist: { id: string; name: string } | null;
};

function actionLabel(action: string) {
  const map: Record<string, string> = {
    "patient.create": "Alta de paciente",
    "patient.update": "Actualizó paciente",
    "patient.delete": "Eliminó paciente",
    "patient.reassign": "Reasignó paciente",
    "appointment.create": "Agendó turno",
    "referral.create": "Creó derivación",
    "referral.update": "Actualizó derivación",
  };
  return map[action] || action;
}

export default function ChiefPanelPage() {
  const { user } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    nutritionists: 0,
    patients: 0,
    todayAppointments: 0,
    weekAppointments: 0,
    pendingReferrals: 0,
    todayPresent: 0,
    todayAbsent: 0,
  });
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<DeptPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [reassign, setReassign] = useState<DeptPatient | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{
        summary: typeof summary;
        team: TeamRow[];
        activity: ActivityRow[];
      }>("/api/admin/overview");
      setSummary(data.summary);
      setTeam(data.team);
      setActivity(data.activity);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && user.role !== "chief") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function searchPatients(event?: FormEvent) {
    event?.preventDefault();
    setSearching(true);
    try {
      const data = await api<{ patients: DeptPatient[] }>(`/api/admin/patients?q=${encodeURIComponent(query)}`);
      setPatients(data.patients);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  if (user && user.role !== "chief") {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <Shield className="mx-auto h-8 w-8 text-ink-400" />
        <h1 className="mt-3 font-display text-xl font-semibold">Solo jefatura</h1>
        <p className="mt-2 text-sm text-ink-600">Este panel es exclusivo de la Jefa del Departamento de Nutrición.</p>
        <Link href="/panel" className="mt-5 inline-flex rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white">
          Volver al inicio
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf-700">Administración</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-950">Panel de jefatura</h1>
        <p className="mt-1 text-sm text-ink-600">
          Control del departamento · {user?.name || "Melgarejo María Laura"}
          {user?.license ? ` · M.P. ${user.license}` : ""}
        </p>
      </div>

      {loading ? (
        <Spinner label="Cargando resumen del departamento…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Equipo</p>
              <p className="mt-1 font-display text-2xl font-semibold">{summary.nutritionists}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Pacientes</p>
              <p className="mt-1 font-display text-2xl font-semibold">{summary.patients}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Turnos hoy</p>
              <p className="mt-1 font-display text-2xl font-semibold">{summary.todayAppointments}</p>
              <p className="mt-1 text-xs text-ink-500">
                {summary.todayPresent} presentes · {summary.todayAbsent} ausentes
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Derivaciones pendientes</p>
              <p className="mt-1 font-display text-2xl font-semibold">{summary.pendingReferrals}</p>
              <Link href="/panel/compartido" className="mt-1 inline-block text-xs font-semibold text-leaf-700 hover:underline">
                Ir al panel compartido
              </Link>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader icon={<Users className="h-4 w-4" />} title="Equipo" subtitle="Pacientes a cargo y agenda de hoy" />
              <ul className="divide-y divide-ink-900/[0.05] px-2 pb-2">
                {team.map((person) => (
                  <li key={person.id} className="flex items-center gap-3 px-2 py-3">
                    <Avatar name={person.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-950">
                        {person.name}
                        {person.role === "chief" ? " · Jefa" : ""}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {person.title || "Lic. en Nutrición"}
                        {person.license ? ` · M.P. ${person.license}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-ink-600">
                      <p>
                        <span className="font-semibold text-ink-950">{person.patients}</span> pacientes
                      </p>
                      <p>
                        <span className="font-semibold text-ink-950">{person.todayAppointments}</span> turnos hoy
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader icon={<Activity className="h-4 w-4" />} title="Actividad reciente" subtitle="Qué se hizo en el sistema" />
              <ul className="max-h-[28rem] space-y-3 overflow-y-auto px-4 pb-4">
                {activity.length === 0 && <li className="py-6 text-center text-sm text-ink-500">Todavía no hay actividad registrada.</li>}
                {activity.map((row) => (
                  <li key={row.id} className="rounded-xl bg-sand-50/80 px-3 py-2.5">
                    <p className="text-sm font-medium text-ink-950">{actionLabel(row.action)}</p>
                    <p className="mt-0.5 text-xs text-ink-600">
                      {row.actor.name}
                      {row.detail ? ` · ${safeDetail(row.detail)}` : ""}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-400">
                      {new Date(row.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <CardHeader
              icon={<Search className="h-4 w-4" />}
              title="Pacientes del departamento"
              subtitle="Buscá y reasigná titularidad entre nutricionistas"
              action={
                <form onSubmit={searchPatients} className="flex gap-2">
                  <Input label="" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, DNI o teléfono" className="min-w-[14rem]" />
                  <Button type="submit" loading={searching}>
                    Buscar
                  </Button>
                </form>
              }
            />
            <div className="overflow-x-auto px-4 pb-4">
              {patients.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">Buscá para ver pacientes de todo el departamento.</p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Paciente</th>
                      <th className="py-2 pr-3 font-semibold">Contacto</th>
                      <th className="py-2 pr-3 font-semibold">Titular</th>
                      <th className="py-2 font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id} className="border-t border-ink-900/[0.06]">
                        <td className="py-2.5 pr-3">
                          <Link href={`/panel/pacientes/${patient.id}`} className="font-medium text-ink-950 hover:text-leaf-700">
                            {patient.fullName}
                          </Link>
                          <p className="text-xs text-ink-500">{patient.diagnosis || "Sin diagnóstico cargado"}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-600">
                          {[patient.phone, patient.dni && `DNI ${patient.dni}`].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge tone="neutral">{patient.nutritionist?.name || "Sin asignar"}</Badge>
                        </td>
                        <td className="py-2.5">
                          <Button size="sm" variant="secondary" onClick={() => setReassign(patient)}>
                            Reasignar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}

      <ReassignModal
        patient={reassign}
        team={team}
        onClose={() => setReassign(null)}
        onSaved={() => {
          setReassign(null);
          searchPatients();
          load();
        }}
      />
    </div>
  );
}

function safeDetail(raw: string) {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.fullName) return String(data.fullName);
    return Object.values(data)
      .filter((v) => v != null && String(v).length < 60)
      .slice(0, 2)
      .join(" · ");
  } catch {
    return raw.slice(0, 80);
  }
}

function ReassignModal({
  patient,
  team,
  onClose,
  onSaved,
}: {
  patient: DeptPatient | null;
  team: TeamRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [nutritionistId, setNutritionistId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNutritionistId(patient?.nutritionist?.id || "");
  }, [patient]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!patient || !nutritionistId) return;
    setLoading(true);
    try {
      await api("/api/admin/patients", { method: "PATCH", json: { patientId: patient.id, nutritionistId } });
      toast.success("Paciente reasignado");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={Boolean(patient)} onClose={onClose} title="Reasignar paciente" description={patient?.fullName} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink-800">Nueva titular</span>
          <select className="input" value={nutritionistId} onChange={(e) => setNutritionistId(e.target.value)} required>
            <option value="">Elegí nutricionista…</option>
            {team.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
