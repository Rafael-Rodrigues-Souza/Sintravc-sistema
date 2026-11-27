"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * O cabeçalho preso no alto (E63): no topo da página, sem borda; depois de rolar um pouco, ganha a
 * borda e uma sombra leve, para se separar do conteúdo que passa por baixo. O servidor desenha o
 * estado do topo; o navegador acerta depois de montar.
 */
export function CabecalhoFixo({ children }: { children: React.ReactNode }) {
  const [rolou, setRolou] = React.useState(false);
  React.useEffect(() => {
    const ler = () => setRolou(window.scrollY > 8);
    ler();
    window.addEventListener("scroll", ler, { passive: true });
    return () => window.removeEventListener("scroll", ler);
  }, []);
  return (
    <header
      data-rolou={rolou ? "" : undefined}
      className={cn(
        "sticky top-0 z-30 border-b bg-fundo-cabecalho transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none print:static",
        rolou ? "border-borda-padrao shadow-[0_6px_24px_rgb(10_20_36/0.08)]" : "border-transparent",
      )}
    >
      {children}
    </header>
  );
}
