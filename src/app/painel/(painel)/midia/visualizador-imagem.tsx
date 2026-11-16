"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { enquadramentoDaImagem } from "@/lib/midia/apresentacao";
import { cn } from "@/lib/utils";

export type ImagemParaVer = {
  url: string;
  nomeArquivo: string;
  alt: string | null;
  /** PNG ou WebP (logos): a imagem aparece sobre o xadrez, como na prévia (E48). */
  mostrarInteira: boolean;
};

/**
 * Visualizador de imagem da Mídia (E53): a imagem inteira em tela cheia, sobre o painel. Não tem frame
 * no Figma: segue o Dialog do E23 e, no celular, o padrão do E50 (topo compacto, ações ao alcance do
 * polegar). O fundo é escuro nos dois temas, como em todo visualizador de fotos.
 */
export function VisualizadorImagem({
  imagem,
  aberto,
  aoMudar,
  aoDevolverFoco,
}: {
  imagem: ImagemParaVer;
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  /** Para onde o foco volta ao fechar: quem abriu (a prévia ou “Ver inteira”). */
  aoDevolverFoco: () => void;
}) {
  const { fundo } = enquadramentoDaImagem(imagem.mostrarInteira);

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={aoMudar}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-slot="visualizador-imagem"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            aoDevolverFoco();
          }}
          className="fixed inset-0 z-50 flex flex-col bg-fundo-marinho-profundo text-texto-invertido outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate texto-titulo-card-pequeno">
              {imagem.nomeArquivo}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Use + e − para o zoom e as setas para mover a imagem ampliada. Esc fecha.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              aria-label="Fechar a imagem"
              className="alvo-toque flex size-10 shrink-0 items-center justify-center rounded-full bg-sobre-escuro-chip outline-none hover:bg-sobre-escuro-borda focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
            {/* A URL vem do armazenamento (R2/MinIO), fora do otimizador de imagens do Next. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem.url}
              alt={imagem.alt ?? ""}
              draggable={false}
              className={cn("max-h-full max-w-full object-contain select-none", fundo)}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
