import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { banco } from "@/lib/db";
import { conteudo, conteudoVersao, episodio, midia } from "@/lib/db/schema";
import { enderecoDaCapa } from "@/lib/episodios/capa";
import { filtroNoAr } from "@/lib/episodios/comum";
import { urlPublica } from "@/lib/armazenamento";
import { lerEnvArmazenamento } from "@/lib/env";
import { exigir } from "@/lib/permissoes";

import type { Deps } from "./rascunho";

/** Uma opção na janela “Adicionar destaque” ou “Trocar”: só o que está no ar (E62). */
export type OpcaoDeDestaque = {
  tipo: "noticia" | "episodio";
  id: string;
  titulo: string;
  rotulo: string;
  capaUrl: string | null;
  temCapa: boolean;
  quando: Date;
};

/** Quantas opções a janela mostra de cada vez. A busca refina. */
export const OPCOES_POR_BUSCA = 20;

function padraoDaBusca(busca: string): string | null {
  const termo = busca.trim();
  return termo ? `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}

/** As notícias publicadas ou os episódios no ar, dos mais novos aos mais antigos, com busca no título. */
export async function opcoesDeDestaque(pedido: { tipo: "noticia" | "episodio"; busca: string }, deps: Deps): Promise<OpcaoDeDestaque[]> {
  exigir(deps.quem, "gerenciar", { tipo: "pagina_inicial" });
  const agora = deps.agora ?? new Date();
  const padrao = padraoDaBusca(pedido.busca);

  if (pedido.tipo === "noticia") {
    const dados = sql`${conteudoVersao.snapshot} -> 'dados'`;
    const linhas = await banco()
      .select({
        id: conteudo.id,
        titulo: sql<string>`${dados} ->> 'titulo'`,
        publicadoEm: conteudo.publicadoEm,
        capaChave: midia.chaveR2,
        categoria: sql<string | null>`(SELECT nome FROM categoria WHERE categoria.id::text = ${dados} ->> 'categoriaId')`,
      })
      .from(conteudo)
      .innerJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
      .leftJoin(midia, sql`${midia.id}::text = ${dados} ->> 'capaMidiaId'`)
      .where(
        and(
          eq(conteudo.tipo, "noticia"),
          eq(conteudo.estado, "publicado"),
          isNotNull(conteudo.slug),
          padrao ? sql`unaccent(${dados} ->> 'titulo') ilike unaccent(${padrao})` : undefined,
        ),
      )
      .orderBy(desc(conteudo.publicadoEm), desc(conteudo.id))
      .limit(OPCOES_POR_BUSCA);
    const env = linhas.some((l) => l.capaChave) ? lerEnvArmazenamento() : null;
    return linhas.map((l) => ({
      tipo: "noticia",
      id: l.id,
      titulo: l.titulo,
      rotulo: l.categoria ? `Notícia · ${l.categoria}` : "Notícia",
      capaUrl: l.capaChave && env ? urlPublica(l.capaChave, env) : null,
      temCapa: l.capaChave !== null,
      quando: l.publicadoEm!,
    }));
  }

  const linhas = await banco()
    .select({ id: episodio.id, numero: episodio.numero, titulo: episodio.titulo, youtubeId: episodio.youtubeId, exibicaoEm: episodio.exibicaoEm, capaChave: midia.chaveR2 })
    .from(episodio)
    .leftJoin(midia, eq(midia.id, episodio.capaMidiaId))
    .where(and(filtroNoAr(agora), padrao ? sql`(unaccent(${episodio.titulo}) ilike unaccent(${padrao}) OR ${episodio.numero}::text = ${pedido.busca.trim()})` : undefined))
    .orderBy(desc(episodio.exibicaoEm), desc(episodio.numero))
    .limit(OPCOES_POR_BUSCA);
  return linhas.map((l) => ({
    tipo: "episodio",
    id: l.id,
    titulo: l.titulo,
    rotulo: `Rádio Chofer · Ep. ${l.numero}`,
    capaUrl: enderecoDaCapa({ youtubeId: l.youtubeId, capaChave: l.capaChave }, "painel"),
    temCapa: true,
    quando: l.exibicaoEm!,
  }));
}
