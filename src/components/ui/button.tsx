import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Botão 2.0 (Figma 31:601).
 * Altura 48, cantos arredondados, 24 px nas laterais (20 px à esquerda quando há ícone),
 * espaço de 8 px entre ícone (18 px) e rótulo, texto no estilo “2.0/Botão”.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full texto-botao",
    "transition-[color,background-color,border-color,box-shadow,filter] outline-none select-none",
    "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        primario:
          "bg-destaque-amarelo text-destaque-amarelo-texto hover:brightness-95 active:brightness-90",
        secundario:
          "border-[1.5px] border-borda-forte bg-transparent text-texto-primario hover:bg-fundo-superficie-alt",
        "sobre-escuro":
          "border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido hover:bg-sobre-escuro-chip focus-visible:ring-destaque-amarelo",
        marinho:
          "bg-destaque-marinho-fixo text-texto-invertido hover:brightness-125 active:brightness-110",
        perigo:
          "bg-destaque-vermelho text-texto-invertido hover:brightness-95 active:brightness-90 dark:text-destaque-marinho-fixo",
      },
      size: {
        padrao: "h-12 px-6 has-[>svg]:pl-5",
        // 40 px no desenho; no toque, a área chega ao mínimo sem mudar o desenho (alvo-toque, E48).
        pequeno: "alvo-toque h-10 px-5 has-[>svg]:pl-4",
        icone: "size-12",
      },
    },
    defaultVariants: {
      variant: "primario",
      size: "padrao",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "primario"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
