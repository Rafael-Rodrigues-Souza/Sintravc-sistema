import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { banco, type Transacao } from "@/lib/db";
import { conteudo, conteudoLink, noticia, pessoaEquipe } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import type { DadosNoticia, DocCorpo } from "./dados";

export type NoticiaAberta = {
  id: string;
  estado: (typeof conteudo.$inferSelect)["estado"];
  revisao: number;
  versao: number;
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
