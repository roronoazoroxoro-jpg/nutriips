import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SessionProvider } from "@/components/session";

export const metadata: Metadata = { title: "Consultorio" };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
