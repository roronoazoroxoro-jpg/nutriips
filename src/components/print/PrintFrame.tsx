"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { api } from "@/lib/client";
import type { PresentedPatient } from "@/lib/patient";
import type { User } from "../session";
import { Logo } from "../Logo";
import { Button, Spinner } from "../ui";

export function usePrintData(patientId: string) {
  const [data, setData] = useState<{ patient: PresentedPatient; user: User } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api<{ patient: PresentedPatient }>(`/api/patients/${patientId}`), api<{ user: User }>("/api/auth/me")])
      .then(([p, u]) => setData({ patient: p.patient, user: u.user }))
      .catch((err) => setError((err as Error).message));
  }, [patientId]);
  return { data, error };
}

export function PrintFrame({
  title,
  loading,
  error,
  notice,
  children,
  backHref,
}: {
  title: string;
  loading: boolean;
  error?: string;
  notice?: { title: string; text: string; action: string };
  children: ReactNode;
  backHref: string;
}) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return (
    <>
      <div className="no-print sticky top-0 z-10 border-b border-ink-900/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-3">
          <a href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
            <ArrowLeft className="h-4 w-4" />
            Volver a la ficha
          </a>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-ink-500 sm:block">Para guardar en PDF elegí “Guardar como PDF” en el destino.</p>
            <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()} disabled={loading || Boolean(error) || Boolean(notice)}>
              Imprimir / PDF
            </Button>
          </div>
        </div>
      </div>
      <div className="px-4 py-8 print:p-0">
        <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[14mm] py-[14mm] text-[13px] leading-relaxed text-ink-950 shadow-lift print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
          {error ? (
            <p className="py-20 text-center text-red-700">{error}</p>
          ) : loading ? (
            <Spinner label="Preparando documento..." />
          ) : notice ? (
            <div className="mx-auto max-w-sm py-24 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-50 text-leaf-700">
                <FileText className="h-6 w-6" />
              </div>
              <h1 className="text-base font-semibold">{notice.title}</h1>
              <p className="mt-1 text-sm text-ink-600">{notice.text}</p>
              <a href={backHref} className="mt-5 inline-flex items-center rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800">
                {notice.action}
              </a>
            </div>
          ) : (
            children
          )}
        </article>
      </div>
    </>
  );
}

export function Letterhead({ user, subtitle }: { user: User; subtitle: string }) {
  const contact = [user.phone, user.email].filter(Boolean).join(" · ");
  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-leaf-600 pb-4">
      <div className="flex items-center gap-3">
        <Logo className="h-11 w-11" />
        <div>
          <p className="text-lg font-semibold leading-tight">{user.clinicName || user.name}</p>
          {user.clinicName && <p className="text-sm text-ink-700">{user.name}</p>}
          {user.license && <p className="text-xs text-ink-600">Lic. en Nutrición · M.P. {user.license}</p>}
        </div>
      </div>
      <div className="text-right text-xs text-ink-600">
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf-700">{subtitle}</p>
        {contact && <p className="mt-1">{contact}</p>}
        {user.address && <p>{user.address}</p>}
      </div>
    </header>
  );
}

export function PrintSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`print-avoid-break mt-6 ${className ?? ""}`}>
      <h2 className="mb-2 border-b border-ink-900/10 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf-700">{title}</h2>
      {children}
    </section>
  );
}
