"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Input } from "@/components/ui/input";
import { RADIO_PAGINA } from "@/conteudo/site";
import { BUSCA_MAXIMA, enderecoDoRadio, type FiltrosDoRadio } from "@/lib/episodios/filtros";
import type { TemaDoSite } from "@/lib/episodios/site";

/**
 * Busca e tema (Figma 157:8436 e 157:8451; E61). Um formulário GET: Enter busca e trocar o tema envia
 * sozinho. O tema era uma fileira de chips no Figma e virou um seletor, como os de Documentos (E60),
 * com “Todos os temas” e só os temas com episódio no ar; some quando não há tema. Sem JavaScript, o
 * botão “Buscar” envia tudo. Um tema da URL sem episódio aparece selecionado com (0): o seletor e a
 * lista nunca discordam.
 */
export function BuscaETema({ filtros, temas, total }: { filtros: FiltrosDoRadio; temas: TemaDoSite[]; total: number }) {
  const formulario = useRef<HTMLFormElement>(null);
  const t = RADIO_PAGINA;
  const temaDaUrlSemEpisodio = filtros.tema && !temas.some((tema) => tema.slug === filtros.tema) ? filtros.tema : null;
  const mostraTema = temas.length > 0 || !!temaDaUrlSemEpisodio;

  return (
    <Form
      // Recriado a cada endereço: depois de “Limpar a busca” ou do Voltar, os campos mostram o que a URL diz.
      key={enderecoDoRadio(filtros)}
      ref={formulario}
      action="/radio-chofer"
      role="search"
      aria-label={t.buscaRotulo}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label htmlFor="busca-radio" className="texto-rotulo text-texto-primario">
          {t.buscaRotulo}
        </label>
        <div className="relative">
          <IconeFigma src="/site/icone-busca.svg" tamanho={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-terciario" />
          <Input
            id="busca-radio"
            type="search"
            name="busca"
            defaultValue={filtros.busca}
            placeholder={t.buscaDica}
            maxLength={BUSCA_MAXIMA}
            enterKeyHint="search"
            className={filtros.busca ? "h-12 border-borda-padrao pr-12 pl-12" : "h-12 border-borda-padrao pl-12"}
          />
          {filtros.busca ? (
            <Link
              href={enderecoDoRadio({ tema: filtros.tema }, "#episodios")}
              aria-label={t.limparBusca}
              className="alvo-toque absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconeFigma src="/site/icone-fechar.svg" tamanho={16} />
            </Link>
          ) : null}
        </div>
      </div>
      {mostraTema ? (
        <div className="relative flex flex-col gap-2 sm:w-[260px]">
          <label htmlFor="tema-radio" className="texto-rotulo text-texto-primario">
            {t.temaRotulo}
          </label>
          <div className="relative">
            <IconeFigma src="/site/icone-filtro.svg" tamanho={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-primario" />
            <select
              id="tema-radio"
              name="tema"
              defaultValue={filtros.tema ?? ""}
              onChange={() => formulario.current?.requestSubmit()}
              className="h-12 w-full min-w-0 cursor-pointer appearance-none truncate rounded-[14px] border border-borda-padrao bg-fundo-superficie pr-10 pl-11 texto-navegacao text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15"
            >
              <option value="">{`${t.todosOsTemas} (${total})`}</option>
              {temas.map((tema) => (
                <option key={tema.slug} value={tema.slug}>
                  {`${tema.nome} (${tema.total})`}
                </option>
              ))}
              {temaDaUrlSemEpisodio ? <option value={temaDaUrlSemEpisodio}>{`${temaDaUrlSemEpisodio} (0)`}</option> : null}
            </select>
            <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-texto-primario" />
          </div>
        </div>
      ) : null}
      <noscript>
        <button type="submit" className="h-12 w-full rounded-[14px] border border-borda-padrao px-5 texto-botao sm:w-auto">
          {t.buscar}
        </button>
      </noscript>
    </Form>
  );
}
