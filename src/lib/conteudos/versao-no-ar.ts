import { eq } from "drizzle-orm";

import type { Transacao } from "@/lib/db";
import { conteudo } from "@/lib/db/schema";

import { jaFoiAoAr, mesmosDados } from "./publicacao";
import type { LinhaDoConteudo } from "./tipo-do-conteudo";

/**
 * Se a cópia de trabalho está igual à versão no ar, a `revisao_publicada` acompanha a `revisao`, e o
 * aviso de alterações não publicadas some (E47). Vale para notícia e documento, publicado ou oculto.
 * Devolve a linha como ficou.
 */
export async function acompanharVersaoNoAr(
  tx: Transacao,
  linha: LinhaDoConteudo,
  dados: unknown,
  noAr: { dados: unknown } | null,
): Promise<LinhaDoConteudo> {
  if (!noAr || !jaFoiAoAr(linha.estado) || linha.revisaoPublicada === linha.revisao || !mesmosDados(noAr.dados, dados)) {
    return linha;
  }
  const [atualizada] = await tx.update(conteudo).set({ revisaoPublicada: linha.revisao }).where(eq(conteudo.id, linha.id)).returning();
  return atualizada!;
}
