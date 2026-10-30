"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { AppointmentRow } from "@/lib/appointments";
import type { PatientSummary } from "@/lib/patient";
import { toDateInput, toTimeInput } from "@/lib/format";
import { Button, Input, Modal, Select } from "./ui";
import { useToast } from "./toast";

export function AppointmentModal({
  open,
  onClose,
  onSaved,
  patient,
  appointment,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (appointment: AppointmentRow) => void;
  patient?: { id: string; fullName: string };
  appointment?: AppointmentRow | null;
  defaultDate?: Date;
}) {
  const toast = useToast();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("45");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (appointment) {
      setPatientId(appointment.patient.id);
      setDate(toDateInput(appointment.startsAt));
      setTime(toTimeInput(appointment.startsAt));
      setDuration(String(appointment.durationMin));
      setReason(appointment.reason ?? "");
    } else {
      setPatientId(patient?.id ?? "");
      const base = defaultDate ?? new Date();
      setDate(toDateInput(base));
      setTime(defaultDate && defaultDate.getHours() > 0 ? toTimeInput(defaultDate) : "09:00");
      setDuration("45");
      setReason("");
    }
    if (!patient && !appointment) {
      api<{ patients: PatientSummary[] }>("/api/patients")
        .then((data) => setPatients(data.patients))
        .catch(() => setPatients([]));
    }
  }, [open, appointment?.id, patient?.id, defaultDate?.getTime()]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!patientId) return setError("Elegí el paciente");
    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) return setError("Revisá la fecha y la hora");
    setLoading(true);
    try {
      const json = { patientId, startsAt: startsAt.toISOString(), durationMin: Number(duration), reason };
      const data = appointment
        ? await api<{ appointment: AppointmentRow }>(`/api/appointments/${appointment.id}`, { method: "PATCH", json })
        : await api<{ appointment: AppointmentRow }>("/api/appointments", { method: "POST", json });
      toast.success(appointment ? "Turno reprogramado" : "Turno agendado");
      onSaved(data.appointment);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const fixedName = appointment?.patient.fullName ?? patient?.fullName;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={appointment ? "Reprogramar turno" : "Nuevo turno"}
      description={fixedName}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="appointment-form" loading={loading}>
            {appointment ? "Guardar cambios" : "Agendar"}
          </Button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={submit} className="space-y-3">
        {!fixedName && (
          <Select label="Paciente" value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
            <option value="">Elegir paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </Select>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Hora" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <Select label="Duración" value={duration} onChange={(e) => setDuration(e.target.value)}>
          {[20, 30, 45, 60, 90].map((min) => (
            <option key={min} value={min}>
              {min} minutos
            </option>
          ))}
        </Select>
        <Input label="Motivo" placeholder="Primera consulta, control, entrega de plan..." value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>
    </Modal>
  );
}
