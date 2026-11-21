import { eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { episodio } from "@/lib/db/schema";
import type { PedidoEpisodio } from "@/lib/tarefas/fila";

import { registrar } from "./comum";

export type ResultadoEntrada = { tipo: "feita" } | { tipo: "ignorada" };

/**
 * T03 · Episódios agendados (spec §6, E61). Roda na fila, na hora da exibição. O site já segue o
 * relógio; esta tarefa acerta o `estado` e grava a Atividade, com o ator "sistema" e o atraso.
 *
 * Idempotente: se o episódio não está mais agendado para esta hora (exibição mudou, voltou a
 * rascunho, excluído) ou já entrou, não faz nada.
 */
export async function executarEntradaDoEpisodio(pedido: PedidoEpisodio, deps: { agora?: Date } = {}): Promise<ResultadoEntrada> {
  const marcadoPara = new Date(pedido.para);
  const agora = deps.agora ?? new Date();

  return banco().transaction(async (tx) => {
    const [atual] = await tx.select().from(episodio).where(eq(episodio.id, pedido.episodioId)).for("update");
    if (!atual || atual.estado !== "agendado" || atual.exibicaoEm?.getTime() !== marcadoPara.getTime()) {
      return { tipo: "ignorada" };
    }
    await tx
      .update(episodio)
      .set({ estado: "publicado", jaPublicado: true, publicadoEm: atual.publicadoEm ?? atual.exibicaoEm })
      .where(eq(episodio.id, atual.id));
    await registrar(tx, null, atual, "entrar_no_ar", {
      marcado_para: marcadoPara.toISOString(),
      atraso_segundos: Math.max(0, Math.round((agora.getTime() - marcadoPara.getTime()) / 1000)),
    });
    return { tipo: "feita" };
  });
}
