import { Coffee } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { TemaToggle } from "@/components/TemaToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letreiros 3D | Personalize e baixe para imprimir",
  description: "Escolha um modelo, personalize texto, fontes e cores, veja a prévia 3D e baixe STL/3MF prontos para impressão.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-superficie focus:p-2">
            Pular para o conteúdo
          </a>
          <header className="sticky top-0 z-30 border-b border-borda bg-superficie/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
              <Link href="/" className="text-base font-semibold tracking-tight">
                Letreiros<span className="text-marca"> 3D</span>
              </Link>
              <div className="flex items-center gap-1">
                <nav aria-label="Principal">
                  <Link href="/apoie" className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition hover:bg-fundo">
                    <Coffee className="size-4" aria-hidden />
                    Apoie
                  </Link>
                </nav>
                <TemaToggle />
              </div>
            </div>
          </header>
          <main id="conteudo">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
