"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Download, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { useSession, type User } from "@/components/session";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, Input, PageHeader, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const { user } = useSession();
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader eyebrow="Consultorio" title="Ajustes" description="Tus datos profesionales aparecen en el membrete de informes y planes." />
      {!user ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <ProfileCard user={user} />
          <div className="space-y-6">
            <PasswordCard />
            <BackupCard />
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ user }: { user: User }) {
  const { setUser } = useSession();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    license: user.license ?? "",
    phone: user.phone ?? "",
    clinicName: user.clinicName ?? "",
    address: user.address ?? "",
  });
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    setForm({ name: user.name, email: user.email, license: user.license ?? "", phone: user.phone ?? "", clinicName: user.clinicName ?? "", address: user.address ?? "" });
  }, [user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ user: User }>("/api/profile", { method: "PATCH", json: form });
      setUser(data.user);
      toast.success("Datos profesionales actualizados");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="self-start">
      <CardHeader icon={<UserRound className="h-4 w-4" />} title="Perfil profesional" />
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre profesional *" value={form.name} onChange={set("name")} required placeholder="Lic. Ana Pérez" />
          <Input label="Matrícula" value={form.license} onChange={set("license")} placeholder="1234" />
          <Input label="Email de acceso *" type="email" value={form.email} onChange={set("email")} required />
          <Input label="Teléfono" value={form.phone} onChange={set("phone")} />
          <Input label="Nombre del consultorio" value={form.clinicName} onChange={set("clinicName")} className="sm:col-span-2" placeholder="Consultorio de Nutrición" />
          <Input label="Dirección" value={form.address} onChange={set("address")} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Guardar datos
          </Button>
        </div>
      </form>
      <div className="border-t border-ink-900/[0.06] bg-sand-50 px-5 py-4">
        <p className="text-xs font-medium text-ink-600">Así se ve el membrete</p>
        <div className="mt-2 rounded-xl border border-ink-900/10 bg-white p-4">
          <p className="font-semibold">{form.clinicName || form.name || "Tu nombre"}</p>
          {form.clinicName && <p className="text-sm text-ink-700">{form.name}</p>}
          {form.license && <p className="text-xs text-ink-600">Lic. en Nutrición · M.P. {form.license}</p>}
          <p className="mt-1 text-xs text-ink-500">{[form.phone, form.email, form.address].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const { setUser } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (next !== repeat) return toast.error("Las claves nuevas no coinciden");
    setLoading(true);
    try {
      const data = await api<{ user: User }>("/api/auth/password", { method: "POST", json: { current, next } });
      setUser(data.user);
      toast.success("Clave actualizada");
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader icon={<KeyRound className="h-4 w-4" />} title="Cambiar clave" />
      <form onSubmit={submit} className="space-y-3 p-5">
        <Input label="Clave actual" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <Input label="Clave nueva" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="Mínimo 8 caracteres, con letras y números." required />
        <Input label="Repetir clave nueva" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={loading}>
            Actualizar clave
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BackupCard() {
  return (
    <Card>
      <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="Respaldo de datos" subtitle="Tus pacientes se guardan en este equipo" />
      <div className="space-y-3 p-5 text-sm text-ink-700">
        <p>Descargá una copia completa (pacientes, consultas, mediciones, planes y turnos) en formato JSON. Guardala en un pendrive o en la nube.</p>
        <ul className="space-y-1.5 text-xs text-ink-600">
          <li className="flex gap-2">
            <BadgeCheck className="h-4 w-4 shrink-0 text-leaf-600" /> Recomendado: una vez por semana y antes de cambiar de computadora.
          </li>
          <li className="flex gap-2">
            <BadgeCheck className="h-4 w-4 shrink-0 text-leaf-600" /> También podés ejecutar <code className="rounded bg-sand-100 px-1">npm run backup</code> para copiar la base completa.
          </li>
        </ul>
        <a href="/api/backup" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 text-sm font-semibold text-white shadow-sm hover:bg-ink-800">
          <Download className="h-4 w-4" />
          Descargar respaldo
        </a>
      </div>
    </Card>
  );
}
