"use client";

import { Archive, Eye, EyeOff, FileText, FolderClosed, MoreHorizontal, Pencil, Scale, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AcaoDoMenu } from "@/lib/conteudos/acoes-disponiveis";
import type { EstadoConteudo, TipoConteudo } from "@/lib/conteudos/listar";
import type { SeloDeVigencia } from "@/lib/documentos/selo";
import { cn } from "@/lib/utils";

import { ConfirmarAcao, MenuDeAcoes, type Alvo, type PedidoDeAcao } from "./ciclo-de-vida";
import { SeloCategoria, SeloEstado, SeloVigencia } from "./selos";

/** Uma linha da lista, já com os textos prontos (datas no horário da Bahia, feitas no servidor). */
export type LinhaDaTabela = {
  id: string;
  tipo: TipoConteudo;
  titulo: string;
  semTitulo: boolean;
  estado: EstadoConteudo;
  categoria: { nome: string; cor: string } | null;
  autorNome: string;
  noSite: string;
  atualizado: string;
  hrefEditor: string | null;
  hrefRapida: string | null;
  /** O que o menu ⋯ oferece (acoesDisponiveis, conferido de novo no servidor). */
  acoes: AcaoDoMenu[];
  /** Edital e acordo: selo calculado pelas datas, separado do estado (C2, E46). */
  seloVigencia?: SeloDeVigencia | null;
  /** Quem só vê o documento (Comunicação, RF42): "Abrir" em vez de "Editar". */
  somenteVer?: boolean;
};

const NOME_DO_TIPO: Record<TipoConteudo, { rotulo: string; icone: typeof FileText }> = {
  noticia: { rotulo: "Notícia", icone: FileText },
  edital: { rotulo: "Edital", icone: FolderClosed },
  acordo: { rotulo: "Acordo", icone: Scale },
};

const BOTAO_ICONE =
  "alvo-toque inline-flex size-9 items-center justify-center rounded-[10px] text-texto-secundario outline-none hover:bg-fundo-superficie-alt hover:text-texto-primario focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * Tabela de Conteúdos (RF35, Figma 110:845): seleção em lote com a barra "N itens selecionados"
 * (Ocultar, Arquivar, Limpar seleção) e o menu ⋯ de cada linha. A seleção vale só para a página
 * que está na tela e se limpa ao mudar de aba, filtro ou página (a página monta a tabela de novo)
 * e com Esc. Na aba Arquivados não há seleção: cada item tem "Restaurar como rascunho".
 */
export function TabelaConteudos({
  linhas,
  arquivados,
  rodape,
}: {
  linhas: LinhaDaTabela[];
  arquivados: boolean;
  rodape: React.ReactNode;
}) {
  const router = useRouter();
  const [selecionados, setSelecionados] = React.useState<Set<string>>(() => new Set());
  const [pedido, setPedido] = React.useState<PedidoDeAcao | null>(null);
  const comSelecao = !arquivados;

  React.useEffect(() => {
    if (selecionados.size === 0) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pedido) setSelecionados(new Set());
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [selecionados.size, pedido]);

  const alvo = (l: LinhaDaTabela): Alvo => ({ id: l.id, titulo: l.titulo, acoes: l.acoes });
  const marcados = linhas.filter((l) => selecionados.has(l.id));
  const todos = linhas.length > 0 && marcados.length === linhas.length;
  const marcar = (id: string, sim: boolean) =>
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (sim) novo.add(id);
      else novo.delete(id);
      return novo;
    });

  const pedirEmLote = (acao: AcaoDoMenu) => setPedido({ acao, alvos: marcados.map(alvo) });
  const algumAceita = (acao: AcaoDoMenu) => marcados.some((l) => l.acoes.includes(acao));

  return (
    <>
      {comSelecao && marcados.length > 0 ? (
        <section
          aria-label="Ações em lote"
          className="flex flex-col gap-3 rounded-[16px] bg-destaque-azul-suave px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="texto-corpo-destaque text-destaque-azul" aria-live="polite">
            {marcados.length === 1 ? "1 item selecionado" : `${marcados.length} itens selecionados`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secundario" size="pequeno" disabled={!algumAceita("ocultar")} onClick={() => pedirEmLote("ocultar")}>
              <EyeOff aria-hidden />
              Ocultar
            </Button>
            <Button type="button" variant="secundario" size="pequeno" disabled={!algumAceita("arquivar")} onClick={() => pedirEmLote("arquivar")}>
              <Archive aria-hidden />
              Arquivar
            </Button>
            <Button type="button" variant="secundario" size="pequeno" onClick={() => setSelecionados(new Set())}>
              Limpar seleção
            </Button>
          </div>
        </section>
      ) : null}

      <section aria-label={arquivados ? "Conteúdos arquivados" : "Lista de conteúdos"} className="overflow-hidden rounded-[16px] border border-borda-padrao bg-fundo-superficie">
        <table className="w-full border-collapse text-left">
          <thead className="hidden bg-fundo-superficie-alt md:table-header-group">
            <tr className="texto-etiqueta text-texto-secundario uppercase">
              {comSelecao ? (
                <th scope="col" className="w-12 py-3.5 pl-5">
                  <Checkbox
                    aria-label="Selecionar todos desta página"
                    checked={todos ? true : marcados.length > 0 ? "indeterminate" : false}
                    onCheckedChange={(sim) => setSelecionados(sim === true ? new Set(linhas.map((l) => l.id)) : new Set())}
                  />
                </th>
              ) : null}
              <th scope="col" className={cn("py-3.5 pr-3 font-[inherit]", comSelecao ? "pl-2" : "pl-5")}>
                Título
              </th>
              <th scope="col" className="px-3 py-3.5 font-[inherit]">Tipo</th>
              <th scope="col" className="px-3 py-3.5 font-[inherit]">Estado</th>
              <th scope="col" className="hidden px-3 py-3.5 font-[inherit] xl:table-cell">No site</th>
              <th scope="col" className="px-3 py-3.5 font-[inherit]">Atualizado</th>
              <th scope="col" className="px-5 py-3.5 font-[inherit]">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <Linha
                key={linha.id}
                linha={linha}
                comSelecao={comSelecao}
                marcada={selecionados.has(linha.id)}
                aoMarcar={(sim) => marcar(linha.id, sim)}
                aoPedir={(acao) => setPedido({ acao, alvos: [alvo(linha)] })}
              />
            ))}
          </tbody>
        </table>
        {rodape}
      </section>

      <ConfirmarAcao
        pedido={pedido}
        aoFechar={() => setPedido(null)}
        aoConcluir={(_acao, feitos) => {
          if (feitos.length > 0) setSelecionados(new Set());
          router.refresh();
        }}
      />
    </>
  );
}

