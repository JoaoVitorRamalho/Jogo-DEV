import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jornada",
  description: "RPG 2D no navegador",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
