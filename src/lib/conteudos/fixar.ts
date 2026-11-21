import { and, eq, gt, isNotNull, ne, sql } from "drizzle-orm";

import { banco, type Banco, type Transacao } from "@/lib/db";
import { registrarAtividade, type Ator } from "@/lib/atividade";
import { conteudo, noticia } from "@/lib/db/schema";
import { bahiaParaUtc, FUSO } from "@/lib/datas";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { rotuloDaNoticia } from "./dados";
import { ErroConteudo } from "./erros";
import { registrarAtividadeNoticia, travarNoticia } from "./salvar";

/**
 * Notícia fixada no topo da página Notícias (RN58, RF78, E14, E59).
 *
 * - `noticia.fixada_ate` é o fim **exclusivo**: “até 10/11” guarda 00:00 de 11/11 na Bahia.
 * - Na publicada, fixar vale na hora. No rascunho e na agendada, é só a intenção, que vale ao
 *   publicar (aplicarFixacaoAoPublicar). A intenção fica fora da cópia de trabalho (E47).
 * - **O site segue o relógio:** a fixada é a publicada com `fixada_ate > agora` (fixadaAtual). A T05
 *   (desafixar.ts) só limpa o campo e registra na Atividade.
 * - **Só uma:** fixação válida desafixa as outras **publicadas**; a intenção de outros rascunhos e
 *   agendadas fica (ganha o último a publicar). Um lock serializa fixar e publicar.
 */

/** O fim exclusivo da fixação escolhida na tela ("2026-11-10" → 00:00 de 11/11 na Bahia, em UTC). */
export function fimDaFixacao(dia: string): Date | null {
  const inicio = bahiaParaUtc(dia, "00:00");
  if (!inicio) return null;
  const [ano, mes, d] = dia.split("-").map(Number) as [number, number, number];
  const seguinte = new Date(Date.UTC(ano, mes - 1, d + 1)).toISOString().slice(0, 10);
  return bahiaParaUtc(seguinte, "00:00");
}

/** O dia escolhido na tela a partir do fim exclusivo guardado (o inverso de fimDaFixacao). */
export function diaDaFixacao(fim: Date): string {
  // O último instante que ainda vale é 1 ms antes do fim; o dia dele, na Bahia.
  const ultimo = new Date(fim.getTime() - 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(ultimo);
}

export type NoticiaFixada = { id: string; titulo: string; fixadaAte: Date };

/** A notícia fixada agora no site (publicada e dentro da data), ou null. `exceto` ignora uma notícia. */
export async function fixadaAtual(db: Banco | Transacao, agora: Date, exceto?: string): Promise<NoticiaFixada | null> {
  const [linha] = await db
    .select({ id: conteudo.id, titulo: conteudo.titulo, fixadaAte: noticia.fixadaAte })
    .from(noticia)
    .innerJoin(conteudo, eq(conteudo.id, noticia.conteudoId))
    .where(
      and(
        eq(conteudo.estado, "publicado"),
        isNotNull(noticia.fixadaAte),
        gt(noticia.fixadaAte, agora),
        exceto ? ne(conteudo.id, exceto) : undefined,
      ),
    )
    .orderBy(sql`${noticia.fixadaAte} desc`)
    .limit(1);
  return linha ? { ...linha, fixadaAte: linha.fixadaAte! } : null;
}

export type DepsDaFixacao = { quem: QuemDaEquipe; fila: Fila; agora?: Date; sessaoEdicao?: string };

export type ResultadoFixar =
  | {
      tipo: "fixada";
      fixadaAte: Date;
      /** Já vale no site (a notícia está publicada); senão, vale ao publicar. */
      vale: boolean;
      desafixadas: { id: string; titulo: string }[];
    }
  | { tipo: "desafixada" }
  | { tipo: "sem_mudanca" };

/**
 * Fixar (com a data) ou desafixar (data vazia) pelo editor ou pela Edição rápida (RF78). Confere a
 * permissão no servidor e grava a Atividade na mesma transação.
 */
export async function fixarNoticia(entrada: { id: string; ate: string | null }, deps: DepsDaFixacao): Promise<ResultadoFixar> {
  exigir(deps.quem, "fixar", { tipo: "noticia" });
  const agora = deps.agora ?? new Date();
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    const [{ fixadaAte } = { fixadaAte: null }] = await tx
      .select({ fixadaAte: noticia.fixadaAte })
      .from(noticia)
      .where(eq(noticia.conteudoId, entrada.id));

    if (entrada.ate === null) {
      if (!fixadaAte) return { tipo: "sem_mudanca" };
      await tx.update(noticia).set({ fixadaAte: null }).where(eq(noticia.conteudoId, entrada.id));
      await registrarAtividadeNoticia(tx, "noticia.desafixar", atual.id, atual.titulo, deps, { fixada_ate: fixadaAte.toISOString() });
      return { tipo: "desafixada" };
    }

    if (atual.estado !== "rascunho" && atual.estado !== "agendado" && atual.estado !== "publicado") {
      throw new ErroConteudo("invalido", "Só a notícia publicada, agendada ou em rascunho pode ser fixada. Atualize a página.");
    }
    const fim = fimDaFixacao(entrada.ate);
    if (!fim) throw new ErroConteudo("invalido", "Escolha uma data válida.", "fixar_ate");
    if (fim.getTime() <= agora.getTime()) {
      throw new ErroConteudo("invalido", "Escolha hoje ou uma data futura.", "fixar_ate");
    }
    if (fixadaAte?.getTime() === fim.getTime()) return { tipo: "sem_mudanca" };

    const vale = atual.estado === "publicado";
    // O lock vem antes de gravar a própria linha: dois pedidos ao mesmo tempo não se travam um ao outro.
    if (vale) await travarFixacao(tx);
    await tx.update(noticia).set({ fixadaAte: fim }).where(eq(noticia.conteudoId, entrada.id));
    const desafixadas = vale
      ? await assumirFixacao(tx, { id: atual.id, fim }, { ator: { tipo: "pessoa", id: deps.quem.id }, fila: deps.fila })
      : [];
    await registrarAtividadeNoticia(tx, "noticia.fixar", atual.id, atual.titulo, deps, {
      fixada_ate: fim.toISOString(),
      ao_publicar: !vale,
    });
    return { tipo: "fixada", fixadaAte: fim, vale, desafixadas };
  });
}

