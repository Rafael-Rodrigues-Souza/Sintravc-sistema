"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

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
