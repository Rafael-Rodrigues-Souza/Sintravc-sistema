"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

const semInscricao = () => () => {};

/**
 * Alternar tema do cabeçalho desktop (Figma 295:51139): sol e lua lado a lado, com a opção atual
 * em destaque. O destaque segue a classe `dark` (sem piscar); o `aria-pressed` vem depois de montar.
 */
export function AlternarTemaSite() {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useSyncExternalStore(semInscricao, () => true, () => false);
  const escuro = montado && resolvedTheme === "dark";
  const opcao =
    "alvo-toque flex size-[34px] items-center justify-center rounded-full text-texto-secundario outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

  return (
    <div role="group" aria-label="Tema" className="flex items-center gap-0.5 rounded-full border border-borda-padrao bg-fundo-superficie-alt p-1">
      <button
        type="button"
        aria-label="Tema claro"
        aria-pressed={montado ? !escuro : undefined}
        onClick={() => setTheme("light")}
        className={cn(opcao, "not-dark:bg-fundo-superficie not-dark:text-texto-primario not-dark:shadow-[0_1px_3px_rgba(0,0,0,0.12)]")}
      >
        <IconeFigma src="/site/icone-sol.svg" tamanho={18} />
      </button>
      <button
        type="button"
        aria-label="Tema escuro"
        aria-pressed={montado ? escuro : undefined}
        onClick={() => setTheme("dark")}
        className={cn(opcao, "dark:bg-fundo-superficie dark:text-texto-primario dark:shadow-[0_1px_3px_rgba(0,0,0,0.12)]")}
      >
        <IconeFigma src="/site/icone-lua.svg" tamanho={18} />
      </button>
    </div>
  );
}
