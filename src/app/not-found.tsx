import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <Logo className="mx-auto h-12 w-12" />
        <p className="mt-6 text-sm font-semibold text-leaf-700">Error 404</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-950">Esta página no existe</h1>
        <p className="mt-2 text-sm text-ink-600">Puede que el enlace esté mal escrito o que la ficha se haya eliminado.</p>
        <Link href="/panel" className="mt-6 inline-flex h-10 items-center rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
