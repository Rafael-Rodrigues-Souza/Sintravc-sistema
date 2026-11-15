"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

/**
 * Folha inferior (Drawer do shadcn/ui; Figma 170:18978, “Novo comunicado”): sobe de baixo com
 * altura parcial e fecha ao tocar fora, ao arrastar para baixo e com Esc. Nunca tela cheia.
 *
 * Único arquivo que importa o vaul (E49): o projeto está sem manutenção. Se precisar trocar, a saída
 * é um Dialog do radix-ui com cara de folha inferior, mexendo só aqui (a regra do ESLint garante).
 */
function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root {...props} />;
}

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerClose = DrawerPrimitive.Close;

function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay data-slot="drawer-overlay" className="fixed inset-0 z-50 bg-fundo-sobreposicao" />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[24px] border-t border-borda-padrao bg-fundo-superficie outline-none",
          "pb-[env(safe-area-inset-bottom)]",
          className,
        )}
        {...props}
      >
        {/* A alça: mostra que a folha arrasta para baixo. */}
        <div aria-hidden className="mx-auto mt-2.5 mb-1 h-1 w-10 shrink-0 rounded-full bg-borda-forte" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

function DrawerHeader({ titulo, descricao, oculto = false }: { titulo: string; descricao?: string; oculto?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 px-5 pt-3 pb-2", oculto && "sr-only")}>
      <DrawerPrimitive.Title className="texto-titulo-card-grande text-texto-primario">{titulo}</DrawerPrimitive.Title>
      {descricao ? <DrawerPrimitive.Description className="texto-pequeno text-texto-secundario">{descricao}</DrawerPrimitive.Description> : null}
    </div>
  );
}

/** Corpo da folha: rola por dentro quando o conteúdo passa da altura (tela baixa, E48). */
function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-body" className={cn("flex min-h-0 flex-col overflow-y-auto px-3 pb-4", className)} {...props} />;
}

export { Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerHeader, DrawerTrigger };
