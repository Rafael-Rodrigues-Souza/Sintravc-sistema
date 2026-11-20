"use client";

import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { useFecharPeloVoltar } from "@/components/use-fechar-pelo-voltar";
import { cn } from "@/lib/utils";

import { useDeslize } from "./deslize";
import type { ComunicadoNaFaixa } from "./faixa-comunicado";

export type VistaDaJanela = "destaque" | "lista";

const botaoNoEscuro =
  "alvo-toque flex size-10 shrink-0 items-center justify-center rounded-full bg-sobre-escuro-chip outline-none hover:bg-sobre-escuro-borda focus-visible:ring-[3px] focus-visible:ring-texto-invertido";

/**
 * Janela dos comunicados (E58), aberta pela mensagem ou pelo “Ver todos” da faixa. Não tem frame no
 * Figma: segue o visualizador da Mídia (E53), com o fundo escuro semitransparente por cima do site.
 *
 * - Destaque: a mensagem grande, no amarelo da faixa, com o “Saiba mais”; com dois ou mais, “1 de N”,
 *   setas (também as do teclado), deslize do dedo e “Ver todos”.
 * - Lista: todos os comunicados no ar, na ordem da fila; tocar num mostra ele em destaque.
 * - Fecha pelo X, pelo Esc, tocando fora e pelo voltar do celular, sem sobrar entrada no histórico.
 *   Quem abriu cuida de devolver o foco (`aoDevolverFoco`).
 *
 * O comunicado mostrado é o mesmo da faixa (`indice`): ao fechar, a faixa fica nele.
 */
export function JanelaComunicados({
  comunicados,
  indice,
  aoIr,
  vista,
  aoMudarVista,
  aoDevolverFoco,
}: {
  comunicados: ComunicadoNaFaixa[];
  indice: number;
  aoIr: (indice: number) => void;
  /** null: fechada. */
  vista: VistaDaJanela | null;
  aoMudarVista: (vista: VistaDaJanela | null) => void;
  aoDevolverFoco: () => void;
}) {
  // Quem abre é a faixa (aoMudarVista): aqui só se fecha.
  const mudar = useFecharPeloVoltar("janelaDosComunicados", vista !== null, (aberta) => {
    if (!aberta) aoMudarVista(null);
  });

  const total = comunicados.length;
  const varios = total > 1;
  const passar = (passo: -1 | 1) => aoIr((indice + passo + total) % total);
  const ouvintes = useDeslize((passo) => {
    if (varios && vista === "destaque") passar(passo);
  });
  const atual = comunicados[indice];

  return (
    <DialogPrimitive.Root open={vista !== null} onOpenChange={mudar}>
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
            if (vista !== "destaque" || !varios || evento.altKey || evento.ctrlKey || evento.metaKey) return;
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
              {vista === "lista" ? "Todos os comunicados" : "Comunicado"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {vista === "lista"
                ? "Escolha um para ver em destaque. Esc fecha."
                : varios
                  ? "Use as setas ou deslize para o lado para passar. Esc fecha."
                  : "Esc fecha."}
            </DialogPrimitive.Description>
            <DialogPrimitive.Close aria-label="Fechar" className={botaoNoEscuro}>
              <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
            </DialogPrimitive.Close>
          </div>

          <div data-fundo className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8">
            {vista === "lista" ? (
              <ol aria-label="Comunicados no ar, na ordem da fila" className="flex w-full max-w-3xl flex-col gap-3">
                {comunicados.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={i === indice ? "true" : undefined}
                      onClick={() => {
                        aoIr(i);
                        aoMudarVista("destaque");
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[16px] bg-destaque-amarelo p-4 text-left text-destaque-marinho-fixo outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-texto-invertido lg:p-5",
                        i === indice && "ring-[3px] ring-texto-invertido/70",
                      )}
                    >
                      <span aria-hidden className="texto-pequeno shrink-0 tabular-nums opacity-70">
                        {i + 1}.
                      </span>
                      <span className="min-w-0 flex-1 texto-titulo-card-pequeno break-words">{c.mensagem}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : atual ? (
              <>
                <article
                  aria-roledescription="comunicado"
                  className="flex w-full max-w-3xl flex-col gap-5 rounded-[20px] bg-destaque-amarelo p-6 text-destaque-marinho-fixo lg:gap-6 lg:p-10"
                >
                  <p className="flex items-center gap-2 texto-eyebrow uppercase">
                    <IconeFigma src="/site/comunicado-megafone.svg" tamanho={18} />
                    Comunicado
                  </p>
                  <p aria-live="polite" aria-atomic className="texto-titulo-secao-mobile break-words lg:texto-titulo-secao">
                    {atual.mensagem}
                  </p>
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
                  <div className="flex items-center gap-2 rounded-full bg-fundo-marinho-profundo p-1.5 pr-2 ring-1 ring-sobre-escuro-borda">
                    <div className="flex items-center gap-1">
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
                    <button
                      type="button"
                      onClick={() => aoMudarVista("lista")}
                      className="alvo-toque flex min-h-10 items-center gap-2 rounded-full px-3 texto-botao underline underline-offset-2 outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-texto-invertido"
                    >
                      <List aria-hidden className="size-4" />
                      Ver todos
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
