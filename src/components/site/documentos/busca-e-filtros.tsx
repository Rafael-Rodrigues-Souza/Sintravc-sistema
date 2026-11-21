"use client";

import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Input } from "@/components/ui/input";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import { BUSCA_MAXIMA, enderecoDaAba, subtipoNaUrl, type AbaDocumentos, type FiltrosDeDocumentos } from "@/lib/documentos-do-site/filtros";
import { cn } from "@/lib/utils";

/**
 * Busca, ano e tipos de documento (Figma 73:824 / 75:1612; E60). Um formulário GET: Enter busca, e
 * trocar o ano envia sozinho. O botão “Buscar” dentro do campo (e, sem JavaScript, no celular)
 * envia os dois. O tipo escolhido continua; a lista volta para os primeiros 10. Os chips de tipo
 * vêm como `children` e ocupam a própria célula da grade:
 * - celular: busca na largura toda; embaixo, o ano e os chips, que rolam para o lado;
 * - do `sm`: busca e ano na mesma linha, chips embaixo (Editais, 73:824);
 * - com `chipsNaLinha`, do `lg`: busca, ano e chips numa linha só (Acordos, 75:1612).
 */
export function BuscaEFiltros({
  aba,
  filtros,
  anos,
  chipsNaLinha = false,
  children,
}: {
  aba: AbaDocumentos;
  filtros: FiltrosDeDocumentos;
  anos: number[];
  chipsNaLinha?: boolean;
  children: ReactNode;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const t = DOCUMENTOS_PAGINA;
  // O texto de dica longo não cabe no celular (Figma 74:1085): o curto até o `sm`.
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 640px)");
    const atualizar = () => setLargo(consulta.matches);
    atualizar();
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);
  const daAba = aba === "editais" ? t.editais : t.acordos;
  const idBusca = `busca-${aba}`;
  const idAno = `ano-${aba}`;
  return (
    <Form
      ref={formulario}
      action={`/documentos/${aba}`}
      role="search"
      aria-label={daAba.buscaRotulo}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 [grid-template-areas:'busca_busca'_'ano_chips']",
        "sm:grid-cols-[minmax(0,1fr)_200px] sm:[grid-template-areas:'busca_ano'_'chips_chips'] lg:grid-cols-[minmax(0,1fr)_220px]",
        chipsNaLinha && "lg:grid-cols-[minmax(0,1fr)_190px_auto] lg:[grid-template-areas:'busca_ano_chips']",
      )}
    >
      {filtros.subtipo ? <input type="hidden" name="tipo" value={subtipoNaUrl(filtros.subtipo)} /> : null}
      <div className="relative [grid-area:busca]">
        <label htmlFor={idBusca} className="sr-only">
          {daAba.buscaRotulo}
        </label>
        <IconeFigma src="/site/icone-busca.svg" tamanho={20} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-texto-terciario" />
        <Input
          id={idBusca}
          type="search"
          name="busca"
          defaultValue={filtros.busca}
          placeholder={largo ? daAba.buscaDica : daAba.buscaDicaCurta}
          maxLength={BUSCA_MAXIMA}
          enterKeyHint="search"
          className={cn("h-14 border-borda-padrao pl-[52px]", filtros.busca ? "pr-12 sm:pr-[124px]" : "pr-4 sm:pr-[88px]")}
        />
        <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
          {filtros.busca ? (
            <Link
              href={enderecoDaAba(aba, { subtipo: filtros.subtipo, ano: filtros.ano })}
              aria-label="Limpar a busca"
              className="alvo-toque flex size-8 items-center justify-center rounded-full text-texto-secundario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconeFigma src="/site/icone-fechar.svg" tamanho={16} />
            </Link>
          ) : null}
          <button
            type="submit"
            className="hidden h-[25px] items-center rounded-[8px] bg-fundo-superficie-alt px-2.5 texto-etiqueta text-texto-secundario uppercase outline-none hover:text-texto-primario focus-visible:ring-[3px] focus-visible:ring-ring sm:flex"
          >
            Buscar
          </button>
        </div>
      </div>
      <div className="relative [grid-area:ano]">
        <label htmlFor={idAno} className="sr-only">
          {t.anoRotulo}
        </label>
        <IconeFigma src="/site/icone-calendario.svg" tamanho={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-primario sm:left-[18px]" />
        <select
          id={idAno}
          name="ano"
          defaultValue={filtros.ano ?? ""}
          onChange={() => formulario.current?.requestSubmit()}
          className="h-11 w-full cursor-pointer appearance-none rounded-full border border-borda-padrao bg-fundo-superficie pr-10 pl-11 texto-navegacao text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 sm:h-14 sm:rounded-[14px] sm:pl-12"
        >
          <option value="">{t.todosOsAnos}</option>
          {anos.map((ano) => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
        <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-texto-primario" />
      </div>
      <div className="min-w-0 [grid-area:chips]">{children}</div>
      <noscript>
        <button type="submit" className="h-12 rounded-[14px] border border-borda-padrao px-5 texto-botao sm:hidden">
          Buscar
        </button>
      </noscript>
    </Form>
  );
}
