"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { IconeFigma } from "@/components/icone-figma";

const semInscricao = () => () => {};

/**
 * Alternar tema do cabeçalho mobile e do menu (Figma 54:887): um botão redondo de 44 px.
 * O ícone segue a classe `dark` (sem piscar); o rótulo só depende do tema depois de montar,
 * para o HTML do servidor bater com o do navegador.
 */
export function AlternarTemaRedondo() {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useSyncExternalStore(semInscricao, () => true, () => false);
  const escuro = montado && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={!montado ? "Alternar tema" : escuro ? "Usar tema claro" : "Usar tema escuro"}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-borda-padrao bg-fundo-superficie text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <IconeFigma src="/site/icone-lua.svg" tamanho={20} className="dark:hidden" />
      <IconeFigma src="/site/icone-sol.svg" tamanho={20} className="hidden dark:inline-block" />
    </button>
  );
}
