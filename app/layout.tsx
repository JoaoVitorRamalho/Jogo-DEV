import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import "./globals.css";

const pixel = Silkscreen({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "Jornada — Região de Asteria",
  description: "RPG 2D de Pokémon para navegador, feito por fãs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={pixel.variable}>
      <body>{children}</body>
    </html>
  );
}
