"use client";

import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "../toast";
import { Button, Input, Modal, Textarea } from "../ui";
import type { Patient } from "./shared";

export function SendPlanEmailModal({
  open,
  onClose,
  patient,
  defaultTips,
  hasPlan,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  patient: Patient;
  defaultTips: string;
  hasPlan: boolean;
  onSent: (patient: Patient) => void;
}) {
  const toast = useToast();
  const [to, setTo] = useState(patient.email ?? "");
  const [subject, setSubject] = useState("Tu plan alimentario personalizado");
  const [message, setMessage] = useState(
    `Hola ${patient.fullName.split(/\s+/)[0] || ""},\n\nTe comparto tu plan alimentario pensado para estos días: comidas claras, porciones prácticas y tips para que te resulte más fácil sostenerlo.\n\nCualquier duda, escribime.`
  );
  const [tips, setTips] = useState(defaultTips);
  const [includePlan, setIncludePlan] = useState(hasPlan);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(patient.email ?? "");
    setTips(defaultTips);
    setIncludePlan(hasPlan);
    setMessage(
      `Hola ${patient.fullName.split(/\s+/)[0] || ""},\n\nTe comparto tu plan alimentario pensado para estos días: comidas claras, porciones prácticas y tips para que te resulte más fácil sostenerlo.\n\nCualquier duda, escribime.`
    );
    api<{ configured: boolean }>(`/api/patients/${patient.id}/email`)
      .then((data) => setConfigured(data.configured))
      .catch(() => setConfigured(false));
  }, [open, patient, defaultTips, hasPlan]);

  async function send() {
    setLoading(true);
    try {
      const data = await api<{ patient: Patient | null; to: string }>(`/api/patients/${patient.id}/email`, {
        method: "POST",
        json: { to, subject, message, tips, includePlan },
      });
      if (data.patient) onSent(data.patient);
      toast.success(`Mensaje enviado a ${data.to}`);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Enviar mensaje por Gmail"
      description="Mail personalizado con el plan alimentario y tips para el paciente."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<Send className="h-4 w-4" />} loading={loading} disabled={configured === false} onClick={send}>
            Enviar ahora
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {configured === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Falta configurar el correo del departamento (`SMTP_USER` y `SMTP_PASS` con la clave SMTP de Brevo).
            Hasta que esté cargado, no se puede enviar desde la app.
          </div>
        )}
        {!patient.email && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Esta ficha no tiene email. Completalo abajo y se guardará al enviar.
          </div>
        )}
        <Input label="Para" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="paciente@email.com" required />
        <Input label="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Mensaje personalizado" className="[&_textarea]:min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} />
        <Textarea
          label="Tips"
          hint="Uno por renglón. Si está vacío, se usan las recomendaciones del plan."
          className="[&_textarea]:min-h-[120px]"
          value={tips}
          onChange={(e) => setTips(e.target.value)}
        />
        <label className="flex items-start gap-3 rounded-xl border border-ink-900/10 bg-sand-50 px-4 py-3 text-sm text-ink-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={includePlan}
            disabled={!hasPlan}
            onChange={(e) => setIncludePlan(e.target.checked)}
          />
          <span>
            <span className="font-semibold text-ink-950">Incluir el plan alimentario guardado</span>
            <span className="mt-0.5 block text-ink-600">
              {hasPlan ? "Se adjunta en el cuerpo del mail (comidas, horarios y lista de compras)." : "Primero guardá un plan para poder incluirlo."}
            </span>
          </span>
        </label>
        <p className="flex items-center gap-2 text-xs text-ink-600">
          <Mail className="h-3.5 w-3.5" />
          El paciente puede responder directo a tu correo profesional.
        </p>
      </div>
    </Modal>
  );
}
