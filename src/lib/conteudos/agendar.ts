import { eq } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { conteudo } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { lerNoticia, type NoticiaAberta } from "./carregar";
import { copiaDeTrabalho } from "./copia-de-trabalho";
import { ErroConteudo } from "./erros";
import { ErroFaltamCampos } from "./publicar";
import { travarNoticia } from "./salvar";
import { exigirNoConteudo, palavrasDo, registrarAtividadeConteudo, travarConteudo, type LinhaDoConteudo } from "./tipo-do-conteudo";

export type DepsDoAgendamento = {
  quem: QuemDaEquipe;
  fila: Fila;
  /** Relógio (os testes passam um fixo). */
  agora?: Date;
  /** Sessão do editor, só para a Atividade (E40). */
  sessaoEdicao?: string;
};

export type ResultadoAgendar = { tipo: "agendada"; para: Date } | { tipo: "conflito"; servidor: NoticiaAberta };

type Linha = LinhaDoConteudo;

/**
 * Agenda a notícia (CA-US21.2, RF39, RN10). Os obrigatórios são conferidos agora e de novo na hora
 * marcada, quando vai ao ar a cópia atual (E44). Estado, Atividade e o pedido na fila entram na
 * mesma transação. O do documento, que pede a confirmação oficial, está em documentos/agendar.ts.
 */
export async function agendarNoticia(
  entrada: { id: string; revisaoBase: number; para: Date },
  deps: DepsDoAgendamento,
): Promise<ResultadoAgendar> {
  exigir(deps.quem, "agendar", { tipo: "noticia" });
  conferirNoFuturo(entrada.para, deps.agora);
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, entrada.id))! };
    }
    await agendarNaTransacao(tx, atual, entrada.para, deps);
    return { tipo: "agendada", para: entrada.para };
  });
}

/**
 * Muda a data de um conteúdo agendado (arrastar no calendário, Edição rápida). Só mexe na data,
 * não no texto: por isso não confere a revisão. O pedido antigo continua na fila, mas não faz
 * nada quando chega a hora, porque a data não bate mais (E44). Quem reagenda passa a receber o
 * aviso de falha.
 */
export async function reagendarConteudo(
  entrada: { id: string; para: Date },
  deps: DepsDoAgendamento,
): Promise<{ tipo: "agendada"; para: Date }> {
  conferirNoFuturo(entrada.para, deps.agora);
  return banco().transaction(async (tx) => {
    await reagendarNaTransacao(tx, await travarConteudo(tx, entrada.id), entrada.para, deps);
    return { tipo: "agendada", para: entrada.para };
  });
}

/** "Cancelar agendamento": o conteúdo volta a Rascunho, sem data (E44). */
export async function cancelarAgendamento(
  entrada: { id: string },
  deps: { quem: QuemDaEquipe; sessaoEdicao?: string },
): Promise<{ tipo: "cancelado" }> {
  return banco().transaction(async (tx) => {
    await cancelarNaTransacao(tx, await travarConteudo(tx, entrada.id), deps);
    return { tipo: "cancelado" };
  });
}

// --- Dentro de uma transação já aberta, com o conteúdo travado (também usadas pela Edição rápida) ---

export async function agendarNaTransacao(
  tx: Transacao,
  atual: Linha,
  para: Date,
  deps: DepsDoAgendamento,
  detalhe: Record<string, unknown> = {},
) {
  exigirNoConteudo(deps.quem, "agendar", atual);
  conferirNoFuturo(para, deps.agora);
  if (atual.estado !== "rascunho") {
    throw new ErroConteudo("invalido", "Só um rascunho pode ser agendado. Atualize a página.");
  }
  const copia = await copiaDeTrabalho(tx, atual);
  if (copia.faltas.length > 0) {
    throw new ErroFaltamCampos(
      copia.faltas.map((f) => f.campo),
      atual.tipo === "noticia" ? undefined : copia.faltas.map((f) => f.rotulo),
    );
  }

  await tx.update(conteudo).set({ estado: "agendado", agendadoPara: para, agendadoPor: deps.quem.id }).where(eq(conteudo.id, atual.id));
  await deps.fila.agendarPublicacao(tx, { conteudoId: atual.id, para });
  await registrarAtividadeConteudo(tx, { id: atual.id, tipo: atual.tipo, titulo: copia.titulo }, "agendar", deps, {
    para: para.toISOString(),
    ...detalhe,
  });
}

export async function reagendarNaTransacao(tx: Transacao, atual: Linha, para: Date, deps: DepsDoAgendamento) {
  exigirNoConteudo(deps.quem, "agendar", atual);
  conferirNoFuturo(para, deps.agora);
  const de = agendadoPara(atual);
  await tx.update(conteudo).set({ agendadoPara: para, agendadoPor: deps.quem.id }).where(eq(conteudo.id, atual.id));
  await deps.fila.agendarPublicacao(tx, { conteudoId: atual.id, para });
  await registrarAtividadeConteudo(tx, atual, "reagendar", deps, { de: de.toISOString(), para: para.toISOString() });
}

export async function cancelarNaTransacao(tx: Transacao, atual: Linha, deps: { quem: QuemDaEquipe; sessaoEdicao?: string }) {
  exigirNoConteudo(deps.quem, "agendar", atual);
  const de = agendadoPara(atual);
  await voltarARascunho(tx, atual.id);
  await registrarAtividadeConteudo(tx, atual, "cancelar_agendamento", deps, { de: de.toISOString() });
}

/** Tira da agenda: o conteúdo volta a Rascunho, sem data nem quem agendou (cancelar ou falha, E44). */
export async function voltarARascunho(tx: Transacao, id: string) {
  await tx.update(conteudo).set({ estado: "rascunho", agendadoPara: null, agendadoPor: null }).where(eq(conteudo.id, id));
}

function agendadoPara(atual: Linha): Date {
  if (atual.estado !== "agendado" || !atual.agendadoPara) {
    const p = palavrasDo(atual.tipo);
    throw new ErroConteudo("invalido", `${p.este} não está mais ${p.o("agendad")}. Atualize a página.`);
  }
  return atual.agendadoPara;
}

/** A hora marcada precisa estar no futuro (a tela manda no horário da Bahia; o servidor converte). */
export function conferirNoFuturo(para: Date, agora: Date = new Date()) {
  if (para.getTime() <= agora.getTime()) {
    throw new ErroConteudo("invalido", "Escolha uma data e hora que ainda não passaram.", "agendadoPara");
  }
}
