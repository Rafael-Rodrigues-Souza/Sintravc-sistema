import { inArray } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { midiaUso } from "@/lib/db/schema";

import type { UsoDaMidia } from "./erros";

type Descricao = { rotulo: string; href?: string };

/**
 * Como descrever cada dono de mídia ("Usado em"): título e link no painel. Cada área registra o seu
 * quando passa a usar a Mídia (notícia no #8, documento no #12, parceiro no #19…). Sem descritor,
 * aparece o nome genérico do tipo.
 */
const DESCRITORES: Record<string, (ids: string[], tx: Transacao | ReturnType<typeof banco>) => Promise<Map<string, Descricao>>> =
  {};

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
