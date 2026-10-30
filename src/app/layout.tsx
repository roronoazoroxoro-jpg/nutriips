import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/toast";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NutriIPS", template: "%s · NutriIPS" },
  description: "Consultorio digital para nutricionistas: anamnesis, antropometría ISAK, bioimpedancia, planes alimentarios y seguimiento.",
  applicationName: "NutriIPS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NutriIPS",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1f18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen antialiased">
        <ToastProvider>
          {children}
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
