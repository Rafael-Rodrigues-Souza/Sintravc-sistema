import * as React from "react";

import { cn } from "@/lib/utils";

/** Área de texto com o mesmo visual da entrada do Campo 2.0 (Figma 63:853). */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-[88px] w-full min-w-0 resize-y rounded-[14px] border border-borda-forte bg-fundo-superficie px-4 py-3 texto-corpo text-texto-primario",
        "placeholder:text-texto-terciario outline-none transition-[border-color,box-shadow]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destaque-vermelho aria-invalid:shadow-[inset_0_0_0_0.5px_var(--destaque-vermelho)]",
        "focus-visible:border-destaque-azul focus-visible:shadow-[inset_0_0_0_1px_var(--destaque-azul),0_0_0_4px_color-mix(in_srgb,var(--destaque-azul)_16%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
