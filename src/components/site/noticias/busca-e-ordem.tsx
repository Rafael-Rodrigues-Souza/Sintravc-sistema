"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Input } from "@/components/ui/input";
import { NOTICIAS_PAGINA } from "@/conteudo/site";
import { BUSCA_MAXIMA, enderecoDaLista, type FiltrosDaUrl } from "@/lib/noticias-do-site/filtros";

/**
 * Busca e ordem da página Notícias (Figma 80:807 e 80:812; E59). Um formulário GET: Enter busca,
 * e trocar a ordem envia sozinho. Sem JavaScript, o botão “Buscar” envia os dois. A categoria
 * escolhida continua; a página volta para a 1.
 */
export function BuscaEOrdem({ filtros }: { filtros: FiltrosDaUrl }) {
  const formulario = useRef<HTMLFormElement>(null);
  const t = NOTICIAS_PAGINA;
  return (
    <Form ref={formulario} action="/noticias" role="search" aria-label={t.buscaRotulo} className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
      {filtros.categoria ? <input type="hidden" name="categoria" value={filtros.categoria} /> : null}
      <div className="relative w-full lg:w-[400px]">
        <label htmlFor="busca-noticias" className="sr-only">
          {t.buscaRotulo}
        </label>
        <IconeFigma src="/site/icone-busca.svg" tamanho={20} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-texto-terciario" />
        <Input
          id="busca-noticias"
          type="search"
          name="busca"
          defaultValue={filtros.busca}
          placeholder={t.buscaDica}
          maxLength={BUSCA_MAXIMA}
          enterKeyHint="search"
          className="h-14 border-borda-padrao pr-12 pl-[52px]"
        />
        {filtros.busca ? (
          <Link
            href={enderecoDaLista({ categoria: filtros.categoria, ordem: filtros.ordem })}
            aria-label="Limpar a busca"
            className="alvo-toque absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <IconeFigma src="/site/icone-fechar.svg" tamanho={16} />
          </Link>
        ) : null}
      </div>
      <div className="relative shrink-0 sm:w-[210px]">
        <label htmlFor="ordem-noticias" className="sr-only">
          {t.ordemRotulo}
        </label>
        <IconeFigma src="/site/icone-filtro.svg" tamanho={18} className="pointer-events-none absolute top-1/2 left-[18px] -translate-y-1/2 text-texto-primario" />
        <select
          id="ordem-noticias"
          name="ordem"
          defaultValue={filtros.ordem}
          onChange={() => formulario.current?.requestSubmit()}
          className="h-14 w-full cursor-pointer appearance-none rounded-[14px] border border-borda-padrao bg-fundo-superficie pr-11 pl-12 texto-navegacao text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15"
        >
          <option value="recentes">Mais recentes</option>
          <option value="antigas">Mais antigas</option>
        </select>
        <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-texto-primario" />
      </div>
      <noscript>
        <button type="submit" className="h-14 rounded-[14px] border border-borda-padrao px-5 texto-botao">
          Buscar
        </button>
      </noscript>
    </Form>
  );
}
