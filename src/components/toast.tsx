"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type Toast = { id: number; tone: "success" | "error"; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const push = useCallback(
    (tone: Toast["tone"], message: string) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3200);
    },
    [dismiss]
  );

  const [value] = useState<ToastApi>(() => ({
    success: (message) => push("success", message),
    error: (message) => push("error", message),
  }));

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl bg-ink-950 px-4 py-3 text-sm text-white shadow-lift"
          >
            {toast.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-300" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            )}
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="text-white/60 hover:text-white" aria-label="Cerrar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast fuera de ToastProvider");
  return context;
}
