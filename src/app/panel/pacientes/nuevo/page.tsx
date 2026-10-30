"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/client";
import { Card, PageHeader } from "@/components/ui";
import { PatientForm, toPatientPayload } from "@/components/PatientForm";
import { useToast } from "@/components/toast";

export default function NewPatientPage() {
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      <Link href="/panel/pacientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" />
        Pacientes
      </Link>
      <PageHeader title="Nuevo paciente" description="Solo el nombre es obligatorio. El resto lo podés completar después." />
      <Card className="p-6">
        <PatientForm
          submitLabel="Crear ficha"
          onCancel={() => router.push("/panel/pacientes")}
          onSubmit={async (values) => {
            const data = await api<{ patient: { id: string } }>("/api/patients", { method: "POST", json: toPatientPayload(values) });
            toast.success("Ficha creada");
            router.push(`/panel/pacientes/${data.patient.id}`);
          }}
        />
      </Card>
    </div>
  );
}
