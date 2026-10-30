"use client";

import { useState } from "react";
import type { Cie10Selection } from "@/lib/cie10-shared";
import { Cie10Picker } from "./Cie10Picker";
import { Button, Input, Select, Textarea } from "./ui";

export type PatientFormValues = {
  fullName: string;
  dni: string;
  sex: string;
  birthDate: string;
  heightCm: string;
  phone: string;
  email: string;
  occupation: string;
  diabetesType: string;
  diagnosis: string;
  diagnosisCodes: Cie10Selection[];
};

export const EMPTY_PATIENT: PatientFormValues = {
  fullName: "",
  dni: "",
  sex: "femenino",
  birthDate: "",
  heightCm: "",
  phone: "",
  email: "",
  occupation: "",
  diabetesType: "ninguna",
  diagnosis: "",
  diagnosisCodes: [],
};

export function PatientForm({
  initial = EMPTY_PATIENT,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: PatientFormValues;
  submitLabel: string;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key: keyof PatientFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink-950">Datos personales</legend>
        <Input label="Nombre y apellido *" value={values.fullName} onChange={set("fullName")} required autoFocus maxLength={120} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="DNI" value={values.dni} onChange={set("dni")} inputMode="numeric" maxLength={20} />
          <Select label="Sexo" value={values.sex} onChange={set("sex")} hint="Se usa en las ecuaciones antropométricas.">
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
          </Select>
          <Input label="Fecha de nacimiento" type="date" value={values.birthDate} onChange={set("birthDate")} max={new Date().toISOString().slice(0, 10)} />
          <Input label="Talla" type="number" step="0.1" min={40} max={230} suffix="cm" value={values.heightCm} onChange={set("heightCm")} />
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink-950">Contacto</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Teléfono" type="tel" value={values.phone} onChange={set("phone")} />
          <Input label="Email" type="email" value={values.email} onChange={set("email")} />
          <Input label="Ocupación" value={values.occupation} onChange={set("occupation")} className="sm:col-span-2" />
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink-950">Datos clínicos</legend>
        <Select label="Diabetes" value={values.diabetesType} onChange={set("diabetesType")}>
          <option value="ninguna">Sin diabetes</option>
          <option value="prediabetes">Prediabetes</option>
          <option value="tipo 1">Tipo 1</option>
          <option value="tipo 2">Tipo 2</option>
          <option value="gestacional">Gestacional</option>
        </Select>
        <Cie10Picker value={values.diagnosisCodes} onChange={(diagnosisCodes) => setValues((v) => ({ ...v, diagnosisCodes }))} />
        <Textarea
          label="Detalle clínico / motivo de consulta"
          value={values.diagnosis}
          onChange={set("diagnosis")}
          placeholder="Notas adicionales (opcional). El diagnóstico codificado se elige arriba con CIE-10."
        />
      </fieldset>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function toPatientPayload(values: PatientFormValues) {
  return {
    ...values,
    heightCm: values.heightCm ? Number(values.heightCm) : null,
    diagnosisCodes: values.diagnosisCodes,
  };
}
