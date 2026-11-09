"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

/**
 * Confirmação 2.0 (Figma 118:3448, "Confirmações"): modal curto sobre a tela, com ícone,
 * título, texto e rodapé cinza. O botão principal sempre descreve a ação (E23).
 */
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;
const AlertDialogAction = AlertDialogPrimitive.Action;

const COR_DO_ICONE = {
  perigo: "bg-status-perigo-fundo text-status-perigo-texto",
  aviso: "bg-status-aviso-fundo text-status-aviso-texto",
  neutro: "bg-status-neutro-fundo text-texto-secundario",
} as const;

function AlertDialogContent({
  className,
  icone,
  tom = "neutro",
  titulo,
  descricao,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AlertDialogPrimitive.Content>, "title"> & {
  icone: string;
  tom?: keyof typeof COR_DO_ICONE;
  titulo: string;
  descricao: React.ReactNode;
}) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay
        data-slot="alert-dialog-overlay"
        className="fixed inset-0 z-50 bg-fundo-sobreposicao data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-borda-padrao bg-fundo-superficie shadow-[0px_12px_32px_0px_rgba(3,13,31,0.16)] outline-none",
          "duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <div className="flex flex-col gap-3.5 px-6 pt-6 pb-5">
          <span className={cn("flex size-12 items-center justify-center rounded-full", COR_DO_ICONE[tom])}>
            <IconeFigma src={icone} tamanho={22} />
          </span>
          <AlertDialogPrimitive.Title className="texto-titulo-card text-texto-primario">{titulo}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="texto-pequeno text-texto-secundario">
            {descricao}
          </AlertDialogPrimitive.Description>
        </div>
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2.5 border-t border-borda-padrao bg-fundo-superficie-alt px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogTrigger };
