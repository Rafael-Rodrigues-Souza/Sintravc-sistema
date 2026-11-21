import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { agendarNoticia } from "@/lib/conteudos/agendar";
import { carregarNoticia } from "@/lib/conteudos/carregar";
import { executarPublicacaoAgendada } from "@/lib/conteudos/publicar-agendado";
import * as tipoDoConteudo from "@/lib/conteudos/tipo-do-conteudo";
import { banco } from "@/lib/db";
import { notificacaoEquipe } from "@/lib/db/schema";
import type { Enviar, Mensagem } from "@/lib/email";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { filaEmMemoria } from "./fila";
import { criarTrabalhador, type Trabalhador } from "./trabalhador";

// O banco "falha" uma vez ao travar o conteúdo na tarefa (tempo de lock esgotado, conexão caída...).
vi.mock("@/lib/conteudos/tipo-do-conteudo", async (original) => {
  const modulo = await original<typeof import("@/lib/conteudos/tipo-do-conteudo")>();
  return { ...modulo, travarConteudo: vi.fn(modulo.travarConteudo) };
});
const travarConteudo = vi.mocked(tipoDoConteudo.travarConteudo);
const ERRO_DE_BANCO = Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" });

const enviadas: Mensagem[] = [];
const enviar: Enviar = async (m) => {
  enviadas.push(m);
  return { idMensagem: String(enviadas.length) };
};
const ligados: Trabalhador[] = [];

afterEach(async () => {
  travarConteudo.mockClear();
  await Promise.all(ligados.splice(0).map((t) => t.parar()));
});

describe("erro de banco na publicação agendada (RNF13): nunca fica Agendada sem aviso", () => {
  it("notícia que não existe mais: o pedido é ignorado", async () => {
    expect(await executarPublicacaoAgendada({ conteudoId: randomUUID(), para: new Date().toISOString() })).toEqual({ tipo: "ignorada" });
  });

  it("outro erro de banco é relançado (o pg-boss tenta de novo), e nada muda", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    const para = new Date(Date.now() + 60_000);
    await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila: filaEmMemoria().fila });
    travarConteudo.mockRejectedValueOnce(ERRO_DE_BANCO);

    await expect(executarPublicacaoAgendada({ conteudoId: id, para: para.toISOString() }, { agora: para })).rejects.toBe(ERRO_DE_BANCO);
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado" });
  });

  it("com a fila real: esgotadas as tentativas, a falha é registrada e avisada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const trabalhador = await criarTrabalhador({ url: process.env.DATABASE_URL!, enviar, tentativas: 0, intervaloDeBuscaSegundos: 0.5 });
    ligados.push(trabalhador);
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await agendarNoticia({ id, revisaoBase: revisao, para: new Date(Date.now() + 1000) }, { quem, fila: trabalhador.fila });
    // A primeira trava da tarefa falha; o registro da falha, depois, consegue travar.
    travarConteudo.mockRejectedValueOnce(ERRO_DE_BANCO);

    await vi.waitFor(async () => expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", agendadoPara: null }), {
      timeout: 20_000,
      interval: 250,
    });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.agendamento_falhou",
      motivo: "O sistema tentou publicar de novo e não conseguiu.",
    });
    expect(await banco().select().from(notificacaoEquipe).where(eq(notificacaoEquipe.pessoaId, quem.id))).toHaveLength(1);
    expect(enviadas.some((m) => m.assunto.startsWith("Não foi possível publicar"))).toBe(true);
  }, 30_000);
});
