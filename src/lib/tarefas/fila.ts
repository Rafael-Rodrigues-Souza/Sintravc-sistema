import type { Transacao } from "@/lib/db";

/** Nome da fila da T01 (spec §6) e da fila que recebe o que esgotou as tentativas. */
export const FILA_PUBLICAR_AGENDADO = "publicar-agendado";
export const FILA_PUBLICAR_AGENDADO_FALHOU = "publicar-agendado-falhou";

/**
 * O pedido guardado na fila: a notícia e a hora marcada, em texto ISO (UTC). A hora vai junto
 * para a tarefa reconhecer um agendamento velho: se a notícia foi reagendada ou cancelada depois,
 * a tarefa não faz nada (E44).
 */
export type PedidoPublicacao = { conteudoId: string; para: string };

/**
 * A fila de tarefas (pg-boss, E44). O pedido entra **na mesma transação** da ação que agendou:
 * se a ação falhar, o pedido também não fica na fila.
 */
export interface Fila {
  agendarPublicacao(tx: Transacao, pedido: { conteudoId: string; para: Date }): Promise<void>;
}

/** Fila em memória, para os testes das regras (sem o pg-boss). */
export function filaEmMemoria() {
  const pedidos: PedidoPublicacao[] = [];
  const fila: Fila = {
    async agendarPublicacao(_tx, { conteudoId, para }) {
      pedidos.push({ conteudoId, para: para.toISOString() });
    },
  };
  return { fila, pedidos };
}
