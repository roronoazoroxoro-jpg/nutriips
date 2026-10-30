"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarPlus,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LineChart as LineIcon,
  MoreHorizontal,
  Pencil,
  Printer,
  Ruler,
  Salad,
  Scale,
  Stethoscope,
  Trash2,
  Phone,
  Mail,
} from "lucide-react";
import { api } from "@/lib/client";
import { diabetesLabel, fmtDateTime, toDateInput } from "@/lib/format";
import { AppointmentModal } from "../AppointmentModal";
import { PatientForm, toPatientPayload } from "../PatientForm";
import { useToast } from "../toast";
import { Avatar, Badge, Button, ConfirmDialog, Modal, Spinner, Tabs, cx } from "../ui";
import type { Patient, RecordKind, RemoveFn, SaveFn } from "./shared";
import { SummaryTab } from "./SummaryTab";
import { EvolutionTab } from "./EvolutionTab";
import { NotesTab } from "./NotesTab";
import { AnamnesisTab } from "./AnamnesisTab";
import { IsakTab } from "./IsakTab";
import { OmronTab } from "./OmronTab";
import { LabsTab } from "./LabsTab";
import { PlanTab } from "./PlanTab";

const TABS = [
  { key: "resumen", label: "Resumen", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "evolucion", label: "Evolución", icon: <LineIcon className="h-4 w-4" /> },
  { key: "consultas", label: "Consultas", icon: <Stethoscope className="h-4 w-4" /> },
  { key: "anamnesis", label: "Anamnesis", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "isak", label: "Antropometría", icon: <Ruler className="h-4 w-4" /> },
  { key: "omron", label: "Bioimpedancia", icon: <Scale className="h-4 w-4" /> },
  { key: "laboratorio", label: "Glucosa y laboratorio", icon: <FlaskConical className="h-4 w-4" /> },
  { key: "plan", label: "Plan alimentario", icon: <Salad className="h-4 w-4" /> },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

const LABELS: Record<RecordKind, string> = {
  anamnesis: "Anamnesis guardada",
  isak: "Medición antropométrica guardada",
  omron: "Lectura de bioimpedancia guardada",
  glucose: "Glucemia registrada",
  meal: "Comida registrada",
  lab: "Laboratorio guardado",
  plan: "Plan alimentario guardado",
  note: "Evolución guardada",
};

export function PatientWorkspace({ patientId }: { patientId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTabState] = useState<TabKey>("resumen");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "") as TabKey;
      if (TABS.some((t) => t.key === hash)) setTabState(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const setTab = useCallback((key: TabKey) => {
    setTabState(key);
    history.replaceState(null, "", `#${key}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api<{ patient: Patient }>(`/api/patients/${patientId}`);
      setPatient(data.patient);
    } catch (err) {
      if ((err as { status?: number }).status === 404) setMissing(true);
      else toast.error((err as Error).message);
    }
  }, [patientId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save: SaveFn = async (kind, payload, measuredAt, message) => {
    try {
      const data = await api<{ patient: Patient }>(`/api/patients/${patientId}/records`, { method: "POST", json: { kind, payload, measuredAt } });
      setPatient(data.patient);
      toast.success(message ?? LABELS[kind]);
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    }
  };

  const remove: RemoveFn = async (kind, recordId) => {
    try {
      const data = await api<{ patient: Patient }>(`/api/patients/${patientId}/records?kind=${kind}&recordId=${recordId}`, { method: "DELETE" });
      setPatient(data.patient);
      toast.success("Registro eliminado");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (missing) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Paciente no encontrado</p>
        <p className="mt-1 text-sm text-ink-600">Puede que la ficha se haya eliminado.</p>
        <Link href="/panel/pacientes" className="mt-4 inline-block text-sm font-medium text-leaf-700 hover:underline">
          Volver a pacientes
        </Link>
      </div>
    );
  }
  if (!patient) return <Spinner label="Abriendo ficha..." />;

  const next = patient.appointments.find((a) => a.status === "programado" && new Date(a.startsAt).getTime() > Date.now());
  const highAlerts = patient.alerts.filter((a) => a.tone === "high" || a.tone === "mid").length;

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/panel/pacientes" className="no-print inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" />
        Pacientes
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={patient.fullName} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-ink-950 md:text-3xl">{patient.fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
              <span>{[patient.age != null ? `${patient.age} años` : null, patient.sex === "femenino" ? "Femenino" : "Masculino", patient.heightCm ? `${patient.heightCm} cm` : null, patient.dni ? `DNI ${patient.dni}` : null].filter(Boolean).join(" · ")}</span>
              {patient.phone && (
                <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 hover:text-ink-900">
                  <Phone className="h-3.5 w-3.5" />
                  {patient.phone}
                </a>
              )}
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1 hover:text-ink-900">
                  <Mail className="h-3.5 w-3.5" />
                  {patient.email}
                </a>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {patient.diabetesType !== "ninguna" && <Badge tone="info">{diabetesLabel(patient.diabetesType)}</Badge>}
              {(patient.diagnosisCodes ?? []).slice(0, 4).map((item) => (
                <span key={item.code} title={item.description}>
                  <Badge tone="neutral">{item.code}</Badge>
                </span>
              ))}
              {highAlerts > 0 && <Badge tone="mid">{highAlerts} {highAlerts === 1 ? "alerta" : "alertas"}</Badge>}
              {next && <Badge tone="good">Próximo turno: {fmtDateTime(next.startsAt)}</Badge>}
            </div>
          </div>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setAppointmentOpen(true)}>
            Turno
          </Button>
          <Link
            href={`/imprimir/${patient.id}/informe`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-semibold text-ink-900 shadow-sm hover:bg-sand-50"
          >
            <FileText className="h-4 w-4" />
            Informe
          </Link>
          <Link
            href={`/imprimir/${patient.id}/plan`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-ink-800"
          >
            <Printer className="h-4 w-4" />
            Plan para el paciente
          </Link>
          <div className="relative">
            <Button variant="ghost" onClick={() => setMenu((v) => !v)} aria-label="Más acciones" className="px-2.5">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-11 z-20 w-48 animate-fade-in overflow-hidden rounded-xl border border-ink-900/10 bg-white py-1 text-sm shadow-lift">
                  <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-sand-50" onClick={() => { setMenu(false); setEditing(true); }}>
                    <Pencil className="h-4 w-4" /> Editar ficha
                  </button>
                  <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-red-600 hover:bg-red-50" onClick={() => { setMenu(false); setDeleting(true); }}>
                    <Trash2 className="h-4 w-4" /> Eliminar paciente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="no-print">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div key={tab} className={cx("animate-fade-in")}>
        {tab === "resumen" && <SummaryTab patient={patient} goTo={setTab} />}
        {tab === "evolucion" && <EvolutionTab patient={patient} />}
        {tab === "consultas" && <NotesTab patient={patient} save={save} remove={remove} />}
        {tab === "anamnesis" && <AnamnesisTab patient={patient} save={save} remove={remove} />}
        {tab === "isak" && <IsakTab patient={patient} save={save} remove={remove} />}
        {tab === "omron" && <OmronTab patient={patient} save={save} remove={remove} />}
        {tab === "laboratorio" && <LabsTab patient={patient} save={save} remove={remove} />}
        {tab === "plan" && <PlanTab patient={patient} save={save} remove={remove} />}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar ficha" description={patient.fullName} size="lg">
        <PatientForm
          initial={{
            fullName: patient.fullName,
            dni: patient.dni ?? "",
            sex: patient.sex,
            birthDate: patient.birthDate ?? "",
            heightCm: patient.heightCm != null ? String(patient.heightCm) : "",
            phone: patient.phone ?? "",
            email: patient.email ?? "",
            occupation: patient.occupation ?? "",
            diabetesType: patient.diabetesType,
            diagnosis: patient.diagnosis ?? "",
            diagnosisCodes: patient.diagnosisCodes ?? [],
          }}
          submitLabel="Guardar cambios"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            const data = await api<{ patient: Patient }>(`/api/patients/${patient.id}`, { method: "PATCH", json: toPatientPayload(values) });
            setPatient(data.patient);
            setEditing(false);
            toast.success("Ficha actualizada");
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleting}
        title="Eliminar paciente"
        description={
          <>
            Se va a eliminar la ficha de <strong>{patient.fullName}</strong> con todas sus consultas, mediciones, planes y turnos. Esta acción no se puede deshacer.
            <br />
            <br />
            Si querés conservar una copia, descargá antes un respaldo desde Ajustes.
          </>
        }
        confirmLabel="Eliminar definitivamente"
        loading={deleteBusy}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          setDeleteBusy(true);
          try {
            await api(`/api/patients/${patient.id}`, { method: "DELETE" });
            toast.success("Paciente eliminado");
            router.push("/panel/pacientes");
          } catch (err) {
            toast.error((err as Error).message);
            setDeleteBusy(false);
          }
        }}
      />

      <AppointmentModal
        open={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
        patient={{ id: patient.id, fullName: patient.fullName }}
        defaultDate={new Date(`${toDateInput(new Date(Date.now() + 7 * 86_400_000))}T00:00:00`)}
        onSaved={load}
      />
    </div>
  );
}
