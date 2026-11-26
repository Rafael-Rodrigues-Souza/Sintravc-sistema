import type { Transacao } from "@/lib/db";

/** Nome da fila da T01 (spec §6) e da fila que recebe o que esgotou as tentativas. */
export const FILA_PUBLICAR_AGENDADO = "publicar-agendado";
export const FILA_PUBLICAR_AGENDADO_FALHOU = "publicar-agendado-falhou";
/** Fila da T02 (spec §6): o comunicado entra no ar no início e sai no fim do período. */
export const FILA_COMUNICADO = "comunicado-periodo";
/** Fila da T05 (spec §6): a notícia fixada deixa de ser fixada na data escolhida (E59). */
export const FILA_DESAFIXAR = "noticia-desafixar";
/** Fila da T03 (spec §6): o episódio agendado do Rádio Chofer vai ao ar na hora da exibição (E61). */
export const FILA_EPISODIO = "episodio-entrar-no-ar";
/** Fila da T04 (spec §6): o destaque entra e sai do carrossel da Home (E62). */
export const FILA_DESTAQUE = "destaque-home-virada";

/**
 * O pedido guardado na fila: a notícia e a hora marcada, em texto ISO (UTC). A hora vai junto
 * para a tarefa reconhecer um agendamento velho: se a notícia foi reagendada ou cancelada depois,
 * a tarefa não faz nada (E44).
 */
export type PedidoPublicacao = { conteudoId: string; para: string };

/**
 * T02: o comunicado, a virada (entrar ou sair do ar) e a hora marcada, em ISO (UTC). Como na T01,
 * o pedido cujo horário não bate mais com o comunicado (período mudou, encerrado antes) não faz nada.
 */
export type PedidoComunicado = { comunicadoId: string; virada: "entrar" | "sair"; para: string };

/**
 * T05: a notícia e o fim da fixação, em ISO (UTC). Se a data mudou depois (fixou de novo, desafixou),
 * o pedido não faz nada (E59).
 */
export type PedidoDesafixar = { conteudoId: string; para: string };

/**
 * T03: o episódio e a hora da exibição, em ISO (UTC). Se a exibição mudou ou o episódio voltou a
 * rascunho, o pedido não faz nada (E61).
 */
export type PedidoEpisodio = { episodioId: string; para: string };

/**
 * T04: o item do carrossel (`chave`, como “noticia:<id>”, porque o id da linha muda a cada
 * publicação), a virada e a hora, em ISO (UTC). Se o item não está mais no publicado com essa hora,
 * o pedido não faz nada (E62).
 */
export type PedidoDestaque = { chave: string; virada: "entrar" | "sair"; para: string };

/**
 * A fila de tarefas (pg-boss, E44). O pedido entra **na mesma transação** da ação que agendou:
 * se a ação falhar, o pedido também não fica na fila.
 */
export interface Fila {
  agendarPublicacao(tx: Transacao, pedido: { conteudoId: string; para: Date }): Promise<void>;
  agendarComunicado(tx: Transacao, pedido: { comunicadoId: string; virada: PedidoComunicado["virada"]; para: Date }): Promise<void>;
  agendarDesafixar(tx: Transacao, pedido: { conteudoId: string; para: Date }): Promise<void>;
  agendarEpisodio(tx: Transacao, pedido: { episodioId: string; para: Date }): Promise<void>;
  agendarDestaque(tx: Transacao, pedido: { chave: string; virada: PedidoDestaque["virada"]; para: Date }): Promise<void>;
}

/** Fila em memória, para os testes das regras (sem o pg-boss). */
export function filaEmMemoria() {
  const pedidos: PedidoPublicacao[] = [];
  const pedidosComunicado: PedidoComunicado[] = [];
  const pedidosDesafixar: PedidoDesafixar[] = [];
  const pedidosEpisodio: PedidoEpisodio[] = [];
  const pedidosDestaque: PedidoDestaque[] = [];
  const fila: Fila = {
    async agendarPublicacao(_tx, { conteudoId, para }) {
      pedidos.push({ conteudoId, para: para.toISOString() });
    },
    async agendarComunicado(_tx, { comunicadoId, virada, para }) {
      pedidosComunicado.push({ comunicadoId, virada, para: para.toISOString() });
    },
    async agendarDesafixar(_tx, { conteudoId, para }) {
      pedidosDesafixar.push({ conteudoId, para: para.toISOString() });
    },
    async agendarEpisodio(_tx, { episodioId, para }) {
      pedidosEpisodio.push({ episodioId, para: para.toISOString() });
    },
    async agendarDestaque(_tx, { chave, virada, para }) {
      pedidosDestaque.push({ chave, virada, para: para.toISOString() });
    },
  };
  return { fila, pedidos, pedidosComunicado, pedidosDesafixar, pedidosEpisodio, pedidosDestaque };
}
