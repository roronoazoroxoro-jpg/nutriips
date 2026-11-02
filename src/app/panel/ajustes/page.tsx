"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Trash2, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { prepareAvatarFile } from "@/lib/avatar-client";
import { useSession, type User } from "@/components/session";
import { useToast } from "@/components/toast";
import { LocalBackupCard } from "@/components/LocalBackup";
import { Avatar, Button, Card, CardHeader, Input, PageHeader, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const { user } = useSession();
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader eyebrow="Consultorio" title="Ajustes" description="Tu foto aparece en el inicio al elegir perfil. Los datos salen en el membrete de informes y planes." />
      {!user ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <AvatarCard user={user} />
            <ProfileCard user={user} />
          </div>
          <div className="space-y-6">
            <PasswordCard />
            <LocalBackupCard />
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarCard({ user }: { user: User }) {
  const { setUser } = useSession();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setPreview(null);
  }, [user.avatarUrl]);

  async function onPick(file: File | null) {
    if (!file) return;
    setLoading(true);
    try {
      const prepared = await prepareAvatarFile(file);
      const localUrl = URL.createObjectURL(prepared);
      setPreview(localUrl);
      const body = new FormData();
      body.append("avatar", prepared);
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo subir la foto");
      setUser(data.user);
      toast.success("Foto de perfil actualizada · ya se ve en el inicio");
      URL.revokeObjectURL(localUrl);
      setPreview(null);
    } catch (err) {
      setPreview(null);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setLoading(true);
    try {
      const data = await api<{ user: User }>("/api/profile/avatar", { method: "DELETE" });
      setUser(data.user);
      toast.success("Foto eliminada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader icon={<Camera className="h-4 w-4" />} title="Foto de perfil" subtitle="Se muestra en el listado de ingreso y en tu menú" />
      <div className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center">
        <Avatar name={user.name} src={preview || user.avatarUrl} size="xl" className="ring-2 ring-leaf-200" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm leading-relaxed text-ink-600">
            Subí una foto clara, de frente. La recortamos en cuadrado automáticamente para que se vea bien en el inicio.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => onPick(event.target.files?.[0] || null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" loading={loading} icon={<Camera className="h-4 w-4" />} onClick={() => inputRef.current?.click()}>
              {user.avatarUrl ? "Cambiar foto" : "Subir foto"}
            </Button>
            {user.avatarUrl && (
              <Button type="button" variant="secondary" loading={loading} icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
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
