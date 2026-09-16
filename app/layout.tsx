import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CASAQUEST — Guardiões da Base",
  description: "Cumpra missões. Ganhe conquistas. Evolua sua Base.",
  applicationName: "CASAQUEST",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CASAQUEST" },
};

export const viewport: Viewport = {
  themeColor: "#070b1d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
