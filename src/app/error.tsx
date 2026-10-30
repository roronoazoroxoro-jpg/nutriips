"use client";

import { useEffect } from "react";
import { Logo } from "@/components/Logo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <Logo className="mx-auto h-12 w-12" />
        <h1 className="mt-6 text-2xl font-semibold text-ink-950">Algo no salió como esperábamos</h1>
        <p className="mt-2 text-sm text-ink-600">Tus datos están a salvo. Probá recargar la pantalla; si el problema sigue, reiniciá NutriIPS.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="inline-flex h-10 items-center rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800">
            Reintentar
          </button>
          <a href="/panel" className="inline-flex h-10 items-center rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-semibold text-ink-900 hover:bg-sand-50">
            Ir al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
