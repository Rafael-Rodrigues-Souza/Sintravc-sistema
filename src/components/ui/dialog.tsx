"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

/**
 * Modal 2.0 (Figma 168:19064): cabeçalho com título e descrição e o botão fechar,
 * corpo com rolagem e rodapé com as ações.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-fundo-sobreposicao data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[20px] border border-borda-padrao bg-fundo-superficie outline-none",
          "duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex items-start gap-4 border-b border-borda-padrao pt-6 pr-6 pb-5 pl-7">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <DialogPrimitive.Title className="texto-titulo-card-grande text-texto-primario">{titulo}</DialogPrimitive.Title>
        {descricao ? (
          <DialogPrimitive.Description className="texto-pequeno text-texto-secundario">{descricao}</DialogPrimitive.Description>
        ) : null}
      </div>
      <DialogPrimitive.Close
        aria-label="Fechar"
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-borda-padrao text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
      </DialogPrimitive.Close>
    </div>
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-[18px] overflow-y-auto px-7 py-6", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 border-t border-borda-padrao bg-fundo-superficie-alt px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTrigger };
