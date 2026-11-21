import { and, asc, desc, eq, or, sql, type SQL } from "drizzle-orm";

import { slugificar } from "@/lib/conteudos/publicar";
import { banco } from "@/lib/db";
import { esquemaProgramaAoVivo, type ProgramaAoVivo } from "@/lib/config-site/esquema";
import { categoria, configSite, episodio, midia } from "@/lib/db/schema";
import { pode } from "@/lib/permissoes";
import { ehIdDoYoutube } from "@/lib/youtube/link";
import type { Youtube } from "@/lib/youtube/youtube";

import { enderecoDaCapa, lerCapaPadrao, respostaDeImagem, TEXTO_PURO } from "./capa";
import { filtroNoAr } from "./comum";
import { EPISODIOS_POR_LEVA, numeroDaBusca, type FiltrosDoRadio } from "./filtros";

/**
 * Leituras públicas do Rádio Chofer (RF05, E61). Só o que está no ar pelo relógio: agendado ou
 * publicado com `exibicao_em ≤ agora`. Rascunho e agendado no futuro ficam de fora.
 */

export type EpisodioDoSite = {
  id: string;
  numero: number;
  titulo: string;
  resumo: string | null;
  exibicaoEm: Date;
  duracaoSeg: number | null;
  youtubeId: string;
  /** A capa da Mídia (endereço público) ou a do YouTube pela nossa rota (E61): nunca o i.ytimg.com. */
  capaUrl: string;
  temaNome: string | null;
  temTranscricao: boolean;
};

export type TemaDoSite = { slug: string; nome: string; total: number };

const colunas = {
  id: episodio.id,
  numero: episodio.numero,
  titulo: episodio.titulo,
  resumo: episodio.resumo,
  exibicaoEm: episodio.exibicaoEm,
  duracaoSeg: episodio.duracaoSeg,
  youtubeId: episodio.youtubeId,
  capaChave: midia.chaveR2,
  temaNome: categoria.nome,
  temTranscricao: sql<boolean>`${episodio.transcricao} IS NOT NULL`,
};

type Lida = {
  id: string;
  numero: number;
  titulo: string;
  resumo: string | null;
  exibicaoEm: Date | null;
  duracaoSeg: number | null;
  youtubeId: string;
  capaChave: string | null;
  temaNome: string | null;
  temTranscricao: boolean;
};

function paraOSite({ capaChave, ...l }: Lida): EpisodioDoSite {
  return { ...l, exibicaoEm: l.exibicaoEm!, capaUrl: enderecoDaCapa({ youtubeId: l.youtubeId, capaChave }, "site") };
}

function selecionar() {
  return banco()
    .select(colunas)
    .from(episodio)
    .leftJoin(categoria, eq(categoria.id, episodio.temaCategoriaId))
    .leftJoin(midia, eq(midia.id, episodio.capaMidiaId));
}

const maisRecentes = [desc(episodio.exibicaoEm), desc(episodio.numero)];

