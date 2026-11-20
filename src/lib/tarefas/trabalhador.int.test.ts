import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { salvarComunicado } from "@/lib/comunicados/comunicados";
import { agendarNoticia, cancelarAgendamento, reagendarConteudo } from "@/lib/conteudos/agendar";
import { carregarNoticia } from "@/lib/conteudos/carregar";
import { salvarRascunhoNoticia } from "@/lib/conteudos/salvar";
import { banco } from "@/lib/db";
import { comunicado, notificacaoEquipe } from "@/lib/db/schema";
import type { Enviar, Mensagem } from "@/lib/email";
import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { criarTrabalhador, type Trabalhador } from "./trabalhador";

const enviadas: Mensagem[] = [];
const enviar: Enviar = async (m) => {
  enviadas.push(m);
  return { idMensagem: String(enviadas.length) };
};

const ligados: Trabalhador[] = [];
async function ligar(opcoes: { tentativas?: number; intervaloSegundos?: number } = {}) {
  const t = await criarTrabalhador({ url: process.env.DATABASE_URL!, enviar, intervaloDeBuscaSegundos: 0.5, ...opcoes });
  ligados.push(t);
  return t;
}

afterEach(async () => {
  await Promise.all(ligados.splice(0).map((t) => t.parar()));
});

async function agendadaDaqui(quem: Awaited<ReturnType<typeof pessoaDaEquipe>>, trabalhador: Trabalhador, segundos: number) {
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
  const para = new Date(Date.now() + segundos * 1000);
  await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila: trabalhador.fila });
  return { id, para };
}

describe("fila real (pg-boss): a notícia agendada entra no ar sozinha (CA-US21.2, RNF13)", () => {
  it("o pedido entra na fila com a transação e a tarefa publica na hora", async () => {
    const quem = await pessoaDaEquipe("COM");
    const trabalhador = await ligar();
    const { id } = await agendadaDaqui(quem, trabalhador, 1);

    await vi.waitFor(async () => expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "publicado", versao: 1 }), {
      timeout: 20_000,
      interval: 250,
    });
  }, 30_000);

  it("se a ação que agendou falhar, o pedido não fica na fila", async () => {
    const quem = await pessoaDaEquipe("COM");
    const trabalhador = await ligar();
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    const para = new Date(Date.now() + 1000);

    await expect(
      banco().transaction(async (tx) => {
        await trabalhador.fila.agendarPublicacao(tx, { conteudoId: id, para });
        throw new Error("a ação falhou depois de pôr na fila");
      }),
    ).rejects.toThrow("a ação falhou");
    expect(await trabalhador.pedidosPendentes()).not.toContainEqual(expect.objectContaining({ conteudoId: id }));
  }, 30_000);

  it("pedido único por (notícia, hora marcada): agendar duas vezes para a mesma hora deixa um pedido só (E44)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const trabalhador = await ligar();
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    const para = new Date(Date.now() + 10 * 60_000);
    const outraHora = new Date(para.getTime() + 60_000);

    // Agenda, cancela e agenda de novo para a mesma hora; depois, outra hora conta como outro pedido.
    await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila: trabalhador.fila });
    await cancelarAgendamento({ id }, { quem });
    await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila: trabalhador.fila });
    await reagendarConteudo({ id, para: outraHora }, { quem, fila: trabalhador.fila });

    const daNoticia = (await trabalhador.pedidosPendentes()).filter((p) => p.conteudoId === id);
    expect(daNoticia.map((p) => p.para).sort()).toEqual([para.toISOString(), outraHora.toISOString()]);
  }, 30_000);

  it("tenta de novo e, esgotadas as tentativas, registra a falha e avisa", async () => {
    const quem = await pessoaDaEquipe("COM");
    const trabalhador = await ligar({ tentativas: 1, intervaloSegundos: 0 });
    const { id } = await agendadaDaqui(quem, trabalhador, 2);
    const atual = (await carregarNoticia(id, { quem }))!;
    await salvarRascunhoNoticia({ id, revisaoBase: atual.revisao, dados: { ...atual.dados, assinatura: "" } }, edicaoDe(quem));

    await vi.waitFor(async () => expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", agendadoPara: null }), {
      timeout: 25_000,
      interval: 250,
    });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.agendamento_falhou", motivo: "Falta preencher: Assinatura." });
    const notificacoes = await banco().select().from(notificacaoEquipe).where(eq(notificacaoEquipe.pessoaId, quem.id));
    expect(notificacoes).toHaveLength(1);
    expect(enviadas.some((m) => m.assunto.startsWith("Não foi possível publicar"))).toBe(true);
  }, 40_000);

  it("servidor fora do ar na hora: ao voltar, publica o pedido atrasado e registra o atraso", async () => {
    const quem = await pessoaDaEquipe("COM");
    const antes = await ligar();
    await antes.pararDeTrabalhar();
    const { id, para } = await agendadaDaqui(quem, antes, 1);
    await antes.parar();
    await new Promise((r) => setTimeout(r, 2500)); // a hora marcada passa com tudo desligado

    await ligar();

    await vi.waitFor(async () => expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "publicado" }), {
      timeout: 20_000,
      interval: 250,
    });
    const publicacao = (await atividadesDe(id)).at(-1)!;
    expect(publicacao).toMatchObject({ acao: "noticia.publicar_agendado", detalhe: { marcado_para: para.toISOString() } });
    expect((publicacao.detalhe as { atraso_segundos: number }).atraso_segundos).toBeGreaterThan(0);
  }, 40_000);
});

describe("fila real (pg-boss): o comunicado entra e sai do ar sozinho (T02, CA-US24.1)", () => {
  it("agendado para daqui a 1 s e fim daqui a 3 s: vira Publicado e depois Encerrado, com Atividade do sistema", async () => {
    const quem = await pessoaDaEquipe("COM");
    const trabalhador = await ligar();
    const inicio = new Date(Date.now() + 1000);
    const fim = new Date(Date.now() + 3000);
    const { id } = await salvarComunicado(
      { dados: { mensagem: "Sede fechada no feriado.", link: null, inicio, fim }, modo: "programar" },
      { quem, fila: trabalhador.fila },
    );

    const estado = async () => (await banco().select({ estado: comunicado.estado }).from(comunicado).where(eq(comunicado.id, id)))[0]?.estado;
    await vi.waitFor(async () => expect(await estado()).toBe("encerrado"), { timeout: 20_000, interval: 250 });
    expect((await atividadesDe(id)).map((a) => [a.acao, a.atorTipo])).toEqual([
      ["comunicado.criar", "pessoa"],
      ["comunicado.agendar", "pessoa"],
      ["comunicado.entrar_no_ar", "sistema"],
      ["comunicado.sair_do_ar", "sistema"],
    ]);
  }, 30_000);
});
