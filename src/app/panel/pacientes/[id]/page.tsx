"use client";

import { useParams } from "next/navigation";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";

export default function PatientPage() {
  const params = useParams<{ id: string }>();
  return <PatientWorkspace key={params.id} patientId={params.id} />;
}
