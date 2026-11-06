"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, FolderKanban, KeyRound, MessageCircle, Phone, Search, Shield, UserRoundCog, Users, Wrench } from "lucide-react";
import { BrandLockup } from "@/components/Logo";
import { NutritionDecor } from "@/components/NutritionDecor";
import { Avatar, Button, Input, cx } from "@/components/ui";

type StaffPerson = {
  id: string;
  name: string;
  email: string;
  title?: string | null;
  phone?: string | null;
  area?: string | null;
  manager?: string | null;
  license?: string | null;
  role?: "nutritionist" | "chief" | "technical";
  technical?: boolean;
  avatarUrl?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarTone(name: string) {
  const tones = [
    "bg-leaf-100 text-leaf-800",
    "bg-ink-900/10 text-ink-800",
    "bg-leaf-200 text-leaf-800",
    "bg-sand-100 text-ink-800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[hash];
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return phone;
}

function phoneHref(phone: string) {
  return `tel:+54${phone.replace(/\D/g, "")}`;
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/54${digits}`;
}

function StaffTile({
  person,
  onPick,
  technical = false,
}: {
  person: StaffPerson;
  onPick: (person: StaffPerson) => void;
  technical?: boolean;
}) {
  const chief = person.role === "chief";
  return (
    <button
      type="button"
      onClick={() => onPick(person)}
      className={cx(
        "group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none",
        technical
          ? "border-ink-900/15 bg-ink-950 text-white hover:border-leaf-400/50 hover:shadow-card"
          : chief
            ? "border-leaf-400/40 bg-gradient-to-r from-white to-leaf-50/80 hover:border-leaf-500/50 hover:shadow-card"
            : "border-ink-900/[0.07] bg-white/90 hover:border-leaf-400/40 hover:shadow-card"
      )}
    >
      {person.avatarUrl ? (
        <Avatar name={person.name} src={person.avatarUrl} size="md" className="h-11 w-11 shadow-sm" />
      ) : (
        <span
          className={cx(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-semibold",
            technical ? "bg-white/10 text-leaf-300" : chief ? "bg-leaf-600 text-white" : avatarTone(person.name)
          )}
        >
          {technical ? <Wrench className="h-5 w-5" /> : chief ? <Shield className="h-5 w-5" /> : initials(person.name)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cx("block truncate text-[15px] font-semibold", technical ? "text-white" : "text-ink-950")}>{person.name}</span>
          {chief && <span className="rounded-md bg-leaf-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Jefa</span>}
        </span>
        <span className={cx("mt-0.5 block truncate text-xs", technical ? "text-white/65" : "text-ink-500")}>
          {technical
            ? person.area || person.title || "Soporte técnico"
            : chief
              ? `${person.title || "Jefa Departamento de Nutrición"}${person.license ? ` · M.P. ${person.license}` : ""}`
              : person.title || person.email}
        </span>
      </span>
      <span
        className={cx(
          "rounded-lg px-2 py-1 text-[11px] font-semibold opacity-0 transition group-hover:opacity-100",
          technical ? "bg-white/10 text-leaf-300" : "bg-leaf-50 text-leaf-700"
        )}
      >
        {technical ? "Consultar" : "Entrar"}
      </span>
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffPerson[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StaffPerson | null>(null);
  const [techLoginOpen, setTechLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/panel");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("vencida")) {
      setNotice("Tu sesión terminó. Elegí tu perfil e ingresá de nuevo.");
    }
    if (params.has("compartido")) {
      router.replace("/compartido");
      return;
    }
    const next = params.get("next");
    if (next && next.startsWith("/panel")) setNextPath(next);

    fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) return;
      const dest = next && next.startsWith("/panel") ? next : "/panel";
      router.replace(dest);
    });
    fetch("/api/auth/staff")
      .then((response) => response.json())
      .then((data) => setStaff(Array.isArray(data.staff) ? data.staff : []))
      .catch(() => setStaff([]))
      .finally(() => setLoadingStaff(false));
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (person) =>
        person.name.toLowerCase().includes(q) ||
        person.email.toLowerCase().includes(q) ||
        (person.title || "").toLowerCase().includes(q) ||
        (person.area || "").toLowerCase().includes(q)
    );
  }, [staff, query]);

  const clinical = useMemo(() => filtered.filter((person) => !person.technical), [filtered]);
  const technical = useMemo(() => filtered.filter((person) => person.technical), [filtered]);

  function pick(person: StaffPerson) {
    setSelected(person);
    setTechLoginOpen(false);
    setPassword("");
    setError("");
  }

  function clearPick() {
    setSelected(null);
    setTechLoginOpen(false);
    setPassword("");
    setError("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selected.email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo ingresar");
        setLoading(false);
        return;
      }
      router.push(nextPath.startsWith("/panel") ? nextPath : "/panel");
    } catch {
      setError("No hay conexión con el servidor");
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-sand-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,161,114,0.16),_transparent_52%),radial-gradient(ellipse_at_bottom_right,_rgba(80,101,168,0.12),_transparent_48%),linear-gradient(180deg,#f7fbf8_0%,#faf8f4_45%,#f3efe6_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(13,31,24,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(13,31,24,0.035)_1px,transparent_1px)] [background-size:44px_44px]" />
      <NutritionDecor />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
        <header className="animate-fade-in">
          <BrandLockup size="hero" />
          <p className="mt-5 max-w-xl text-base text-ink-600 sm:text-lg">
            <span className="font-semibold text-ink-900">NutriIPS</span>
            <span className="mx-2 text-leaf-500">·</span>
            consultorio digital del Departamento de Nutrición
          </p>
          <div className="mt-5 h-1 w-24 rounded-full bg-gradient-to-r from-leaf-500 to-[#5065A8]/70" />
        </header>

        <section className="mt-10 flex flex-1 flex-col sm:mt-12">
          {!selected ? (
            <div className="animate-fade-in">
              <div className="max-w-2xl rounded-3xl border border-white/70 bg-white/75 p-5 shadow-card backdrop-blur-sm sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-700">Acceso interno</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl md:text-[2.75rem]">
                  ¿Quién ingresa?
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-600 sm:text-[15px]">
                  Tocá tu nombre y después escribí tu clave. Sin email, más rápido en el consultorio.
                </p>
              </div>

              {notice && <p className="mt-6 max-w-xl rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{notice}</p>}
              {nextPath !== "/panel" && (
                <p className="mt-4 max-w-xl rounded-xl bg-leaf-50 px-3 py-2.5 text-sm text-leaf-800">
                  Después de ingresar vas a abrir la ficha asignada automáticamente.
                </p>
              )}

              <Link
                href="/compartido"
                className="mt-8 flex w-full max-w-2xl items-start gap-3 rounded-2xl border border-leaf-400/40 bg-gradient-to-r from-leaf-50/95 to-white/90 px-4 py-4 text-left shadow-card backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-leaf-500/55 hover:shadow-lift focus-visible:outline-none"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-600 text-white">
                  <FolderKanban className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-950">Panel compartido</span>
                    <span className="rounded-md bg-leaf-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Sin clave</span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-600">
                    Un click: ver turnos, derivaciones y asignar pacientes a cualquier nutricionista. También está en el menú de cada perfil.
                  </span>
                </span>
                <span className="self-center rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-leaf-700 ring-1 ring-leaf-600/15">
                  Abrir
                </span>
              </Link>

              <div className="relative mt-8 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  className="input pl-10"
                  placeholder="Buscar por nombre…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Buscar profesional"
                />
              </div>

              {loadingStaff ? (
                <p className="mt-10 text-sm text-ink-500">Cargando equipo…</p>
              ) : filtered.length === 0 ? (
                <div className="mt-10 flex items-center gap-3 rounded-2xl border border-ink-900/10 bg-white/80 px-4 py-5 text-sm text-ink-600">
                  <Users className="h-5 w-5 text-ink-500" />
                  No hay coincidencias. Probá otro nombre.
                </div>
              ) : (
                <div className="mt-8 space-y-8 rounded-3xl border border-white/60 bg-white/55 p-4 shadow-card backdrop-blur-sm sm:p-5">
                  {clinical.length > 0 && (
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {clinical.map((person) => (
                        <li key={person.id}>
                          <StaffTile person={person} onPick={pick} />
                        </li>
                      ))}
                    </ul>
                  )}

                  {technical.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-px flex-1 bg-ink-900/10" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">Soporte técnico</p>
                        <div className="h-px flex-1 bg-ink-900/10" />
                      </div>
                      <p className="mb-3 text-sm text-ink-600">
                        Si tenés un inconveniente con NutriIPS, tocá el perfil de abajo para ver cómo contactar al área de Informática.
                      </p>
                      <ul className="grid gap-2.5">
                        {technical.map((person) => (
                          <li key={person.id}>
                            <StaffTile person={person} onPick={pick} technical />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : selected.technical && !techLoginOpen ? (
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center animate-scale-in">
              <button
                type="button"
                onClick={clearPick}
                className="mb-6 inline-flex items-center gap-1.5 self-start text-sm font-medium text-ink-600 transition hover:text-ink-950"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
              </button>

              <div className="overflow-hidden rounded-3xl border border-ink-900/[0.08] bg-ink-950 text-white shadow-card">
                <div className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(52,161,114,0.28),_transparent_55%)] px-6 py-6 sm:px-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf-300">Mesa de ayuda · NutriIPS</p>
                  <div className="mt-4 flex items-start gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-leaf-300">
                      <UserRoundCog className="h-7 w-7" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl font-semibold tracking-tight">{selected.name}</h2>
                      <p className="mt-1 text-sm text-white/70">{selected.title || "Programador · encargado de mantenimiento"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 px-6 py-6 sm:px-8">
                  <p className="text-[15px] leading-relaxed text-white/80">
                    Canal oficial de soporte técnico para NutriIPS. Si no podés ingresar, se cortó una pantalla, falla el correo del plan,
                    hay un error al guardar o necesitás una corrección en el sistema, escribime o llamame. Atendo incidencias de acceso,
                    mantenimiento y estabilidad del consultorio digital.
                  </p>

                  <dl className="grid gap-3">
                    <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-300" />
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Área</dt>
                        <dd className="mt-0.5 text-sm font-medium text-white">{selected.area || "Área de Informática"}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <UserRoundCog className="mt-0.5 h-4 w-4 shrink-0 text-leaf-300" />
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Jefe a cargo</dt>
                        <dd className="mt-0.5 text-sm font-medium text-white">{selected.manager || "Raúl Falero"}</dd>
                      </div>
                    </div>
                    {selected.phone && (
                      <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-leaf-300" />
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Consultas de mantenimiento</dt>
                          <dd className="mt-0.5 text-lg font-semibold tracking-wide text-white">{formatPhone(selected.phone)}</dd>
                        </div>
                      </div>
                    )}
                  </dl>

                  {selected.phone && (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <a
                        href={phoneHref(selected.phone)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-leaf-500 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-leaf-400"
                      >
                        <Phone className="h-4 w-4" />
                        Llamar
                      </a>
                      <a
                        href={whatsappHref(selected.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </div>
                  )}

                  <p className="text-xs leading-relaxed text-white/45">
                    Indicá tu nombre, el mensaje de error si aparece y en qué pantalla ocurrió. Eso acelera el diagnóstico y la reparación.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setTechLoginOpen(true);
                      setError("");
                      setPassword("");
                    }}
                    className="w-full rounded-xl py-2 text-center text-xs font-medium text-white/40 transition hover:text-white/70"
                  >
                    Soy el técnico · ingresar al sistema
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center animate-scale-in">
              <button
                type="button"
                onClick={() => (selected.technical ? setTechLoginOpen(false) : clearPick())}
                className="mb-6 inline-flex items-center gap-1.5 self-start text-sm font-medium text-ink-600 transition hover:text-ink-950"
              >
                <ArrowLeft className="h-4 w-4" />
                {selected.technical ? "Volver al soporte" : "Volver al listado"}
              </button>

              <div className="rounded-3xl border border-ink-900/[0.07] bg-white/95 p-6 shadow-card sm:p-8">
                <div className="flex items-center gap-3">
                  {selected.avatarUrl ? (
                    <Avatar name={selected.name} src={selected.avatarUrl} size="lg" className="shadow-sm" />
                  ) : (
                    <span className={cx("grid h-14 w-14 place-items-center rounded-2xl text-base font-semibold", avatarTone(selected.name))}>
                      {initials(selected.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leaf-700">
                      {selected.technical ? "Soporte técnico" : selected.role === "chief" ? "Jefatura" : "Hola"}
                    </p>
                    <h2 className="truncate font-display text-2xl font-semibold text-ink-950">{selected.name}</h2>
                    {selected.title && <p className="truncate text-sm text-ink-600">{selected.title}</p>}
                    {selected.license && <p className="truncate text-xs text-ink-500">M.P. {selected.license}</p>}
                    <p className="truncate text-xs text-ink-500">{selected.email}</p>
                  </div>
                </div>

                {nextPath !== "/panel" && (
                  <p className="mt-5 rounded-xl bg-leaf-50 px-3 py-2.5 text-sm text-leaf-800">
                    Al ingresar vas a abrir la ficha del paciente asignado.
                  </p>
                )}
                {notice && <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{notice}</p>}

                <form onSubmit={onSubmit} className="mt-7 space-y-4">
                  <Input
                    label="Tu clave"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  {error && (
                    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <Button type="submit" size="lg" loading={loading} icon={!loading ? <KeyRound className="h-4 w-4" /> : undefined} className="w-full">
                    {loading ? "Ingresando…" : nextPath !== "/panel" ? "Ingresar y abrir ficha" : "Ingresar al panel"}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-10 text-center text-xs text-ink-500">
          © {new Date().getFullYear()} Instituto de Previsión Social · Misiones · Departamento de Nutrición
        </footer>
      </div>
    </main>
  );
}
