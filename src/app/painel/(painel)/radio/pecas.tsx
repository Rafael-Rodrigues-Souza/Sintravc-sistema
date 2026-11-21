"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Computador e tablet deitado: modal. Abaixo de lg: folha inferior (E49, E50). */
export function useTelaGrande() {
  const [grande, setGrande] = React.useState(true);
  React.useEffect(() => {
    const consulta = window.matchMedia("(min-width: 1024px)");
    const mudar = () => setGrande(consulta.matches);
    mudar();
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);
  return grande;
}

/** Interruptor (Figma 166:17373 e 166:17629): botão com role="switch", como o do editor de documento. */
export function Interruptor({
  ligado,
  rotuloId,
  descricaoId,
  aoMudar,
  desativado,
}: {
  ligado: boolean;
  rotuloId: string;
  descricaoId?: string;
  aoMudar: (ligado: boolean) => void;
  desativado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-labelledby={rotuloId}
      aria-describedby={descricaoId}
      disabled={desativado}
      onClick={() => aoMudar(!ligado)}
      className={cn(
        "relative alvo-toque inline-flex h-7 w-12 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-60 motion-reduce:transition-none",
        // Contraste ≥ 3:1 com o cartão e com a bolinha nos dois temas (WCAG 1.4.11).
        ligado ? "bg-destaque-azul" : "bg-texto-terciario",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-5 rounded-full bg-fundo-superficie shadow transition-transform motion-reduce:transition-none",
          ligado ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export const SEM_CONEXAO: { tipo: "erro"; mensagem: string; campo?: string } = {
  tipo: "erro",
  mensagem: "Sem conexão com o servidor. Confira a internet e tente de novo.",
};
