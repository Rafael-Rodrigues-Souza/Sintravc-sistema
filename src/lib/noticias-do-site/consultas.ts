import { and, asc, between, desc, eq, inArray, isNotNull, lte, ne, notInArray, sql, type SQL } from "drizzle-orm";

import { urlPublica } from "@/lib/armazenamento";
import { contarPalavras, tempoDeLeitura } from "@/lib/conteudos/corpo";
import type { DadosNoticia } from "@/lib/conteudos/dados";
import { enderecoPublicoDoConteudo } from "@/lib/conteudos/enderecos";
import { slugificar } from "@/lib/conteudos/publicar";
import { ASSINATURA_PADRAO } from "@/lib/conteudos/dados";
import { fixadaAtual } from "@/lib/conteudos/fixar";
import { bahiaEmCampos, somarDias } from "@/lib/datas";
import { banco } from "@/lib/db";
import { categoria, conteudo, conteudoVersao, midia, visualizacaoDiaria } from "@/lib/db/schema";
import { lerEnvArmazenamento } from "@/lib/env";
import { lerParametro } from "@/lib/parametros";

/**
 * Leituras públicas das notícias (RF02, E30, E59). Tudo vem do **retrato da versão no ar** (E42):
 * o que está em edição no painel não aparece antes de publicar. Só a publicada, com endereço,
 * aparece: rascunho, agendada, oculta e arquivada ficam de fora (CA-US02.2).
 *
 * As páginas do site são públicas e chamam estas funções direto, como a faixa de comunicados; as
 * server actions e rotas públicas conferem `pode(visitante, "ver", site_publico)` antes.
 */

/** Notícias por página na lista e em cada “Carregar mais” (Figma 80:629: 6 por página). */
export const NOTICIAS_POR_PAGINA = 6;
/** Quantas notícias o “Leia também” mostra (Figma 100:15159, “Mais notícias”). */
export const QUANTIDADE_LEIA_TAMBEM = 3;

export type CategoriaDoSite = { id: string; nome: string; cor: string; slug: string };

/** O cartão de uma notícia na lista, no destaque, nas mais lidas e no “Leia também”. */
export type NoticiaDoSite = {
  id: string;
  titulo: string;
  href: string;
  /** Linha fina; sem ela, o lide. */
  resumo: string;
  publicadoEm: Date;
  categoria: CategoriaDoSite | null;
  capa: { url: string; alt: string } | null;
  minutosDeLeitura: number;
  /** ASSINATURA_PADRAO quando a assinatura está vazia. */
  assinatura: string;
};

export type OrdemDaLista = "recentes" | "antigas";

const dados = sql`${conteudoVersao.snapshot} -> 'dados'`;

/** A notícia está no ar: publicada, com endereço e data. Também vale para os destaques da Home (E62). */
export const noAr = and(eq(conteudo.tipo, "noticia"), eq(conteudo.estado, "publicado"), isNotNull(conteudo.slug), isNotNull(conteudo.publicadoEm));

const colunasDoCartao = {
  id: conteudo.id,
  slug: conteudo.slug,
  publicadoEm: conteudo.publicadoEm,
  titulo: sql<string>`${dados} ->> 'titulo'`,
  linhaFina: sql<string | null>`${dados} ->> 'linhaFina'`,
  lide: sql<string | null>`${dados} ->> 'lide'`,
  corpo: sql<DadosNoticia["corpo"]>`${dados} -> 'corpo'`,
  capaAlt: sql<string | null>`${dados} ->> 'capaAlt'`,
  assinatura: sql<string | null>`${dados} ->> 'assinatura'`,
  capaChave: midia.chaveR2,
  categoriaId: categoria.id,
  categoriaNome: categoria.nome,
  categoriaCor: categoria.cor,
};

/** O SELECT base: a notícia com o retrato no ar, a capa e a categoria do retrato. */
function selecionarCartoes() {
  return banco()
    .select(colunasDoCartao)
    .from(conteudo)
    .innerJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
    .leftJoin(midia, sql`${midia.id}::text = ${dados} ->> 'capaMidiaId'`)
    .leftJoin(categoria, sql`${categoria.id}::text = ${dados} ->> 'categoriaId'`);
}

type LinhaDoCartao = Awaited<ReturnType<typeof selecionarCartoes>>[number];