export type FixacaoAoPublicar =
  | { tipo: "sem_fixacao" }
  | { tipo: "fixada"; fixadaAte: Date; desafixadas: { id: string; titulo: string }[] }
  /** A data da intenção já passou: publica sem fixar e limpa a intenção (E59). */
  | { tipo: "vencida" };

/**
 * Ao publicar (agora, pela Edição rápida ou pela T01), aplica a intenção de fixar, na transação da
 * publicação (E59). Sem intenção, não mexe em nada. Com intenção válida, desafixa as outras
 * publicadas e agenda a T05; republicar a própria fixada não desafixa ninguém (já não há outra).
 */
export async function aplicarFixacaoAoPublicar(
  tx: Transacao,
  id: string,
  deps: { agora: Date; ator: Ator; fila?: Fila },
): Promise<FixacaoAoPublicar> {
  const [linha] = await tx.select({ fixadaAte: noticia.fixadaAte }).from(noticia).where(eq(noticia.conteudoId, id));
  const fim = linha?.fixadaAte;
  if (!fim) return { tipo: "sem_fixacao" };
  if (fim.getTime() <= deps.agora.getTime()) {
    await tx.update(noticia).set({ fixadaAte: null }).where(eq(noticia.conteudoId, id));
    return { tipo: "vencida" };
  }
  const fila = deps.fila ?? (await import("@/lib/tarefas")).filaDoSistema();
  const desafixadas = await assumirFixacao(tx, { id, fim }, { ator: deps.ator, fila: await fila });
  return { tipo: "fixada", fixadaAte: fim, desafixadas };
}

/**
 * A notícia (publicada, já travada) passa a ser a fixada: desafixa as outras publicadas, registra
 * a saída de cada uma e agenda a T05. O lock serializa dois pedidos ao mesmo tempo (só uma fixada).
 */
async function assumirFixacao(tx: Transacao, nova: { id: string; fim: Date }, deps: { ator: Ator; fila: Fila }) {
  await travarFixacao(tx);
  const desafixadas = await tx
    .update(noticia)
    .set({ fixadaAte: null })
    .from(conteudo)
    .where(
      and(
        eq(conteudo.id, noticia.conteudoId),
        eq(conteudo.estado, "publicado"),
        isNotNull(noticia.fixadaAte),
        ne(noticia.conteudoId, nova.id),
      ),
    )
    .returning({ id: noticia.conteudoId, titulo: conteudo.titulo });
  for (const d of desafixadas) {
    await registrarAtividade(tx, {
      ator: deps.ator,
      acao: "noticia.desafixar",
      area: "conteudos",
      alvo: { tipo: "noticia", id: d.id, rotulo: rotuloDaNoticia(d.titulo) },
      detalhe: { substituida_por: nova.id },
    });
  }
  await deps.fila.agendarDesafixar(tx, { conteudoId: nova.id, para: nova.fim });
  return desafixadas.map(({ id, titulo }) => ({ id, titulo }));
}

/** Serializa fixar e publicar com fixação (só uma fixada). Pode ser pedido de novo na mesma transação. */
async function travarFixacao(tx: Transacao) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('noticia_fixada'))`);
}

/** Ocultar e arquivar tiram a fixação (e a intenção) na mesma transação. Devolve se havia. */
export async function desafixarAoSairDoAr(tx: Transacao, id: string): Promise<boolean> {
  const linhas = await tx
    .update(noticia)
    .set({ fixadaAte: null })
    .where(and(eq(noticia.conteudoId, id), isNotNull(noticia.fixadaAte)))
    .returning({ id: noticia.conteudoId });
  return linhas.length > 0;
}
