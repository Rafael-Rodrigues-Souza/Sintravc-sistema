"use client";

import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Input } from "@/components/ui/input";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import type { SubtipoDocumento } from "@/lib/documentos/dados";
import { BUSCA_MAXIMA, enderecoDaAba, subtipoNaUrl, type AbaDocumentos, type FiltrosDeDocumentos } from "@/lib/documentos-do-site/filtros";
import { cn } from "@/lib/utils";

/**
 * Busca, tipo e ano (Figma 73:824 / 75:1612; E60). Um formulário GET: Enter busca, e trocar o tipo
 * ou o ano envia sozinho. Os tipos eram chips no Figma e viraram um seletor igual ao do ano, por
 * decisão do Rafael (E60). Sem JavaScript, o botão “Buscar” envia tudo. A lista volta para os
 * primeiros 10.
 * - celular: busca na largura toda; embaixo, tipo e ano lado a lado, metade cada;
 * - do `sm`: busca, tipo e ano na mesma linha.
 */
export function BuscaEFiltros({
  aba,
  filtros,
  anos,
  total,
  subtipos,
}: {
  aba: AbaDocumentos;
  filtros: FiltrosDeDocumentos;
  anos: number[];
  /** Quantos documentos há no ar na aba (o “Todos os tipos”). */
  total: number;
  subtipos: { subtipo: SubtipoDocumento; total: number }[];
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
  const rotulos: Partial<Record<SubtipoDocumento, string>> = daAba.tipos;
  const idBusca = `busca-${aba}`;
  const enviar = () => formulario.current?.requestSubmit();
  return (
    <Form
      ref={formulario}
      action={`/documentos/${aba}`}
      role="search"
      aria-label={daAba.buscaRotulo}
      className={cn(
        "grid grid-cols-2 items-center gap-3 [grid-template-areas:'busca_busca'_'tipo_ano']",
        "sm:grid-cols-[minmax(0,1fr)_220px_180px] sm:[grid-template-areas:'busca_tipo_ano'] lg:grid-cols-[minmax(0,1fr)_240px_200px]",
      )}
    >
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
      <Seletor
        id={`tipo-${aba}`}
        nome="tipo"
        rotulo={t.tipoRotulo}
        icone="/site/icone-filtro.svg"
        area="[grid-area:tipo]"
        valor={filtros.subtipo ? subtipoNaUrl(filtros.subtipo) : ""}
        aoMudar={enviar}
      >
        <option value="">{`${t.todosOsTipos} (${total})`}</option>
        {subtipos.map((s) => (
          <option key={s.subtipo} value={subtipoNaUrl(s.subtipo)}>
            {`${rotulos[s.subtipo] ?? s.subtipo} (${s.total})`}
          </option>
        ))}
      </Seletor>
      <Seletor
        id={`ano-${aba}`}
        nome="ano"
        rotulo={t.anoRotulo}
        icone="/site/icone-calendario.svg"
        area="[grid-area:ano]"
        valor={filtros.ano ? String(filtros.ano) : ""}
        aoMudar={enviar}
      >
        <option value="">{t.todosOsAnos}</option>
        {anos.map((ano) => (
          <option key={ano} value={ano}>
            {ano}
          </option>
        ))}
      </Seletor>
      <noscript>
        <button type="submit" className="col-span-2 h-12 w-full rounded-[14px] border border-borda-padrao px-5 texto-botao sm:hidden">
          Buscar
        </button>
      </noscript>
    </Form>
  );
}

/**
 * Um seletor que envia o formulário ao mudar, com rótulo para o leitor de tela. No celular fica sem
 * o ícone, para o texto caber na metade da largura, e com 44 px de altura.
 */
function Seletor({
  id,
  nome,
  rotulo,
  icone,
  area,
  valor,
  aoMudar,
  children,
}: {
  id: string;
  nome: string;
  rotulo: string;
  icone: string;
  area: string;
  valor: string;
  aoMudar: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative min-w-0", area)}>
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <IconeFigma src={icone} tamanho={18} className="pointer-events-none absolute top-1/2 left-[18px] hidden -translate-y-1/2 text-texto-primario sm:block" />
      <select
        id={id}
        name={nome}
        defaultValue={valor}
        onChange={aoMudar}
        className="h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-full border border-borda-padrao bg-fundo-superficie pr-8 pl-3.5 text-[14px] leading-[1.2] font-semibold text-texto-primario outline-none focus-visible:border-destaque-azul focus-visible:ring-[4px] focus-visible:ring-destaque-azul/15 sm:h-14 sm:rounded-[14px] sm:pr-10 sm:pl-12 sm:texto-navegacao"
      >
        {children}
      </select>
      <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-texto-primario sm:right-4" />
    </div>
  );
}