function paraCartoes(lidas: LinhaDoCartao[]): NoticiaDoSite[] {
  const env = lidas.some((l) => l.capaChave) ? lerEnvArmazenamento() : null;
  return lidas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    href: enderecoPublicoDoConteudo("noticia", l.slug!),
    resumo: (l.linhaFina || l.lide || "").trim(),
    publicadoEm: l.publicadoEm!,
    categoria:
      l.categoriaId && l.categoriaNome
        ? { id: l.categoriaId, nome: l.categoriaNome, cor: l.categoriaCor ?? "azul", slug: slugificar(l.categoriaNome, "categoria") }
        : null,
    capa: l.capaChave && env ? { url: urlPublica(l.capaChave, env), alt: l.capaAlt ?? "" } : null,
    minutosDeLeitura: Math.max(1, tempoDeLeitura(contarPalavras(l.corpo ?? { type: "doc" }))),
    assinatura: l.assinatura?.trim() || ASSINATURA_PADRAO,
  }));
}

const maisRecentes = [desc(conteudo.publicadoEm), desc(conteudo.id)];

/**
 * Busca na manchete, na linha fina e no lide do que está no ar, sem diferença de acento nem de
 * maiúsculas. `%` e `_` digitados valem como texto.
 */
function condicaoDaBusca(busca: string | undefined): SQL | undefined {
  const termo = busca?.trim();
  if (!termo) return undefined;
  const padrao = `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return sql`unaccent(concat_ws(' ', ${dados} ->> 'titulo', ${dados} ->> 'linhaFina', ${dados} ->> 'lide')) ilike unaccent(${padrao})`;
}

/** Categorias de notícias com pelo menos uma publicada, na ordem das Configurações, com a contagem. */
export async function categoriasDoSite(): Promise<(CategoriaDoSite & { total: number })[]> {
  const linhas = await banco()
    .select({ id: categoria.id, nome: categoria.nome, cor: categoria.cor, total: sql<number>`count(${conteudo.id})::int` })
    .from(categoria)
    .innerJoin(conteudoVersao, sql`${categoria.id}::text = ${dados} ->> 'categoriaId'`)
    .innerJoin(conteudo, and(eq(conteudo.id, conteudoVersao.conteudoId), eq(conteudo.versao, conteudoVersao.versao)))
    .where(and(noAr, sql`${categoria.escopos} @> array['noticias']::escopo_categoria[]`))
    .groupBy(categoria.id)
    .orderBy(asc(categoria.ordem), asc(categoria.nome));
  return linhas.map((l) => ({ ...l, slug: slugificar(l.nome, "categoria") }));
}

/** Total de notícias no ar (o chip “Todas”). */
export async function totalNoAr(): Promise<number> {
  const [linha] = await banco()
    .select({ total: sql<number>`count(*)::int` })
    .from(conteudo)
    .where(noAr);
  return linha?.total ?? 0;
}

export type Destaque = NoticiaDoSite & { fixada: boolean };

/**
 * O bloco DESTAQUE (RN58, CA-US21.6 e CA-US21.8): a notícia fixada dentro da data; sem ela, a mais
 * recente. Segue o relógio: a fixação vencida já não vale, mesmo antes da T05 rodar (E59).
 */
export async function noticiaEmDestaque(agora: Date = new Date()): Promise<Destaque | null> {
  // A regra “o site segue o relógio” fica num lugar só (fixadaAtual, E59).
  const naFixacao = await fixadaAtual(banco(), agora);
  const [fixada] = naFixacao
    ? paraCartoes(
        await selecionarCartoes()
          .where(and(noAr, eq(conteudo.id, naFixacao.id)))
          .limit(1),
      )
    : [];
  if (fixada) return { ...fixada, fixada: true };
  // A mais recente até agora (o Destaque também segue o relógio).
  const [recente] = paraCartoes(
    await selecionarCartoes()
      .where(and(noAr, lte(conteudo.publicadoEm, agora)))
      .orderBy(...maisRecentes)
      .limit(1),
  );
  return recente ? { ...recente, fixada: false } : null;
}

export type FiltrosDaLista = {
  categoriaId?: string;
  busca?: string;
  ordem?: OrdemDaLista;
  pagina?: number;
  porPagina?: number;
  /** A notícia do Destaque, que a grade sem filtro não repete (E59). */
  excluir?: string;
};

export type PaginaDeNoticias = { itens: NoticiaDoSite[]; total: number; pagina: number; paginas: number };

/** A grade “Últimas notícias”: filtro por categoria, busca, ordem e página (CA-US02.1). */
export async function listarNoticiasDoSite(filtros: FiltrosDaLista = {}): Promise<PaginaDeNoticias> {
  const porPagina = filtros.porPagina ?? NOTICIAS_POR_PAGINA;
  const onde = and(
    noAr,
    filtros.categoriaId ? sql`${dados} ->> 'categoriaId' = ${filtros.categoriaId}` : undefined,
    condicaoDaBusca(filtros.busca),
    filtros.excluir ? ne(conteudo.id, filtros.excluir) : undefined,
  );
  const [{ total } = { total: 0 }] = await banco()
    .select({ total: sql<number>`count(*)::int` })
    .from(conteudo)
    .innerJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
    .where(onde);
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(Math.max(1, Math.trunc(filtros.pagina ?? 1)), paginas);
  const ordem = filtros.ordem === "antigas" ? [asc(conteudo.publicadoEm), asc(conteudo.id)] : maisRecentes;
  const itens = paraCartoes(
    await selecionarCartoes()
      .where(onde)
      .orderBy(...ordem)
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
  );
  return { itens, total, pagina, paginas };
}

/**
 * “Leia também” (RF02): as mais recentes da mesma categoria, completadas com as recentes de outras.
 * Nunca repete a própria notícia.
 */
export async function leiaTambem(id: string, categoriaId: string | null, quantidade = QUANTIDADE_LEIA_TAMBEM): Promise<NoticiaDoSite[]> {
  const mesma = categoriaId
    ? paraCartoes(
        await selecionarCartoes()
          .where(and(noAr, ne(conteudo.id, id), sql`${dados} ->> 'categoriaId' = ${categoriaId}`))
          .orderBy(...maisRecentes)
          .limit(quantidade),
      )
    : [];
  if (mesma.length >= quantidade) return mesma;
  const fora = [id, ...mesma.map((n) => n.id)];
  const outras = paraCartoes(
    await selecionarCartoes()
      .where(and(noAr, notInArray(conteudo.id, fora)))
      .orderBy(...maisRecentes)
      .limit(quantidade - mesma.length),
  );
  return [...mesma, ...outras];
}

/** O dia na Bahia ("2026-11-21"), a chave da contagem diária. */
export function diaDaContagem(agora: Date): string {
  return bahiaEmCampos(agora).data;
}

/** O primeiro dia da janela das Mais lidas: hoje e os `dias − 1` anteriores, no calendário da Bahia. */
export function inicioDaJanela(agora: Date, dias: number): string {
  return somarDias(diaDaContagem(agora), -(dias - 1));
}

/**
 * “Mais lidas da semana” (E30, E59): as mais vistas nos últimos `noticias.mais_lidas_dias`, só as
 * que estão no ar. Com pouco dado, completa com as mais recentes.
 */
export async function maisLidas(agora: Date = new Date()): Promise<NoticiaDoSite[]> {
  const [dias, quantidade] = await Promise.all([lerParametro("noticias.mais_lidas_dias"), lerParametro("noticias.mais_lidas_quantidade")]);
  const inicio = inicioDaJanela(agora, dias);
  const hoje = diaDaContagem(agora);
  const vistas = await banco()
    .select({ id: visualizacaoDiaria.conteudoId })
    .from(visualizacaoDiaria)
    .innerJoin(conteudo, eq(conteudo.id, visualizacaoDiaria.conteudoId))
    .where(and(noAr, between(visualizacaoDiaria.dia, inicio, hoje)))
    .groupBy(visualizacaoDiaria.conteudoId, conteudo.publicadoEm)
    .orderBy(desc(sql`sum(${visualizacaoDiaria.total})`), desc(conteudo.publicadoEm), desc(visualizacaoDiaria.conteudoId))
    .limit(quantidade);
  const ids = vistas.map((l) => l.id);
  const lidas = ids.length
    ? paraCartoes(await selecionarCartoes().where(and(noAr, inArray(conteudo.id, ids)))).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    : [];
  if (lidas.length >= quantidade) return lidas;
  const recentes = paraCartoes(
    await selecionarCartoes()
      .where(lidas.length ? and(noAr, notInArray(conteudo.id, lidas.map((n) => n.id))) : noAr)
      .orderBy(...maisRecentes)
      .limit(quantidade - lidas.length),
  );
  return [...lidas, ...recentes];
}

/**
 * T17 (E30, E59): +1 na contagem do dia, só se a notícia está no ar. Sem cookie, sem IP e sem
 * pessoa: só a notícia e o dia. Devolve se contou.
 */
export async function registrarVisualizacao(conteudoId: string, agora: Date = new Date()): Promise<boolean> {
  // O mesmo filtro “no ar” da lista: só soma o que o visitante consegue abrir.
  const linhas = await banco()
    .insert(visualizacaoDiaria)
    .select(
      banco()
        .select({ conteudoId: conteudo.id, dia: sql<string>`${diaDaContagem(agora)}::date`.as("dia"), total: sql<number>`1`.as("total") })
        .from(conteudo)
        .where(and(noAr, eq(conteudo.id, conteudoId))),
    )
    .onConflictDoUpdate({ target: [visualizacaoDiaria.conteudoId, visualizacaoDiaria.dia], set: { total: sql`${visualizacaoDiaria.total} + 1` } })
    .returning({ total: visualizacaoDiaria.total });
  return linhas.length > 0;
}

/** A notícia aberta, pelo endereço: só a que está no ar (CA-US02.2). */
export type NoticiaPublica = {
  id: string;
  slug: string;
  dados: DadosNoticia;
  publicadoEm: Date;
  /** Quando foi ao ar a versão atual, se não é a primeira ("Atualizado em"). */
  atualizadoEm: Date | null;
  categoria: CategoriaDoSite | null;
  capa: { url: string; alt: string; legenda: string; largura: number | null; altura: number | null } | null;
  /** Endereço público de cada arquivo da Mídia usado (capa e anexos). */
  enderecoDe: Map<string, string>;
};

export async function noticiaPeloSlug(slug: string): Promise<NoticiaPublica | null> {
  const [linha] = await banco()
    .select({
      id: conteudo.id,
      slug: conteudo.slug,
      publicadoEm: conteudo.publicadoEm,
      versao: conteudo.versao,
      versaoCriadaEm: conteudoVersao.criadoEm,
      snapshot: conteudoVersao.snapshot,
    })
    .from(conteudo)
    .innerJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
    .where(and(noAr, eq(conteudo.slug, slug)))
    .limit(1);
  if (!linha) return null;
  const retrato = (linha.snapshot as { dados: DadosNoticia }).dados;

  const idsDaMidia = [retrato.capaMidiaId, ...retrato.links.map((l) => l.midiaId)].filter((m): m is string => !!m);
  const [arquivos, [cat]] = await Promise.all([
    idsDaMidia.length
      ? banco()
          .select({ id: midia.id, chave: midia.chaveR2, largura: midia.largura, altura: midia.altura })
          .from(midia)
          .where(inArray(midia.id, idsDaMidia))
      : Promise.resolve([]),
    retrato.categoriaId
      ? banco().select({ id: categoria.id, nome: categoria.nome, cor: categoria.cor }).from(categoria).where(eq(categoria.id, retrato.categoriaId))
      : Promise.resolve([]),
  ]);
  const env = arquivos.length ? lerEnvArmazenamento() : null;
  const enderecoDe = new Map(arquivos.map((a) => [a.id, urlPublica(a.chave, env!)]));
  const capa = retrato.capaMidiaId ? arquivos.find((a) => a.id === retrato.capaMidiaId) : undefined;

  return {
    id: linha.id,
    slug: linha.slug!,
    dados: retrato,
    publicadoEm: linha.publicadoEm!,
    atualizadoEm: linha.versao > 1 ? linha.versaoCriadaEm : null,
    categoria: cat ? { ...cat, slug: slugificar(cat.nome, "categoria") } : null,
    capa: capa
      ? { url: enderecoDe.get(capa.id)!, alt: retrato.capaAlt, legenda: retrato.capaLegenda, largura: capa.largura, altura: capa.altura }
      : null,
    enderecoDe,
  };
}

/** As notícias no ar com estes ids, na ordem do banco (a Home, E62). As que saíram do ar ficam de fora. */
export async function noticiasNoArPorIds(ids: string[]): Promise<NoticiaDoSite[]> {
  if (ids.length === 0) return [];
  return paraCartoes(await selecionarCartoes().where(and(noAr, inArray(conteudo.id, ids))));
}

/** As mais recentes no ar até agora, sem as de `excluir` (a lista automática da Home, E62). */
export async function noticiasRecentes(quantidade: number, agora: Date = new Date(), excluir: string[] = []): Promise<NoticiaDoSite[]> {
  return paraCartoes(
    await selecionarCartoes()
      .where(and(noAr, lte(conteudo.publicadoEm, agora), excluir.length ? notInArray(conteudo.id, excluir) : undefined))
      .orderBy(...maisRecentes)
      .limit(quantidade),
  );
}
