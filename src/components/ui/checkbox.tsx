"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

/** Checkbox 2.0 (Figma 63:858): caixa de 20 px, amarela quando marcada. */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-borda-forte bg-fundo-superficie outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=checked]:border-destaque-amarelo data-[state=checked]:bg-destaque-amarelo",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="text-destaque-amarelo-texto">
        <IconeFigma src="/painel/icone-check-caixa.svg" tamanho={14} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
