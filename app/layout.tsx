import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boletim SPT",
  description:
    "Cadastro de sondagens SPT e geração de boletins de sondagem em PDF — substituto do GEO5 Estratigrafia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
