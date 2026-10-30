"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "./ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(standalone));
    if (standalone || localStorage.getItem("nutriips_hide_install") === "1") return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // Edge / Chrome on desktop: show tip even if prompt is delayed
    const tip = window.setTimeout(() => {
      if (!standalone) setVisible(true);
    }, 4000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(tip);
    };
  }, []);

  if (isStandalone || !visible) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        setDeferred(null);
      }
      return;
    }
    alert("Para instalar NutriIPS en el escritorio:\n\n1. Abrí el menú del navegador (⋮)\n2. Elegí “Instalar aplicación” o “Aplicaciones → Instalar esta página”\n\nTambién podés usar el acceso directo “Instalar NutriIPS” del Escritorio.");
  }

  function dismiss() {
    localStorage.setItem("nutriips_hide_install", "1");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg animate-fade-in rounded-2xl border border-ink-900/10 bg-white p-4 shadow-lift md:left-auto">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-50 text-leaf-700">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-950">Instalar NutriIPS en el escritorio</p>
          <p className="mt-0.5 text-xs text-ink-600">Queda como una app: se abre sola, sin barra del navegador, y la encontrás en el menú Inicio.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={install}>
              Instalar ahora
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Ahora no
            </Button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-1 text-ink-400 hover:bg-ink-900/5 hover:text-ink-700" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
