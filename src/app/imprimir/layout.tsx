import type { Metadata } from "next";

export const metadata: Metadata = { title: "Documento" };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-sand-100 print:bg-white">{children}</div>;
}
