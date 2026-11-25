import { sql, type SQL } from "drizzle-orm";
import { PgBoss, type Db } from "pg-boss";

import { executarViradaDoComunicado } from "@/lib/comunicados/tarefa";
import { executarDesafixar } from "@/lib/conteudos/desafixar";
import { executarEntradaDoEpisodio } from "@/lib/episodios/tarefa";
import { executarViradaDoDestaque } from "@/lib/pagina-inicial/tarefa";
import { executarPublicacaoAgendada, registrarFalhaDaPublicacao } from "@/lib/conteudos/publicar-agendado";
import { motivoDaFalha } from "@/lib/conteudos/motivo-da-falha";
import type { Transacao } from "@/lib/db";
import type { Enviar } from "@/lib/email";
import { lerParametro } from "@/lib/parametros";

import {
  FILA_COMUNICADO,
  FILA_DESAFIXAR,
  FILA_DESTAQUE,
  FILA_EPISODIO,
  FILA_PUBLICAR_AGENDADO,
  FILA_PUBLICAR_AGENDADO_FALHOU,
  type Fila,
  type PedidoComunicado,
  type PedidoDesafixar,
  type PedidoDestaque,
  type PedidoEpisodio,
  type PedidoPublicacao,
} from "./fila";

/** Quanto o desligamento espera a tarefa em andamento terminar (E44). */
const ESPERA_AO_DESLIGAR_MS = 30_000;

export type OpcoesDoTrabalhador = {
  url: string;
  enviar: Enviar;
  /** Sobrepõem o Parametro (tarefas.tentativas e tarefas.intervalo_segundos): só nos testes. */
  tentativas?: number;
  intervaloSegundos?: number;
  /** De quanto em quanto tempo procura tarefas que chegaram na hora (padrão do pg-boss: 2 s). */
  intervaloDeBuscaSegundos?: number;
};

export type Trabalhador = {
  fila: Fila;
  /** Pedidos ainda esperando a hora (ou uma nova tentativa). */
  pedidosPendentes(): Promise<PedidoPublicacao[]>;
  /** Para de pegar tarefas novas, mas continua aceitando pedidos. */
  pararDeTrabalhar(): Promise<void>;
  /** Desliga com calma: espera a tarefa em andamento terminar (E44). */
  parar(): Promise<void>;
};

/**
 * O pg-boss grava no banco pela transação da própria ação (E44): o pedido só fica na fila se a
 * ação der certo. Os parâmetros $1, $2… do pg-boss viram parâmetros do Drizzle.
 */
export function bancoDaTransacao(tx: Transacao): Db {
  return {
    async executeSql(texto, valores = []) {
      const partes = texto.split(/\$(\d+)/);
      const pedacos: SQL[] = partes.map((parte, i) => (i % 2 === 0 ? sql.raw(parte) : sql`${valores[Number(parte) - 1]}`));
      const linhas = await tx.execute(sql.join(pedacos));
      return { rows: [...linhas] };
    },
  };
}

/**
 * Liga o pg-boss e as tarefas da T01 (spec §6; RNF13): publica na hora marcada, tenta de novo em
 * caso de falha e, esgotadas as tentativas, registra a falha e avisa (CA-US21.11).
 */
export async function criarTrabalhador(opcoes: OpcoesDoTrabalhador): Promise<Trabalhador> {
  const boss = new PgBoss({ connectionString: opcoes.url, schema: "pgboss", max: 4 });
  boss.on("error", (erro) => console.error("Fila de tarefas (pg-boss):", erro));
  const fila: Fila = {
      async agendarPublicacao(tx, { conteudoId, para }) {
        const pedido: PedidoPublicacao = { conteudoId, para: para.toISOString() };
        // Pedido único por (notícia, hora marcada) enquanto espera a hora (E44): repetido, é descartado.
        await boss.send(FILA_PUBLICAR_AGENDADO, pedido, {
          startAfter: para,
          singletonKey: `${conteudoId}:${pedido.para}`,
          db: bancoDaTransacao(tx),
        });
      },
      async agendarComunicado(tx, { comunicadoId, virada, para }) {
        const pedido: PedidoComunicado = { comunicadoId, virada, para: para.toISOString() };
        await boss.send(FILA_COMUNICADO, pedido, {
          startAfter: para,
          singletonKey: `${comunicadoId}:${virada}:${pedido.para}`,
          db: bancoDaTransacao(tx),
        });
      },
      async agendarDesafixar(tx, { conteudoId, para }) {
        const pedido: PedidoDesafixar = { conteudoId, para: para.toISOString() };
        await boss.send(FILA_DESAFIXAR, pedido, {
          startAfter: para,
          singletonKey: `${conteudoId}:${pedido.para}`,
          db: bancoDaTransacao(tx),
        });
      },
      async agendarEpisodio(tx, { episodioId, para }) {
        const pedido: PedidoEpisodio = { episodioId, para: para.toISOString() };
        await boss.send(FILA_EPISODIO, pedido, {
          startAfter: para,
          singletonKey: `${episodioId}:${pedido.para}`,
          db: bancoDaTransacao(tx),
        });
      },
      async agendarDestaque(tx, { chave, virada, para }) {
        const pedido: PedidoDestaque = { chave, virada, para: para.toISOString() };
        await boss.send(FILA_DESTAQUE, pedido, {
          startAfter: para,
          singletonKey: `${chave}:${virada}:${pedido.para}`,
          db: bancoDaTransacao(tx),
        });
      },
  };
  try {
    await boss.start();
    await prepararFilas(boss, opcoes, fila);
  } catch (erro) {
    // Sem os parâmetros (migração pendente) ou sem banco: fecha o que abriu antes de tentar de novo.
    await boss.stop({ graceful: false }).catch(() => {});
    throw erro;
  }

  return {
    fila,
    async pedidosPendentes() {
      const jobs = await boss.findJobs<PedidoPublicacao>(FILA_PUBLICAR_AGENDADO, { queued: true });
      return jobs.map((j) => j.data);
    },
    async pararDeTrabalhar() {
      await boss.offWork(FILA_PUBLICAR_AGENDADO, { wait: true });
      await boss.offWork(FILA_PUBLICAR_AGENDADO_FALHOU, { wait: true });
      await boss.offWork(FILA_COMUNICADO, { wait: true });
      await boss.offWork(FILA_DESAFIXAR, { wait: true });
      await boss.offWork(FILA_EPISODIO, { wait: true });
      await boss.offWork(FILA_DESTAQUE, { wait: true });
    },
    async parar() {
      await boss.stop({ graceful: true, timeout: ESPERA_AO_DESLIGAR_MS });
    },
  };
}

