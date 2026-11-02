"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, FolderKanban, Home, LogOut, Menu, Search, Settings, Shield, Users, X, UserPlus, ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import type { PatientSummary } from "@/lib/patient";
import { useSession } from "./session";
import { Avatar, Button, Input, Modal, cx } from "./ui";
import { useToast } from "./toast";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";

const BASE_NAV = [
  { href: "/panel", label: "Inicio", icon: Home, exact: true },
  { href: "/panel/pacientes", label: "Pacientes", icon: Users },
  { href: "/panel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/panel/compartido", label: "Panel compartido", icon: FolderKanban, clinical: true },
  { href: "/panel/jefatura", label: "Jefatura", icon: Shield, chiefOnly: true },
  { href: "/panel/ajustes", label: "Ajustes", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const nav = useMemo(() => {
    const role = user?.role || (user?.technical ? "technical" : "nutritionist");
    return BASE_NAV.filter((item) => {
      if ("chiefOnly" in item && item.chiefOnly) return role === "chief";
      if ("clinical" in item && item.clinical) return role === "chief" || role === "nutritionist";
      return true;
    });
  }, [user]);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Link href="/panel" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="min-w-0">
            <span className="block font-display text-lg font-semibold tracking-tight text-white">NutriIPS</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-leaf-300">IPS Misiones · Nutrición</span>
          </span>
        </Link>
      </div>
      <div className="px-3">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 text-sm text-white/60 transition hover:bg-white/10"
        >
          <Search className="h-4 w-4" />
          Buscar paciente
          <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">Ctrl K</kbd>
        </button>
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-white text-ink-950 shadow-sm" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {!user?.technical && <NotificationBell />}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user?.name ?? "?"} src={user?.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? "—"}</p>
            <p className="truncate text-xs text-white/50">
              {user?.role === "chief" ? "Jefa de departamento" : user?.license ? `M.P. ${user.license}` : user?.email}
            </p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-950 lg:block">{sidebar}</aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-ink-900/[0.06] bg-sand-50/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 hover:bg-ink-900/5" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/panel" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="font-display font-semibold">NutriIPS</span>
        </Link>
        <div className="flex items-center gap-1">
          {!user?.technical && <NotificationBell compact />}
          <button onClick={() => setSearchOpen(true)} className="rounded-lg p-2 hover:bg-ink-900/5" aria-label="Buscar paciente">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-in bg-ink-950">
            <button onClick={() => setMenuOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 text-white/70" aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-8 md:pt-8">{children}</main>

      <PatientSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {user?.mustChangePassword && <ForcePasswordChange />}
    </div>
  );
}

function PatientSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientSummary[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    api<{ patients: PatientSummary[] }>("/api/patients")
      .then((data) => setPatients(data.patients))
      .catch(() => setPatients([]));
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const list = patients ?? [];
    if (!q) return list.slice(0, 8);
    return list
      .filter((p) => `${p.fullName} ${p.dni ?? ""} ${p.phone ?? ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q))
      .slice(0, 8);
  }, [patients, query]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl bg-white shadow-lift">
        <div className="flex items-center gap-3 border-b border-ink-900/[0.06] px-4">
          <Search className="h-4 w-4 text-ink-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, results.length));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (event.key === "Enter") {
                if (active < results.length) go(`/panel/pacientes/${results[active].id}`);
                else go("/panel/pacientes/nuevo");
              }
            }}
            placeholder="Nombre, DNI o teléfono..."
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-500"
          />
          <kbd className="rounded bg-ink-900/5 px-1.5 py-0.5 text-[10px] text-ink-500">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {patients == null && <li className="px-3 py-6 text-center text-sm text-ink-500">Cargando pacientes...</li>}
          {patients != null && results.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-500">Sin coincidencias.</li>}
          {results.map((patient, index) => (
            <li key={patient.id}>
              <button
                onMouseEnter={() => setActive(index)}
                onClick={() => go(`/panel/pacientes/${patient.id}`)}
                className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", active === index && "bg-leaf-50")}
              >
                <Avatar name={patient.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-950">{patient.fullName}</p>
                  <p className="truncate text-xs text-ink-500">
                    {[patient.age != null ? `${patient.age} años` : null, patient.dni ? `DNI ${patient.dni}` : null].filter(Boolean).join(" · ") || "Sin datos"}
                  </p>
                </div>
                {active === index && <ArrowRight className="h-4 w-4 text-ink-500" />}
              </button>
            </li>
          ))}
          <li>
            <button
              onMouseEnter={() => setActive(results.length)}
              onClick={() => go("/panel/pacientes/nuevo")}
              className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-leaf-700", active === results.length && "bg-leaf-50")}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf-100">
                <UserPlus className="h-4 w-4" />
              </span>
              Nuevo paciente
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ForcePasswordChange() {
  const { setUser } = useSession();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (next !== repeat) return setError("Las claves nuevas no coinciden");
    setLoading(true);
    try {
      const data = await api<{ user: Parameters<typeof setUser>[0] }>("/api/auth/password", { method: "POST", json: { current, next } });
      setUser(data.user);
      toast.success("Clave actualizada. ¡Bienvenida/o a NutriIPS!");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={() => undefined} title="Elegí tu clave personal" description="Por seguridad, reemplazá la clave inicial antes de empezar a cargar pacientes." size="sm">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Clave inicial" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <Input label="Clave nueva" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="Mínimo 8 caracteres, con letras y números." required />
        <Input label="Repetir clave nueva" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Guardar y continuar
        </Button>
      </form>
    </Modal>
  );
}
