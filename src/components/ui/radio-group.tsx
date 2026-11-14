"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Grupo de opções em cartão (Figma 168:19100: perfil do convite). */
function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  // No toque, 20 px entre as opções: a área de 44 px de um marcador não cobre a do vizinho (E48).
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("flex flex-col gap-2.5 pointer-coarse:gap-5", className)} {...props} />;
}

/** Marcador de 20 px: borda forte; marcado, azul com o ponto no meio. */
function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "alvo-toque flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-borda-forte bg-fundo-superficie outline-none transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=checked]:border-destaque-azul disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="size-2.5 rounded-full bg-destaque-azul" />
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