/** Cria as filas da T01, da T02, da T03, da T04 e da T05 e começa a pegar as tarefas. */
async function prepararFilas(boss: PgBoss, opcoes: OpcoesDoTrabalhador, fila: Fila) {
  const tentativas = opcoes.tentativas ?? (await lerParametro("tarefas.tentativas"));
  const intervalo = opcoes.intervaloSegundos ?? (await lerParametro("tarefas.intervalo_segundos"));
  await garantirFila(boss, FILA_PUBLICAR_AGENDADO_FALHOU, {});
  // "short": o pg-boss guarda um pedido só por singletonKey enquanto ele espera a hora.
  await garantirFila(boss, FILA_PUBLICAR_AGENDADO, {
    policy: "short",
    retryLimit: tentativas,
    retryDelay: intervalo,
    deadLetter: FILA_PUBLICAR_AGENDADO_FALHOU,
  });

  const busca = opcoes.intervaloDeBuscaSegundos ? { pollingIntervalSeconds: opcoes.intervaloDeBuscaSegundos } : {};
  const comTentativas = { ...busca, includeMetadata: true as const };
  await boss.work<PedidoPublicacao, void, typeof comTentativas>(FILA_PUBLICAR_AGENDADO, comTentativas, async ([job]) => {
    if (!job) return;
    try {
      // A fila vai junto: a notícia agendada com fixação válida agenda a T05 ao ir ao ar (E59).
      await executarPublicacaoAgendada(job.data, { fila });
    } catch (erro) {
      if (job.retryCount < job.retryLimit) throw erro; // o pg-boss tenta de novo depois do intervalo
      console.error(`Publicação agendada falhou de vez (${job.data.conteudoId}):`, erro);
      await registrarFalhaDaPublicacao(job.data, { motivo: motivoDaFalha(erro), enviar: opcoes.enviar });
    }
  });
  // T02: a faixa já segue o relógio (E58); aqui só o estado e a Atividade. Esgotadas as tentativas, fica no log.
  await garantirFila(boss, FILA_COMUNICADO, { policy: "short", retryLimit: tentativas, retryDelay: intervalo });
  await boss.work<PedidoComunicado>(FILA_COMUNICADO, busca, async ([job]) => {
    if (job) await executarViradaDoComunicado(job.data);
  });
  // T05: o site já segue o relógio (E59); aqui só limpa a fixação e registra na Atividade.
  await garantirFila(boss, FILA_DESAFIXAR, { policy: "short", retryLimit: tentativas, retryDelay: intervalo });
  await boss.work<PedidoDesafixar>(FILA_DESAFIXAR, busca, async ([job]) => {
    if (job) await executarDesafixar(job.data);
  });
  // T03: o site já segue o relógio (E61); aqui só o estado do episódio e a Atividade.
  await garantirFila(boss, FILA_EPISODIO, { policy: "short", retryLimit: tentativas, retryDelay: intervalo });
  await boss.work<PedidoEpisodio>(FILA_EPISODIO, busca, async ([job]) => {
    if (job) await executarEntradaDoEpisodio(job.data);
  });
  // T04: o carrossel já segue o relógio (E62); aqui só a Atividade e a revalidação da Home.
  await garantirFila(boss, FILA_DESTAQUE, { policy: "short", retryLimit: tentativas, retryDelay: intervalo });
  await boss.work<PedidoDestaque>(FILA_DESTAQUE, busca, async ([job]) => {
    if (job) await executarViradaDoDestaque(job.data);
  });
  // Rede de segurança: a tarefa que nem chegou a terminar (servidor caiu no meio, tempo esgotado).
  await boss.work<PedidoPublicacao>(FILA_PUBLICAR_AGENDADO_FALHOU, busca, async ([job]) => {
    if (job) await registrarFalhaDaPublicacao(job.data, { motivo: motivoDaFalha(undefined), enviar: opcoes.enviar });
  });
}

/** Cria a fila na primeira vez; depois, atualiza as tentativas (o ADM pode ter mudado o Parametro). */
async function garantirFila(
  boss: PgBoss,
  nome: string,
  { policy, ...opcoes }: { policy?: "short"; retryLimit?: number; retryDelay?: number; deadLetter?: string },
) {
  // A política só vale na criação; as tentativas são atualizadas a cada vez que a fila liga.
  if (!(await boss.getQueue(nome))) await boss.createQueue(nome, { policy, ...opcoes });
  else if (Object.keys(opcoes).length > 0) await boss.updateQueue(nome, opcoes);
}
