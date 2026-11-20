import { eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { comunicado } from "@/lib/db/schema";
import type { PedidoComunicado } from "@/lib/tarefas/fila";

import { registrar } from "./comum";

export type ResultadoVirada = { tipo: "feita" } | { tipo: "ignorada" };

/**
 * T02 · Comunicados (spec §6; CA-US24.1, RF71, RNF13). Roda na fila, no início e no fim do período.
 * A faixa do site já segue o relógio (E58); esta tarefa acerta o `estado` e grava a Atividade, com o
 * ator "sistema" e o atraso, se o servidor estava fora do ar.
 *
 * Idempotente: se o comunicado não está mais marcado para esta hora (período mudou, encerrado antes,
 * voltou a rascunho, excluído) ou a virada já foi feita, não faz nada.
 */
export async function executarViradaDoComunicado(pedido: PedidoComunicado, deps: { agora?: Date } = {}): Promise<ResultadoVirada> {
  const marcadoPara = new Date(pedido.para);
  const agora = deps.agora ?? new Date();

  return banco().transaction(async (tx) => {
    const [atual] = await tx.select().from(comunicado).where(eq(comunicado.id, pedido.comunicadoId)).for("update");
    if (!atual) return { tipo: "ignorada" };
    const atraso = { marcado_para: marcadoPara.toISOString(), atraso_segundos: Math.max(0, Math.round((agora.getTime() - marcadoPara.getTime()) / 1000)) };

    if (pedido.virada === "entrar") {
      if (atual.estado !== "agendado" || atual.inicio?.getTime() !== marcadoPara.getTime()) return { tipo: "ignorada" };
      await tx.update(comunicado).set({ estado: "publicado", jaPublicado: true, publicadoEm: atual.inicio }).where(eq(comunicado.id, atual.id));
      await registrar(tx, null, atual, "entrar_no_ar", atraso);
      return { tipo: "feita" };
    }

    const programado = atual.estado === "agendado" || atual.estado === "publicado";
    if (!programado || atual.fim?.getTime() !== marcadoPara.getTime()) return { tipo: "ignorada" };
    await tx
      .update(comunicado)
      .set({ estado: "encerrado", encerradoEm: atual.fim, jaPublicado: true, publicadoEm: atual.publicadoEm ?? atual.inicio })
      .where(eq(comunicado.id, atual.id));
    await registrar(tx, null, atual, "sair_do_ar", atraso);
    return { tipo: "feita" };
  });
}
