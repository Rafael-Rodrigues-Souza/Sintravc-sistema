import { and, asc, count, desc, eq, ne, sql, type SQL } from "drizzle-orm";

import { banco } from "@/lib/db";
import { categoria, conteudo, documento, noticia, pessoaEquipe } from "@/lib/db/schema";
import { exigir, pode, type QuemDaEquipe } from "@/lib/permissoes";

import { exigirEmAlgumTipo } from "./tipo-do-conteudo";

export type TipoConteudo = (typeof conteudo.$inferSelect)["tipo"];
export type EstadoConteudo = (typeof conteudo.$inferSelect)["estado"];
export type EscopoCategoria = (typeof categoria.$inferSelect)["escopos"][number];

export const ESTADOS_DA_LISTA = ["rascunho", "agendado", "publicado", "oculto"] as const satisfies EstadoConteudo[];
export const POR_PAGINA = 20;

export type FiltrosConteudos = {
  tipo?: TipoConteudo;
  estado?: EstadoConteudo;
  categoriaId?: string;
  autorId?: string;
  busca?: string;
  pagina?: number;
  /** Aba Arquivados (RF35): só os arquivados. Sem ela, os arquivados ficam fora (RN10). */
  arquivados?: boolean;
};

export type ItemConteudo = {
  id: string;
  tipo: TipoConteudo;
  titulo: string;
  estado: EstadoConteudo;
  categoria: { nome: string; cor: string } | null;
  autorNome: string;
  publicadoEm: Date | null;
  /** Agendado: quando entra no ar sozinho (E44). */
  agendadoPara: Date | null;
  /** Oculto: desde quando está fora do site e por quê (E45). */
  ocultadoEm: Date | null;
  motivoOculto: string | null;
  /** Para o menu de ações: excluir só o rascunho nunca publicado, do autor ou pelo ADM (RN54). */
  jaPublicado: boolean;
  autorId: string;
  atualizadoEm: Date;
  /** Edital e acordo: as datas do selo de vigência, que é calculado (C2, E46). Nulo na notícia. */
  datasDoSelo: { dataEvento: Date | null; vigenciaInicio: string | null; vigenciaFim: string | null } | null;
};

/**
 * Busca no título, no nome do autor, nas palavras-chave da notícia e no número do documento, sem
 * diferença de acento nem de maiúsculas.
 */
