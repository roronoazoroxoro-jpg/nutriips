import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Panel compartido" };

export default function SharedPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-ink-900/[0.06] bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/" className="min-w-0">
            <span className="font-display text-lg font-semibold tracking-tight text-ink-950">NutriIPS</span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-leaf-700">Panel compartido</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-xl px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-900/5 hover:text-ink-950">
              Inicio
            </Link>
            <Link href="/" className="rounded-xl bg-ink-950 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800">
              Entrar a mi consultorio
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">{children}</main>
    </div>
  );
}
