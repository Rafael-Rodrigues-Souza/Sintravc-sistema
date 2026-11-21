import { readFile } from "node:fs/promises";
import path from "node:path";

import { and, asc, desc, eq, or, sql, type SQL } from "drizzle-orm";

import { urlPublica } from "@/lib/armazenamento";
import { slugificar } from "@/lib/conteudos/publicar";
import { banco } from "@/lib/db";
import { categoria, episodio, midia } from "@/lib/db/schema";
import { lerEnvArmazenamento } from "@/lib/env";
import { pode } from "@/lib/permissoes";
import { ehIdDoYoutube } from "@/lib/youtube/link";
import type { Youtube } from "@/lib/youtube/youtube";

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

/** A capa do episódio no site: a da Mídia, se trocada, ou a do YouTube pela rota `/radio-chofer/capa/[id]`. */
export function enderecoDaCapaNoSite(youtubeId: string, capaChave: string | null): string {
  return capaChave ? urlPublica(capaChave, lerEnvArmazenamento()) : `/radio-chofer/capa/${youtubeId}`;
}

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
  return { ...l, exibicaoEm: l.exibicaoEm!, capaUrl: enderecoDaCapaNoSite(l.youtubeId, capaChave) };
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

const CAPA_PADRAO = path.join(process.cwd(), "public", "site", "radio", "capa-padrao.jpg");
const NAO_ENCONTRADO = "Este episódio não está disponível no site.";

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
  if (!ep) return new Response(NAO_ENCONTRADO, { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

  const capa = await deps.youtube.baixarCapa(ep.youtubeId);
  if (capa) {
    return new Response(capa.bytes as BodyInit, {
      headers: {
        "content-type": capa.tipo,
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
      },
    });
  }
  const padrao = await readFile(CAPA_PADRAO);
  return new Response(new Uint8Array(padrao) as BodyInit, {
    headers: {
      "content-type": "image/jpeg",
      // Pouco tempo: quando o YouTube voltar, a capa certa aparece logo.
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
      "x-capa-padrao": "1",
    },
  });
}

/** A transcrição do episódio no ar (E55), em texto simples, pedida só quando a janela abre. */
export async function responderTranscricao(pedido: { youtubeId: string }, deps: { agora?: Date } = {}): Promise<Response> {
  if (!pode({ tipo: "visitante" }, "ver", { tipo: "site_publico" })) return new Response(null, { status: 403 });
  const ep = await noArPeloYoutubeId(pedido.youtubeId, deps.agora ?? new Date());
  if (!ep?.transcricao) return new Response(NAO_ENCONTRADO, { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(ep.transcricao, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=60",
      "x-content-type-options": "nosniff",
    },
  });
}