function condicaoDaBusca(busca: string | undefined): SQL | undefined {
  const termo = busca?.trim();
  if (!termo) return undefined;
  const padrao = `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const campo = sql`unaccent(concat_ws(' ', ${conteudo.titulo}, ${pessoaEquipe.nome}, array_to_string(${noticia.palavrasChave}, ' '), ${documento.numero}))`;
  return sql`${campo} ilike unaccent(${padrao})`;
}

/**
 * Lista de Conteúdos (RF35): da alteração mais recente para a mais antiga, com filtros, busca e
 * páginas. Os arquivados ficam fora das listas (RN10) e têm aba própria (`arquivados`).
 */
export async function listarConteudos(
  filtros: FiltrosConteudos,
  deps: { quem: QuemDaEquipe },
): Promise<{ itens: ItemConteudo[]; total: number }> {
  exigirEmAlgumTipo(deps.quem, "ver");
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const onde = and(
    filtros.arquivados ? eq(conteudo.estado, "arquivado") : ne(conteudo.estado, "arquivado"),
    filtros.tipo ? eq(conteudo.tipo, filtros.tipo) : undefined,
    filtros.estado ? eq(conteudo.estado, filtros.estado) : undefined,
    filtros.categoriaId ? eq(conteudo.categoriaId, filtros.categoriaId) : undefined,
    filtros.autorId ? eq(conteudo.autorId, filtros.autorId) : undefined,
    condicaoDaBusca(filtros.busca),
  );
  const base = () =>
    banco()
      .select()
      .from(conteudo)
      .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudo.autorId))
      .leftJoin(noticia, eq(noticia.conteudoId, conteudo.id))
      .leftJoin(documento, eq(documento.conteudoId, conteudo.id))
      .leftJoin(categoria, eq(categoria.id, conteudo.categoriaId))
      .where(onde)
      .$dynamic();

  const [linhas, [contagem]] = await Promise.all([
    base()
      .orderBy(desc(conteudo.atualizadoEm), desc(conteudo.id))
      .limit(POR_PAGINA)
      .offset((pagina - 1) * POR_PAGINA),
    banco()
      .select({ total: count() })
      .from(conteudo)
      .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudo.autorId))
      .leftJoin(noticia, eq(noticia.conteudoId, conteudo.id))
      .leftJoin(documento, eq(documento.conteudoId, conteudo.id))
      .where(onde),
  ]);

  return {
    total: contagem?.total ?? 0,
    itens: linhas.map(({ conteudo: c, pessoa_equipe: autor, categoria: cat, documento: d }) => ({
      id: c.id,
      tipo: c.tipo,
      titulo: c.titulo,
      estado: c.estado,
      categoria: cat ? { nome: cat.nome, cor: cat.cor } : null,
      autorNome: autor.nome,
      publicadoEm: c.publicadoEm,
      agendadoPara: c.agendadoPara,
      ocultadoEm: c.ocultadoEm,
      motivoOculto: c.motivoOculto,
      jaPublicado: c.jaPublicado,
      autorId: c.autorId,
      atualizadoEm: c.atualizadoEm,
      datasDoSelo: d ? { dataEvento: d.dataEvento, vigenciaInicio: d.vigenciaInicio, vigenciaFim: d.vigenciaFim } : null,
    })),
  };
}

/** Quantos conteúdos de cada tipo (sem arquivados), e quantos arquivados, para as abas da lista. */
export async function contarConteudosPorTipo(
  deps: { quem: QuemDaEquipe },
): Promise<Record<TipoConteudo | "todos" | "arquivados", number>> {
  exigirEmAlgumTipo(deps.quem, "ver");
  const linhas = await banco()
    .select({ tipo: conteudo.tipo, arquivado: sql<boolean>`${conteudo.estado} = 'arquivado'`, total: count() })
    .from(conteudo)
    .groupBy(conteudo.tipo, sql`${conteudo.estado} = 'arquivado'`);
  const porTipo = { todos: 0, noticia: 0, edital: 0, acordo: 0, arquivados: 0 };
  for (const { tipo, arquivado, total } of linhas) {
    if (arquivado) {
      porTipo.arquivados += total;
      continue;
    }
    porTipo[tipo] += total;
    porTipo.todos += total;
  }
  return porTipo;
}

/** Quem já escreveu conteúdo, para o filtro de autor. */
export async function listarAutores(deps: { quem: QuemDaEquipe }): Promise<{ id: string; nome: string }[]> {
  exigirEmAlgumTipo(deps.quem, "ver");
  return banco()
    .selectDistinct({ id: pessoaEquipe.id, nome: pessoaEquipe.nome })
    .from(conteudo)
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudo.autorId))
    .orderBy(asc(pessoaEquipe.nome));
}

/**
 * Categorias dos escopos pedidos, na ordem definida pelo ADM. A Comunicação não gerencia categorias
 * (RN08), mas escolhe uma no editor e filtra por ela: quem edita notícia pode ver (E40).
 */
export async function listarCategorias(
  escopos: EscopoCategoria[],
  deps: { quem: QuemDaEquipe },
): Promise<{ id: string; nome: string; cor: string }[]> {
  if (!pode(deps.quem, "ver", { tipo: "categoria" })) exigir(deps.quem, "editar", { tipo: "noticia" });
  return banco()
    .select({ id: categoria.id, nome: categoria.nome, cor: categoria.cor })
    .from(categoria)
    .where(sql`${categoria.escopos} && ${`{${escopos.join(",")}}`}::escopo_categoria[]`)
    .orderBy(asc(categoria.ordem));
}
