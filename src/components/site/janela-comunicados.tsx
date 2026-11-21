"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { useFecharPeloVoltar } from "@/components/use-fechar-pelo-voltar";

import { useDeslize } from "./deslize";
import type { ComunicadoNaFaixa } from "./faixa-comunicado";

const botaoNoEscuro =
  "alvo-toque flex size-10 shrink-0 items-center justify-center rounded-full bg-sobre-escuro-chip outline-none hover:bg-sobre-escuro-borda focus-visible:ring-[3px] focus-visible:ring-texto-invertido";

/**
 * Janela dos comunicados (E58), aberta pelo título na faixa ou por um cartão da página Comunicados. Não tem frame no Figma: segue o
 * visualizador da Mídia (E53), com o fundo escuro semitransparente por cima do site.
 *
 * - O título grande e o texto inteiro, no amarelo da faixa, com o “Saiba mais”; com dois ou mais, “1 de N”, setas
 *   (também as do teclado) e deslize do dedo. A lista de todos fica na página /comunicados.
 * - Fecha pelo X, pelo Esc, tocando fora e pelo voltar do celular, sem sobrar entrada no histórico.
 *   Quem abriu cuida de devolver o foco (`aoDevolverFoco`).
 *
 * O comunicado mostrado é o mesmo da faixa (`indice`): ao fechar, a faixa fica nele.
 */
export function JanelaComunicados({
  comunicados,
  indice,
  aoIr,
  aberta,
  aoFechar,
  aoDevolverFoco,
}: {
  comunicados: ComunicadoNaFaixa[];
  indice: number;
  aoIr: (indice: number) => void;
  aberta: boolean;
  aoFechar: () => void;
  aoDevolverFoco: () => void;
}) {
  // Quem abre é a faixa: aqui só se fecha.
  const mudar = useFecharPeloVoltar("janelaDosComunicados", aberta, (abrir) => {
    if (!abrir) aoFechar();
  });

  const total = comunicados.length;
  const varios = total > 1;
  const passar = (passo: -1 | 1) => aoIr((indice + passo + total) % total);
  const ouvintes = useDeslize((passo) => {
    if (varios) passar(passo);
  });
  const atual = comunicados[indice];

  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={mudar}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-fundo-visualizador data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          data-testid="janela-comunicados"
          data-fundo
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            aoDevolverFoco();
          }}
          onKeyDown={(evento) => {
            if (!varios || evento.altKey || evento.ctrlKey || evento.metaKey) return;
            if (evento.key === "ArrowRight") passar(1);
            else if (evento.key === "ArrowLeft") passar(-1);
            else return;
            evento.preventDefault();
          }}
          {...ouvintes}
          onClick={(evento) => {
            // Tocar fora (no fundo, fora do cartão e dos botões) fecha.
            if ((evento.target as HTMLElement).hasAttribute("data-fundo")) mudar(false);
          }}
          className="fixed inset-0 z-50 flex touch-pan-y touch-pinch-zoom flex-col overflow-y-auto text-texto-invertido outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          <div
            // Barra opaca, como no visualizador da Mídia: o contraste não depende do site que aparece atrás.
            className="flex items-center gap-3 bg-fundo-marinho-profundo px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 lg:px-8"
          >
            <DialogPrimitive.Title className="min-w-0 flex-1 texto-titulo-card">
              Comunicado
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {varios ? "Use as setas ou deslize para o lado para passar. Esc fecha." : "Esc fecha."}
            </DialogPrimitive.Description>
            <DialogPrimitive.Close aria-label="Fechar" className={botaoNoEscuro}>
              <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
            </DialogPrimitive.Close>
          </div>

          <div data-fundo className="flex flex-1 flex-col items-center justify-center-safe gap-6 pt-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8">
            {atual ? (
              <>
                <article
                  aria-roledescription="comunicado"
                  className="flex w-full max-w-3xl flex-col gap-5 rounded-[20px] bg-destaque-amarelo p-6 text-destaque-marinho-fixo lg:gap-6 lg:p-10"
                >
                  <p className="flex items-center gap-2 texto-eyebrow uppercase">
                    <IconeFigma src="/site/comunicado-megafone.svg" tamanho={18} />
                    Comunicado
                  </p>
                  <div aria-live="polite" aria-atomic className="flex flex-col gap-3 lg:gap-4">
                    <p className="texto-titulo-secao-mobile break-words lg:texto-titulo-secao">{atual.titulo}</p>
                    <p data-testid="texto-do-comunicado" className="texto-corpo break-words whitespace-pre-line lg:text-[18px] lg:leading-[1.6]">
                      {atual.texto}
                    </p>
                  </div>
                  {atual.link ? (
                    <a
                      href={atual.link.href}
                      {...(atual.link.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="flex min-h-11 items-center gap-1.5 self-start rounded-[6px] texto-botao underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo"
                    >
                      Saiba mais
                      {atual.link.externo ? <span className="sr-only"> (abre em outra aba)</span> : null}
                      <IconeFigma src="/site/comunicado-seta-direita.svg" tamanho={16} />
                    </a>
                  ) : null}
                </article>

                {varios ? (
                  <div className="flex items-center gap-1 rounded-full bg-fundo-marinho-profundo p-1.5 ring-1 ring-sobre-escuro-borda">
                    <button type="button" onClick={() => passar(-1)} aria-label="Comunicado anterior" className={botaoNoEscuro}>
                      <ChevronLeft aria-hidden className="size-5" />
                    </button>
                    <p className="w-16 text-center texto-corpo tabular-nums">
                      <span className="sr-only">Comunicado </span>
                      {indice + 1} de {total}
                    </p>
                    <button type="button" onClick={() => passar(1)} aria-label="Próximo comunicado" className={botaoNoEscuro}>
                      <ChevronRight aria-hidden className="size-5" />
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
