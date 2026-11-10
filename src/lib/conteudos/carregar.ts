import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { banco, type Transacao } from "@/lib/db";
import { conteudo, conteudoLink, conteudoVersao, noticia, pessoaEquipe } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import type { DadosNoticia, DocCorpo } from "./dados";
import type { VersaoServidor } from "./fila-rascunho";

export type NoticiaAberta = {
  id: string;
  estado: (typeof conteudo.$inferSelect)["estado"];
  revisao: number;
  versao: number;
  /** A revisão que está no ar (E42). Nula enquanto nunca foi publicada. */
  revisaoPublicada: number | null;
  jaPublicado: boolean;
  slug: string | null;
  publicadoEm: Date | null;
  autorId: string;
  autorNome: string;
  /** Quem fez o último salvamento e quando (N4: "Salva por Carlos Ribeiro às 10h38"). */
  salvoPorNome: string;
  atualizadoEm: Date;
  dados: DadosNoticia;
};

/** Lê a notícia como está no servidor. Sem permissão de ver, nega (RNF01). */
export async function carregarNoticia(id: string, deps: { quem: QuemDaEquipe }): Promise<NoticiaAberta | null> {
  exigir(deps.quem, "ver", { tipo: "noticia" });
  return lerNoticia(banco(), id);
}

/** Leitura sem conferir permissão, para quem já conferiu (dentro da transação do salvamento). */
export async function lerNoticia(tx: Transacao | ReturnType<typeof banco>, id: string): Promise<NoticiaAberta | null> {
  const salvoPor = alias(pessoaEquipe, "salvo_por");
  const [linha] = await tx
    .select({ conteudo, noticia, autorNome: pessoaEquipe.nome, salvoPorNome: salvoPor.nome })
    .from(conteudo)
    .innerJoin(noticia, eq(noticia.conteudoId, conteudo.id))
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudo.autorId))
    .innerJoin(salvoPor, eq(salvoPor.id, conteudo.atualizadoPor))
    .where(eq(conteudo.id, id));
  if (!linha) return null;

  const links = await tx
    .select()
    .from(conteudoLink)
    .where(eq(conteudoLink.conteudoId, id))
    .orderBy(asc(conteudoLink.ordem));

  const { conteudo: c, noticia: n } = linha;
  return {
    id: c.id,
    estado: c.estado,
    revisao: c.revisao,
    versao: c.versao,
    revisaoPublicada: c.revisaoPublicada,
    jaPublicado: c.jaPublicado,
    slug: c.slug,
    publicadoEm: c.publicadoEm,
    autorId: c.autorId,
    autorNome: linha.autorNome,
    salvoPorNome: linha.salvoPorNome,
    atualizadoEm: c.atualizadoEm,
    dados: {
      titulo: c.titulo,
      linhaFina: n.linhaFina,
      lide: n.lide,
      corpo: n.corpo as DocCorpo,
      capaMidiaId: n.capaMidiaId,
      capaAlt: n.capaAlt,
      capaLegenda: n.capaLegenda,
      assinatura: n.assinatura,
      local: n.local,
      categoriaId: c.categoriaId,
      palavrasChave: n.palavrasChave,
      links: links.map((l) => ({ tipo: l.tipo, titulo: l.titulo, url: l.url, midiaId: l.midiaId, visivel: l.visivel })),
    },
  };
}

/** A versão do servidor no formato que vai para a tela (datas em texto ISO). */
export function versaoDoServidor(noticia: NoticiaAberta): VersaoServidor {
  return {
    revisao: noticia.revisao,
    dados: noticia.dados,
    salvoPorNome: noticia.salvoPorNome,
    salvoEm: noticia.atualizadoEm.toISOString(),
  };
}

/** O que fica guardado em cada versão publicada (E31, E42): tudo o que o site mostra. */
export type RetratoDaNoticia = { formato: 1; dados: DadosNoticia };

/** O retrato da versão que está no ar (a `versao` atual), ou null se nunca foi publicada. */
export async function retratoNoAr(tx: Transacao | ReturnType<typeof banco>, id: string): Promise<RetratoDaNoticia | null> {
  const [linha] = await tx
    .select({ snapshot: conteudoVersao.snapshot })
    .from(conteudoVersao)
    .innerJoin(conteudo, and(eq(conteudo.id, conteudoVersao.conteudoId), eq(conteudo.versao, conteudoVersao.versao)))
    .where(eq(conteudoVersao.conteudoId, id));
  return linha ? (linha.snapshot as RetratoDaNoticia) : null;
}
