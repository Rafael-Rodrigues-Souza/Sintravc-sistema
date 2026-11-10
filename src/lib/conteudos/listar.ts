import { and, asc, count, desc, eq, ne, sql, type SQL } from "drizzle-orm";

import { banco } from "@/lib/db";
import { categoria, conteudo, noticia, pessoaEquipe } from "@/lib/db/schema";
import { exigir, pode, type QuemDaEquipe } from "@/lib/permissoes";

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
  atualizadoEm: Date;
};

/** Busca na manchete, no nome do autor e nas palavras-chave, sem diferença de acento nem de maiúsculas. */
function condicaoDaBusca(busca: string | undefined): SQL | undefined {
  const termo = busca?.trim();
  if (!termo) return undefined;
  const padrao = `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const campo = sql`unaccent(concat_ws(' ', ${conteudo.titulo}, ${pessoaEquipe.nome}, array_to_string(${noticia.palavrasChave}, ' ')))`;
  return sql`${campo} ilike unaccent(${padrao})`;
}

/**
 * Lista de Conteúdos (RF35): da alteração mais recente para a mais antiga, com filtros, busca e
 * páginas. Arquivados ficam fora (aba própria, #11).
 */
export async function listarConteudos(
  filtros: FiltrosConteudos,
  deps: { quem: QuemDaEquipe },
): Promise<{ itens: ItemConteudo[]; total: number }> {
  exigir(deps.quem, "ver", { tipo: "noticia" });
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const onde = and(
    ne(conteudo.estado, "arquivado"),
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
      .where(onde),
  ]);

  return {
    total: contagem?.total ?? 0,
    itens: linhas.map(({ conteudo: c, pessoa_equipe: autor, categoria: cat }) => ({
      id: c.id,
      tipo: c.tipo,
      titulo: c.titulo,
      estado: c.estado,
      categoria: cat ? { nome: cat.nome, cor: cat.cor } : null,
      autorNome: autor.nome,
      publicadoEm: c.publicadoEm,
      agendadoPara: c.agendadoPara,
      atualizadoEm: c.atualizadoEm,
    })),
  };
}

/** Quantos conteúdos de cada tipo (sem arquivados), para as abas da lista. */
export async function contarConteudosPorTipo(deps: { quem: QuemDaEquipe }): Promise<Record<TipoConteudo | "todos", number>> {
  exigir(deps.quem, "ver", { tipo: "noticia" });
  const linhas = await banco()
    .select({ tipo: conteudo.tipo, total: count() })
    .from(conteudo)
    .where(ne(conteudo.estado, "arquivado"))
    .groupBy(conteudo.tipo);
  const porTipo = { todos: 0, noticia: 0, edital: 0, acordo: 0 };
  for (const { tipo, total } of linhas) {
    porTipo[tipo] = total;
    porTipo.todos += total;
  }
  return porTipo;
}

/** Quem já escreveu conteúdo, para o filtro de autor. */
export async function listarAutores(deps: { quem: QuemDaEquipe }): Promise<{ id: string; nome: string }[]> {
  exigir(deps.quem, "ver", { tipo: "noticia" });
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
