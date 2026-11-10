import { eq } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { conteudo } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { lerNoticia, type NoticiaAberta } from "./carregar";
import { ErroConteudo } from "./erros";
import { faltasParaPublicar } from "./obrigatorios";
import { ErroFaltamCampos } from "./publicar";
import { registrarAtividadeNoticia, travarNoticia } from "./salvar";

export type DepsDoAgendamento = {
  quem: QuemDaEquipe;
  fila: Fila;
  /** Relógio (os testes passam um fixo). */
  agora?: Date;
  /** Sessão do editor, só para a Atividade (E40). */
  sessaoEdicao?: string;
};

export type ResultadoAgendar = { tipo: "agendada"; para: Date } | { tipo: "conflito"; servidor: NoticiaAberta };

type Linha = typeof conteudo.$inferSelect;

/**
 * Agenda a notícia (CA-US21.2, RF39, RN10). Os obrigatórios são conferidos agora e de novo na hora
 * marcada, quando vai ao ar a cópia atual (E44). Estado, Atividade e o pedido na fila entram na
 * mesma transação.
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
 * Muda a data de uma notícia agendada (arrastar no calendário, Edição rápida). Só mexe na data,
 * não no texto: por isso não confere a revisão. O pedido antigo continua na fila, mas não faz
 * nada quando chega a hora, porque a data não bate mais (E44). Quem reagenda passa a receber o
 * aviso de falha.
 */
export async function reagendarNoticia(entrada: { id: string; para: Date }, deps: DepsDoAgendamento): Promise<ResultadoAgendar> {
  exigir(deps.quem, "agendar", { tipo: "noticia" });
  conferirNoFuturo(entrada.para, deps.agora);
  return banco().transaction(async (tx) => {
    await reagendarNaTransacao(tx, await travarNoticia(tx, entrada.id), entrada.para, deps);
    return { tipo: "agendada", para: entrada.para };
  });
}

/** "Cancelar agendamento": a notícia volta a Rascunho, sem data (E44). */
export async function cancelarAgendamento(
  entrada: { id: string },
  deps: { quem: QuemDaEquipe; sessaoEdicao?: string },
): Promise<{ tipo: "cancelado" }> {
  exigir(deps.quem, "agendar", { tipo: "noticia" });
  return banco().transaction(async (tx) => {
    await cancelarNaTransacao(tx, await travarNoticia(tx, entrada.id), deps);
    return { tipo: "cancelado" };
  });
}

// --- Dentro de uma transação já aberta, com a notícia travada (também usadas pela Edição rápida) ---

export async function agendarNaTransacao(tx: Transacao, atual: Linha, para: Date, deps: DepsDoAgendamento) {
  exigir(deps.quem, "agendar", { tipo: "noticia" });
  conferirNoFuturo(para, deps.agora);
  if (atual.estado !== "rascunho") {
    throw new ErroConteudo("invalido", "Só um rascunho pode ser agendado. Atualize a página.");
  }
  const noticia = (await lerNoticia(tx, atual.id))!;
  const faltas = faltasParaPublicar(noticia.dados);
  if (faltas.length > 0) throw new ErroFaltamCampos(faltas.map((f) => f.campo));

  await tx.update(conteudo).set({ estado: "agendado", agendadoPara: para, agendadoPor: deps.quem.id }).where(eq(conteudo.id, atual.id));
  await deps.fila.agendarPublicacao(tx, { conteudoId: atual.id, para });
  await registrarAtividadeNoticia(tx, "noticia.agendar", atual.id, noticia.dados.titulo, deps, { para: para.toISOString() });
}

export async function reagendarNaTransacao(tx: Transacao, atual: Linha, para: Date, deps: DepsDoAgendamento) {
  exigir(deps.quem, "agendar", { tipo: "noticia" });
  conferirNoFuturo(para, deps.agora);
  const de = agendadaPara(atual);
  await tx.update(conteudo).set({ agendadoPara: para, agendadoPor: deps.quem.id }).where(eq(conteudo.id, atual.id));
  await deps.fila.agendarPublicacao(tx, { conteudoId: atual.id, para });
  await registrarAtividadeNoticia(tx, "noticia.reagendar", atual.id, atual.titulo, deps, {
    de: de.toISOString(),
    para: para.toISOString(),
  });
}

export async function cancelarNaTransacao(tx: Transacao, atual: Linha, deps: { quem: QuemDaEquipe; sessaoEdicao?: string }) {
  exigir(deps.quem, "agendar", { tipo: "noticia" });
  const de = agendadaPara(atual);
  await tx.update(conteudo).set({ estado: "rascunho", agendadoPara: null, agendadoPor: null }).where(eq(conteudo.id, atual.id));
  await registrarAtividadeNoticia(tx, "noticia.cancelar_agendamento", atual.id, atual.titulo, deps, { de: de.toISOString() });
}

function agendadaPara(atual: Linha): Date {
  if (atual.estado !== "agendado" || !atual.agendadoPara) {
    throw new ErroConteudo("invalido", "Esta notícia não está mais agendada. Atualize a página.");
  }
  return atual.agendadoPara;
}

/** A hora marcada precisa estar no futuro (a tela manda no horário da Bahia; o servidor converte). */
function conferirNoFuturo(para: Date, agora: Date = new Date()) {
  if (para.getTime() <= agora.getTime()) {
    throw new ErroConteudo("invalido", "Escolha uma data e hora que ainda não passaram.", "agendadoPara");
  }
}