function Linha({
  linha,
  comSelecao,
  marcada,
  aoMarcar,
  aoPedir,
}: {
  linha: LinhaDaTabela;
  comSelecao: boolean;
  marcada: boolean;
  aoMarcar: (sim: boolean) => void;
  aoPedir: (acao: AcaoDoMenu) => void;
}) {
  const tipo = NOME_DO_TIPO[linha.tipo];
  return (
    <tr
      data-selecionada={marcada || undefined}
      className="relative flex flex-col gap-2 border-t border-borda-padrao px-5 py-4 first:border-t-0 data-[selecionada]:bg-destaque-azul-suave/60 md:table-row md:px-0 md:py-0"
    >
      {comSelecao ? (
        <td className="absolute top-4 right-5 md:static md:w-12 md:py-4 md:pl-5">
          <Checkbox aria-label={`Selecionar “${linha.titulo}”`} checked={marcada} onCheckedChange={(sim) => aoMarcar(sim === true)} />
        </td>
      ) : null}
      <td className={cn("pr-10 md:py-4 md:pr-3", comSelecao ? "md:pl-2" : "md:pl-5")}>
        <div className="flex min-w-0 flex-col gap-1">
          {linha.hrefEditor ? (
            <Link
              href={linha.hrefEditor}
              className={cn(
                // No toque, área mínima (--alvo-toque) pelo padding, com margem negativa para manter o desenho; o link
                // fica por cima da linha do autor. O corte (line-clamp) fica no texto de dentro: no
                // próprio link, o padding deixaria a linha escondida vazar sobre o autor (E48).
                "relative z-[1] block texto-titulo-card-pequeno pointer-coarse:-my-[calc((var(--alvo-toque)_-_1lh)/2)] pointer-coarse:py-[calc((var(--alvo-toque)_-_1lh)/2)] outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring",
                linha.semTitulo ? "text-texto-terciario italic" : "text-texto-primario",
              )}
            >
              <span className="line-clamp-2 md:line-clamp-1">{linha.titulo}</span>
            </Link>
          ) : (
            <span className="texto-titulo-card-pequeno text-texto-primario">{linha.titulo}</span>
          )}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 texto-pequeno text-texto-secundario">
            {linha.categoria ? <SeloCategoria nome={linha.categoria.nome} cor={linha.categoria.cor} /> : null}
            {linha.autorNome}
          </span>
        </div>
      </td>
      <td className="texto-pequeno text-texto-secundario md:px-3 md:py-4">
        <span className="inline-flex items-center gap-1.5">
          <tipo.icone aria-hidden className="size-4" />
          {tipo.rotulo}
        </span>
      </td>
      <td className="md:px-3 md:py-4">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <SeloEstado estado={linha.estado} />
          <SeloVigencia selo={linha.seloVigencia ?? null} />
        </span>
      </td>
      <td className="hidden texto-pequeno text-texto-secundario md:px-3 md:py-4 xl:table-cell">{linha.noSite}</td>
      <td className="texto-pequeno text-texto-secundario md:px-3 md:py-4">
        <span className="md:hidden">Atualizado em </span>
        {linha.atualizado}
      </td>
      <td className="md:px-5 md:py-4">
        {/* No toque, vão para a área de toque de um ícone não cobrir a do vizinho (E48). */}
        <div className="flex items-center gap-1 pointer-coarse:vao-toque-9">
          {linha.hrefRapida ? (
            <Link href={linha.hrefRapida} scroll={false} aria-label={`Edição rápida de “${linha.titulo}”`} title="Edição rápida" className={BOTAO_ICONE}>
              <SlidersHorizontal aria-hidden className="size-[18px]" />
            </Link>
          ) : null}
          {linha.hrefEditor && linha.estado !== "arquivado" ? (
            <Link href={linha.hrefEditor} aria-label={`${linha.somenteVer ? "Abrir" : "Editar"} “${linha.titulo}”`} className={BOTAO_ICONE}>
              {linha.somenteVer ? <Eye aria-hidden className="size-[18px]" /> : <Pencil aria-hidden className="size-[18px]" />}
            </Link>
          ) : null}
          {linha.acoes.length > 0 ? (
            <MenuDeAcoes acoes={linha.acoes} aoPedir={aoPedir}>
              <button type="button" aria-label={`Mais ações para “${linha.titulo}”`} className={BOTAO_ICONE}>
                <MoreHorizontal aria-hidden className="size-[18px]" />
              </button>
            </MenuDeAcoes>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
