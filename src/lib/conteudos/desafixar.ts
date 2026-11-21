import { eq } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import { banco } from "@/lib/db";
import { conteudo, noticia } from "@/lib/db/schema";
import { revalidarNoticiasDoSite } from "@/lib/noticias-do-site/revalidar";
import type { PedidoDesafixar } from "@/lib/tarefas/fila";

import { rotuloDaNoticia } from "./dados";

export type ResultadoDesafixar = { tipo: "desafixada" } | { tipo: "ignorada" };

/**
 * T05 · Notícia fixada (spec §6; RN58, E59). Roda na fila, na data do fim da fixação. O site já
 * segue o relógio (a fixada vencida não aparece mais), então aqui só limpa o campo e registra na
 * Atividade, com o sistema como autor.
 *
 * **Idempotente:** se a fixação mudou depois do pedido (fixou de novo com outra data, desafixou,
 * ocultou), o pedido é velho e não faz nada.
 */
export async function executarDesafixar(pedido: PedidoDesafixar): Promise<ResultadoDesafixar> {
  const marcadoPara = new Date(pedido.para);
  const resultado = await banco().transaction(async (tx): Promise<ResultadoDesafixar> => {
    const [atual] = await tx
      .select({ fixadaAte: noticia.fixadaAte, titulo: conteudo.titulo })
      .from(noticia)
      .innerJoin(conteudo, eq(conteudo.id, noticia.conteudoId))
      .where(eq(noticia.conteudoId, pedido.conteudoId))
      .for("update", { of: noticia });
    if (!atual || atual.fixadaAte?.getTime() !== marcadoPara.getTime()) return { tipo: "ignorada" };

    await tx.update(noticia).set({ fixadaAte: null }).where(eq(noticia.conteudoId, pedido.conteudoId));
    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao: "noticia.desafixar",
      area: "conteudos",
      alvo: { tipo: "noticia", id: pedido.conteudoId, rotulo: rotuloDaNoticia(atual.titulo) },
      detalhe: { automatico: true, fixada_ate: marcadoPara.toISOString() },
    });
    return { tipo: "desafixada" };
  });
  if (resultado.tipo === "desafixada") revalidarNoticiasDoSite();
  return resultado;
}
