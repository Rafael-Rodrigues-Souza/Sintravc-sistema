"use client";

import Form from "next/form";
import { useRef } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { HOME_PAGINA } from "@/conteudo/site";

/**
 * Filtro de Últimas notícias (E62): um seletor “Todas as categorias”, como os de Documentos e do Rádio
 * (E60, E61), no lugar dos chips do Figma. Envia sozinho pelo GET na própria Home, sem rolar a página;
 * sem JavaScript, o botão “Filtrar” envia.
 */
export function SeletorDeCategoria({
  categorias,
  atual,
  total,
}: {
  categorias: { slug: string; nome: string; total: number }[];
  atual: string | null;
  total: number;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const t = HOME_PAGINA;
  const semNoticia = atual && !categorias.some((c) => c.slug === atual) ? atual : null;
  return (
    <Form key={atual ?? ""} ref={formulario} action="/" scroll={false} className="flex items-end gap-3" aria-label="Filtrar as últimas notícias">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:w-[280px] sm:flex-none">
        <label htmlFor="categoria-home" className="texto-rotulo text-texto-primario">
          {t.categoriaRotulo}
        </label>
        <div className="relative">
          <IconeFigma src="/site/icone-filtro.svg" tamanho={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-primario" />
          <select
            id="categoria-home"
            name="categoria"
            defaultValue={atual ?? ""}
            onChange={() => formulario.current?.requestSubmit()}
            className="h-12 w-full min-w-0 cursor-pointer appearance-none truncate rounded-[14px] border border-borda-padrao bg-fundo-superficie pr-10 pl-11 texto-navegacao text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15"
          >
            <option value="">{`${t.todasAsCategorias} (${total})`}</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>{`${c.nome} (${c.total})`}</option>
            ))}
            {semNoticia ? <option value={semNoticia}>{`${semNoticia} (0)`}</option> : null}
          </select>
          <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-texto-secundario" />
        </div>
      </div>
      <noscript>
        <button type="submit" className="h-12 rounded-full border border-borda-forte px-5 texto-botao">
          Filtrar
        </button>
      </noscript>
    </Form>
  );
}
