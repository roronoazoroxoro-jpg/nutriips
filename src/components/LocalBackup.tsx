"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Download, FolderOpen, HardDrive } from "lucide-react";
import { useToast } from "./toast";
import { Button, Card, CardHeader } from "./ui";

const LAST_KEY = "nutriips_last_backup_at";

export function LocalBackupCard() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [canPickFolder, setCanPickFolder] = useState(false);

  useEffect(() => {
    setLastBackup(localStorage.getItem(LAST_KEY));
    setCanPickFolder("showSaveFilePicker" in window);
    const last = localStorage.getItem(LAST_KEY);
    if (!last) return;
    const days = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
    if (days >= 7) {
      toast.success("Recordatorio: hace más de 7 días del último respaldo en esta PC.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  async function fetchBackup() {
    const res = await fetch("/api/backup", { credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo generar el respaldo");
    }
    const blob = await res.blob();
    const stamp = new Date().toISOString().slice(0, 10);
    return { blob, filename: `nutriips-respaldo-${stamp}.json` };
  }

  async function markDone() {
    const iso = new Date().toISOString();
    localStorage.setItem(LAST_KEY, iso);
    setLastBackup(iso);
  }

  async function downloadClassic() {
    setLoading(true);
    try {
      const { blob, filename } = await fetchBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await markDone();
      toast.success("Respaldo descargado. Guardalo en Documentos o en un pendrive.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveToPc() {
    if (!canPickFolder) return downloadClassic();
    setLoading(true);
    try {
      const { blob, filename } = await fetchBackup();
      // @ts-expect-error File System Access API
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "Respaldo NutriIPS", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      await markDone();
      toast.success("Copia guardada en esta PC.");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        icon={<HardDrive className="h-4 w-4" />}
        title="Copia en esta PC"
        subtitle="La nube sincroniza el consultorio; la copia local es tu red de seguridad"
      />
      <div className="space-y-3 p-5 text-sm text-ink-700">
        <p>
          Cada nutricionista solo ve y respalda <strong>sus propios pacientes</strong>. El archivo JSON incluye consultas, mediciones, planes y turnos.
        </p>
        <ul className="space-y-1.5 text-xs text-ink-600">
          <li className="flex gap-2">
            <BadgeCheck className="h-4 w-4 shrink-0 text-leaf-600" /> Recomendado: una vez por semana y antes de cambiar de computadora.
          </li>
          <li className="flex gap-2">
            <BadgeCheck className="h-4 w-4 shrink-0 text-leaf-600" /> Los datos también viven en la base PostgreSQL en la nube (Neon), sincronizados al guardar.
          </li>
          {lastBackup && (
            <li className="flex gap-2">
              <BadgeCheck className="h-4 w-4 shrink-0 text-leaf-600" /> Último respaldo en esta PC: {new Date(lastBackup).toLocaleString("es-AR")}
            </li>
          )}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" loading={loading} icon={<FolderOpen className="h-4 w-4" />} onClick={saveToPc}>
            Guardar en esta PC…
          </Button>
          <Button className="flex-1" variant="secondary" loading={loading} icon={<Download className="h-4 w-4" />} onClick={downloadClassic}>
            Descargar JSON
          </Button>
        </div>
      </div>
    </Card>
  );
}