/** Busca no título, no resumo e no tema, sem acento e sem maiúsculas; “42” ou “ep 42” também pelo número. */
function condicaoDaBusca(busca: string): SQL | undefined {
  const termo = busca.trim();
  if (!termo) return undefined;
  const padrao = `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const texto = sql`unaccent(concat_ws(' ', ${episodio.titulo}, ${episodio.resumo}, ${categoria.nome})) ilike unaccent(${padrao})`;
  const numero = numeroDaBusca(termo);
  return numero === null ? texto : or(texto, eq(episodio.numero, numero));
}

/** Temas com pelo menos um episódio no ar, na ordem das Configurações, com a contagem (seletor “Tema”). */
export async function temasDoSite(agora: Date = new Date()): Promise<TemaDoSite[]> {
  const linhas = await banco()
    .select({ nome: categoria.nome, total: sql<number>`count(${episodio.id})::int` })
    .from(categoria)
    .innerJoin(episodio, eq(episodio.temaCategoriaId, categoria.id))
    .where(and(filtroNoAr(agora), sql`'radio' = any(${categoria.escopos})`))
    .groupBy(categoria.id)
    .orderBy(asc(categoria.ordem), asc(categoria.nome));
  return linhas.map((l) => ({ ...l, slug: slugificar(l.nome, "tema") }));
}

/**
 * A grade “Todos os programas”: do mais novo ao mais antigo pela exibição, `leva` × 6 de uma vez.
 * O tema da URL é o slug: um tema sem episódio no ar dá a lista vazia (o seletor mostra o tema com 0).
 */
export async function episodiosDoSite(
  filtros: FiltrosDoRadio,
  agora: Date = new Date(),
): Promise<{ itens: EpisodioDoSite[]; total: number; temMais: boolean }> {
  let condicaoDoTema: SQL | undefined;
  if (filtros.tema) {
    const temas = await temasDoSite(agora);
    const nome = temas.find((t) => t.slug === filtros.tema)?.nome;
    if (!nome) return { itens: [], total: 0, temMais: false };
    condicaoDoTema = eq(categoria.nome, nome);
  }
  const onde = and(filtroNoAr(agora), condicaoDoTema, condicaoDaBusca(filtros.busca));
  const limite = filtros.leva * EPISODIOS_POR_LEVA;
  const [linhas, [contagem]] = await Promise.all([
    selecionar()
      .where(onde)
      .orderBy(...maisRecentes)
      .limit(limite),
    banco()
      .select({ total: sql<number>`count(*)::int` })
      .from(episodio)
      .leftJoin(categoria, eq(categoria.id, episodio.temaCategoriaId))
      .where(onde),
  ]);
  const total = contagem?.total ?? 0;
  return { itens: linhas.map(paraOSite), total, temMais: total > limite };
}

/** O topo da página (R12): o último programa no ar ou, sem ele, o episódio mais recente no ar. */
export async function ultimoPrograma(agora: Date = new Date()): Promise<EpisodioDoSite | null> {
  const [linha] = await selecionar()
    .where(filtroNoAr(agora))
    .orderBy(desc(episodio.ultimoPrograma), ...maisRecentes)
    .limit(1);
  return linha ? paraOSite(linha) : null;
}

/** O episódio no ar com este id do YouTube, para a rota da capa e a da transcrição. */
async function noArPeloYoutubeId(youtubeId: string, agora: Date) {
  if (!ehIdDoYoutube(youtubeId)) return null;
  const [linha] = await banco()
    .select({ youtubeId: episodio.youtubeId, transcricao: episodio.transcricao })
    .from(episodio)
    .where(and(eq(episodio.youtubeId, youtubeId), filtroNoAr(agora)));
  return linha ?? null;
}

const NAO_ENCONTRADO = "Este episódio não está disponível no site.";
const naoEncontrado = () => new Response(NAO_ENCONTRADO, { status: 404, headers: TEXTO_PURO });

/**
 * A capa do episódio no site (E61): `/radio-chofer/capa/[youtubeId]`. Procura o episódio no ar pelo
 * id no banco e só então pede a capa ao YouTube (que tem cache no servidor). Se o YouTube falhar, serve
 * a capa padrão do Rádio Chofer. Id de episódio fora do ar: 404, para a rota não virar um proxy aberto.
 * O navegador do visitante nunca fala com o Google antes de tocar (E56).
 */
export async function responderCapa(
  pedido: { youtubeId: string },
  deps: { youtube: Youtube; agora?: Date },
): Promise<Response> {
  if (!pode({ tipo: "visitante" }, "ver", { tipo: "site_publico" })) return new Response(null, { status: 403 });
  const ep = await noArPeloYoutubeId(pedido.youtubeId, deps.agora ?? new Date());
  if (!ep) return naoEncontrado();

  const capa = await deps.youtube.baixarCapa(ep.youtubeId);
  if (capa) return respostaDeImagem(capa.bytes, capa.tipo, "public, max-age=86400, stale-while-revalidate=604800");
  // Pouco tempo de cache na padrão: quando o YouTube voltar, a capa certa aparece logo.
  return respostaDeImagem(await lerCapaPadrao(), "image/jpeg", "public, max-age=300", { "x-capa-padrao": "1" });
}

/** A transcrição do episódio no ar (E55), em texto simples, pedida só quando a janela abre. */
export async function responderTranscricao(pedido: { youtubeId: string }, deps: { agora?: Date } = {}): Promise<Response> {
  if (!pode({ tipo: "visitante" }, "ver", { tipo: "site_publico" })) return new Response(null, { status: 403 });
  const ep = await noArPeloYoutubeId(pedido.youtubeId, deps.agora ?? new Date());
  if (!ep?.transcricao) return naoEncontrado();
  return new Response(ep.transcricao, { headers: { ...TEXTO_PURO, "cache-control": "public, max-age=60" } });
}

/** Quantos episódios estão no ar (o “Todos os temas” do seletor). */
export async function totalNoAr(agora: Date = new Date()): Promise<number> {
  const [linha] = await banco()
    .select({ total: sql<number>`count(*)::int` })
    .from(episodio)
    .where(filtroNoAr(agora));
  return linha?.total ?? 0;
}

/**
 * O programa ao vivo para o site (E61), lido direto do banco, sem o cache de 60 s da ConfigSite
 * (RN43): ligar ou desligar no painel aparece na próxima visita. É uma leitura pequena, só do campo.
 */
export async function programaDoSite(): Promise<ProgramaAoVivo> {
  const [linha] = await banco()
    .select({ programa: sql<unknown>`${configSite.dados} -> 'programa'` })
    .from(configSite)
    .where(eq(configSite.id, "site"));
  return esquemaProgramaAoVivo.parse(linha?.programa);
}
