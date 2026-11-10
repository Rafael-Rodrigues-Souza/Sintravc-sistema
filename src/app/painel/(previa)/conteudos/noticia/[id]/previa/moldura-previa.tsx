"use client";

import { ChevronLeft, Eye, Monitor, Smartphone, Upload } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ListaAntesDePublicar } from "@/components/painel/antes-de-publicar";
import type { DadosNoticia } from "@/lib/conteudos/dados";
import { cn } from "@/lib/utils";

type Tela = "computador" | "celular";

/**
 * Barra e moldura da prévia (Figma 122:5800): voltar ao editor, troca Computador/Celular e
 * "Publicar…", que volta ao editor com a confirmação aberta (o editor confere tudo de novo).
 */
export function MolduraPrevia({
  id,
  dados,
  selo,
  rotuloPublicar,
  children,
}: {
  id: string;
  dados: DadosNoticia;
  selo: string;
  /** Nulo: nada a publicar ou o perfil não publica. */
  rotuloPublicar: string | null;
  children: React.ReactNode;
}) {
  const [tela, setTela] = React.useState<Tela>("computador");
  const editor = `/painel/conteudos/noticia/${id}`;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 bg-fundo-marinho-profundo px-4 py-3 text-texto-invertido sm:px-8">
        <Link
          href={editor}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-sobre-escuro-borda px-4 texto-botao outline-none hover:bg-sobre-escuro-superficie focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeft aria-hidden className="size-[18px]" />
          Voltar ao editor
        </Link>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-destaque-amarelo px-3 py-1 texto-etiqueta uppercase text-destaque-amarelo-texto">
          <Eye aria-hidden className="size-3.5" />
          {selo}
        </p>
        <div
          role="group"
          aria-label="Ver como no"
          className="ml-auto hidden items-center gap-1 rounded-full bg-sobre-escuro-superficie p-1 md:flex"
        >
          {(
            [
              ["computador", "Computador", Monitor],
              ["celular", "Celular", Smartphone],
            ] as const
          ).map(([valor, rotulo, Icone]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={tela === valor}
              onClick={() => setTela(valor)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-4 texto-botao outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                tela === valor ? "bg-fundo-superficie text-texto-primario" : "text-texto-invertido-sec hover:text-texto-invertido",
              )}
            >
              <Icone aria-hidden className="size-[18px]" />
              {rotulo}
            </button>
          ))}
        </div>
        {rotuloPublicar ? (
          <Link
            href={`${editor}?publicar=1`}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-destaque-amarelo px-5 texto-botao text-destaque-amarelo-texto outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring max-md:ml-auto"
          >
            <Upload aria-hidden className="size-[18px]" />
            {rotuloPublicar}
          </Link>
        ) : null}
      </header>

      <div
        className={cn(
          "flex flex-1 flex-col gap-6 md:p-8",
          tela === "celular" && "md:flex-row md:items-start md:justify-center",
        )}
      >
        <div
          data-testid="moldura-da-previa"
          data-tela={tela}
          className={cn(
            "w-full overflow-hidden bg-fundo-pagina md:rounded-[24px] md:border md:border-borda-padrao",
            tela === "celular" && "md:w-[390px] md:shrink-0 md:rounded-[40px] md:border-[12px] md:border-fundo-marinho",
          )}
        >
          {children}
        </div>
        <aside className="mx-4 mb-8 flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 md:mx-0 md:w-[330px]">
          <h2 className="texto-titulo-card text-texto-primario">Confira antes de publicar</h2>
          <ListaAntesDePublicar dados={dados} />
        </aside>
      </div>
    </div>
  );
}
