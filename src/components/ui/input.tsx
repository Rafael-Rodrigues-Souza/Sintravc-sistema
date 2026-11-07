import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Entrada do Campo 2.0 (Figma 63:853).
 * Padrão: 52 px, cantos de 14 px, borda 1 px `borda/forte`, fundo `fundo/superficie`.
 * Foco: borda 2 px `destaque/azul` + anel de 4 px do mesmo azul a 16%.
 * Erro (`aria-invalid`): borda 1,5 px `destaque/vermelho`.
 * As bordas mais grossas são feitas com sombra interna, para o campo não mudar de tamanho.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[52px] w-full min-w-0 rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 texto-corpo text-texto-primario",
        "placeholder:text-texto-terciario outline-none transition-[border-color,box-shadow]",
        "file:mr-3 file:border-0 file:bg-transparent file:texto-rotulo file:text-texto-primario",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destaque-vermelho aria-invalid:shadow-[inset_0_0_0_0.5px_var(--destaque-vermelho)]",
        "focus-visible:border-destaque-azul focus-visible:shadow-[inset_0_0_0_1px_var(--destaque-azul),0_0_0_4px_color-mix(in_srgb,var(--destaque-azul)_16%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
