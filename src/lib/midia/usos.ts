import { inArray } from "drizzle-orm";

import { rotuloDaNoticia } from "@/lib/conteudos/dados";
import { rotuloDoDocumento, type TipoDocumento } from "@/lib/documentos/dados";
import { banco, type Transacao } from "@/lib/db";
import { conteudo, destaqueHome, midiaUso } from "@/lib/db/schema";

import type { UsoDaMidia } from "./erros";

type Descricao = { rotulo: string; href?: string };

/**
 * Como descrever cada dono de mídia ("Usado em"): título e link no painel. Cada área registra o seu
 * quando passa a usar a Mídia (notícia no #8, documento no #12, parceiro no #19…). Sem descritor,
 * aparece o nome genérico do tipo.
 */
const DESCRITORES: Record<string, (ids: string[], tx: Transacao | ReturnType<typeof banco>) => Promise<Map<string, Descricao>>> =
  {
    noticia: async (ids, tx) => {
      const linhas = await tx.select({ id: conteudo.id, titulo: conteudo.titulo }).from(conteudo).where(inArray(conteudo.id, ids));
      return new Map(
        linhas.map((l) => [l.id, { rotulo: rotuloDaNoticia(l.titulo), href: `/painel/conteudos/noticia/${l.id}` }]),
      );
    },
    documento: async (ids, tx) => {
      const linhas = await tx
        .select({ id: conteudo.id, tipo: conteudo.tipo, titulo: conteudo.titulo })
        .from(conteudo)
        .where(inArray(conteudo.id, ids));
      return new Map(
        linhas.map((l) => [
          l.id,
          { rotulo: rotuloDoDocumento(l.tipo as TipoDocumento, l.titulo), href: `/painel/conteudos/documento/${l.id}` },
        ]),
      );
    },
    // A foto de uma Chamada da Página inicial (E63): o dono é o id da Chamada; o rótulo, a frase.
    destaque: async (ids, tx) => {
      const linhas = await tx
        .selectDistinctOn([destaqueHome.itemId], { id: destaqueHome.itemId, frase: destaqueHome.fraseChamada })
        .from(destaqueHome)
        .where(inArray(destaqueHome.itemId, ids))
        .orderBy(destaqueHome.itemId, destaqueHome.versao);
      return new Map(
        linhas.flatMap((l) => (l.id ? [[l.id, { rotulo: `Página inicial · Chamada “${l.frase ?? ""}”`, href: "/painel/pagina-inicial" }] as const] : [])),
      );
    },
  };

const NOME_DO_DONO: Record<string, string> = {
  noticia: "Notícia",
  documento: "Documento oficial",
  parceiro: "Parceiro de benefícios",
  episodio: "Episódio da Rádio Chofer",
  destaque: "Destaque da Página inicial",
};

/** Usos de cada arquivo, já descritos para a tela. Ordem estável: tipo do dono e id. */
export async function usosDasMidias(
  ids: string[],
  tx: Transacao | ReturnType<typeof banco> = banco(),
): Promise<Map<string, UsoDaMidia[]>> {
  const resultado = new Map<string, UsoDaMidia[]>();
  if (ids.length === 0) return resultado;

  const linhas = await tx
    .select()
    .from(midiaUso)
    .where(inArray(midiaUso.midiaId, ids))
    .orderBy(midiaUso.donoTipo, midiaUso.donoId);

  const porTipo = new Map<string, string[]>();
  for (const linha of linhas) porTipo.set(linha.donoTipo, [...(porTipo.get(linha.donoTipo) ?? []), linha.donoId]);
  const descricoes = new Map<string, Descricao>();
  for (const [tipo, donos] of porTipo) {
    const descrever = DESCRITORES[tipo];
    if (!descrever) continue;
    for (const [donoId, descricao] of await descrever(donos, tx)) descricoes.set(`${tipo}:${donoId}`, descricao);
  }

  for (const linha of linhas) {
    const descricao = descricoes.get(`${linha.donoTipo}:${linha.donoId}`) ?? {
      rotulo: NOME_DO_DONO[linha.donoTipo] ?? "Conteúdo",
    };
    const uso: UsoDaMidia = { donoTipo: linha.donoTipo, donoId: linha.donoId, ...descricao };
    resultado.set(linha.midiaId, [...(resultado.get(linha.midiaId) ?? []), uso]);
  }
  return resultado;
}
