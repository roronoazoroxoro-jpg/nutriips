"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ClipboardList, LineChart, Printer, Ruler, Scale } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, Input } from "@/components/ui";

const FEATURES = [
  { icon: ClipboardList, text: "Anamnesis alimentaria completa con recordatorio de 24 h y frecuencia de consumo" },
  { icon: Ruler, text: "Perfil antropométrico ISAK con % de grasa y área muscular calculados al instante" },
  { icon: Scale, text: "Bioimpedancia Omron comparada con Mifflin-St Jeor" },
  { icon: LineChart, text: "Evolución gráfica y alertas clínicas automáticas" },
  { icon: Activity, text: "Plan alimentario con meta calórica y macronutrientes" },
  { icon: Printer, text: "Informes y planes listos para imprimir o enviar en PDF" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("vencida")) setNotice("Tu sesión terminó. Ingresá de nuevo para continuar.");
    fetch("/api/auth/me").then((response) => {
      if (response.ok) router.replace("/panel");
    });
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo ingresar");
        setLoading(false);
        return;
      }
      router.push("/panel");
    } catch {
      setError("No hay conexión con el servidor");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-leaf-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[26rem] w-[26rem] rounded-full bg-leaf-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="font-display text-xl font-semibold">NutriIPS</span>
        </div>
        <div className="relative mt-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-300">Consultorio digital de nutrición</p>
          <h1 className="mt-4 text-[42px] font-semibold leading-[1.1]">Toda la consulta nutricional, en un solo lugar.</h1>
          <ul className="mt-10 space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature.text} className="flex items-start gap-3 text-[15px] text-white/80">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-leaf-300">
                  <feature.icon className="h-4 w-4" />
                </span>
                <span className="pt-1">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-white/40">Los datos de tus pacientes quedan guardados en este equipo.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo className="h-10 w-10" />
            <span className="font-display text-xl font-semibold">NutriIPS</span>
          </div>
          <h2 className="mt-8 text-3xl font-semibold text-ink-950 lg:mt-0">Ingresar</h2>
          <p className="mt-2 text-sm text-ink-600">Accedé a tu consultorio con tu email profesional.</p>
          {notice && <p className="mt-6 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{notice}</p>}
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input label="Email" type="email" autoComplete="username" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label="Clave" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" loading={loading} className="w-full">
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
          <p className="mt-10 text-center text-xs text-ink-500">© {new Date().getFullYear()} NutriIPS</p>
        </div>
      </section>
    </main>
  );
}
