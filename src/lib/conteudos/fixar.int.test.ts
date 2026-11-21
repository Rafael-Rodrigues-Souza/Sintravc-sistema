import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { noticia } from "@/lib/db/schema";
import { SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { agendarNoticia } from "./agendar";
import { carregarNoticia } from "./carregar";
import { arquivarConteudos, ocultarConteudos } from "./ciclo-de-vida";
import { executarDesafixar } from "./desafixar";
import { ErroConteudo } from "./erros";
import { fixadaAtual, fixarNoticia, fimDaFixacao } from "./fixar";
import { executarPublicacaoAgendada } from "./publicar-agendado";
import { publicarNoticia } from "./publicar";
import { salvarRascunhoNoticia } from "./salvar";

/**
 * Notícia fixada (RN58, RF78, E14, E59; CA-US21.6 a CA-US21.8). O banco é o mesmo para o arquivo
 * inteiro: outras notícias fixadas podem existir, então cada teste confere só as suas.
 */

// Datas longe no futuro: nenhum outro arquivo de teste fixa nada depois de 2030.
const AGORA = new Date("2031-11-02T12:00:00Z");
const DIA = "2031-11-10";
const FIM = new Date("2031-11-11T03:00:00Z"); // 00:00 de 11/11 na Bahia (UTC−3), fim exclusivo de "até 10/11"

let marca = 0;
function titulo(texto: string) {
  return `${texto} ${Date.now()}-${++marca}`;
}

function deps(quem: QuemDaEquipe, agora = AGORA) {
  const f = filaEmMemoria();
  return { deps: { quem, fila: f.fila, agora }, pedidos: f.pedidosDesafixar };
}

async function rascunho(quem: QuemDaEquipe, texto = "Notícia") {
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: titulo(texto) }));
  return { id, revisao };
}

async function publicada(quem: QuemDaEquipe, texto = "Notícia", agora = AGORA) {
  const { id, revisao } = await rascunho(quem, texto);
  await publicarNoticia({ id, revisaoBase: revisao }, deps(quem, agora).deps);
  return id;
}

async function fixadaAteDe(id: string) {
  const [linha] = await banco().select({ fixadaAte: noticia.fixadaAte }).from(noticia).where(eq(noticia.conteudoId, id));
  return linha!.fixadaAte;
}

async function fixadasEntre(ids: string[]) {
  const linhas = await banco()
    .select({ id: noticia.conteudoId, fixadaAte: noticia.fixadaAte })
    .from(noticia)
    .where(inArray(noticia.conteudoId, ids));
  return linhas.filter((l) => l.fixadaAte !== null).map((l) => l.id);
}

describe("fimDaFixacao: “até 10/11” vale até o fim do dia na Bahia (E59)", () => {
  it("guarda 00:00 do dia seguinte no horário da Bahia, exclusivo", () => {
    expect(fimDaFixacao(DIA)).toEqual(FIM);
  });

  it("recusa data que não existe", () => {
    expect(fimDaFixacao("2031-02-30")).toBeNull();
  });
});

describe("fixarNoticia na publicada: vale na hora (RN58, CA-US21.7)", () => {
  it("fixa, agenda a T05 para a data e registra na Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    const { deps: d, pedidos } = deps(quem);

    const r = await fixarNoticia({ id, ate: DIA }, d);

    expect(r).toMatchObject({ tipo: "fixada", fixadaAte: FIM, vale: true });
    expect(await fixadaAteDe(id)).toEqual(FIM);
    expect(pedidos).toEqual([{ conteudoId: id, para: FIM.toISOString() }]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.fixar",
      atorTipo: "pessoa",
      atorId: quem.id,
      detalhe: { fixada_ate: FIM.toISOString(), ao_publicar: false },
    });
  });

  it("fixar outra desafixa a anterior: só a nova fica fixada, e a Atividade da anterior diz quem a substituiu", async () => {
    const quem = await pessoaDaEquipe("COM");
    const anterior = await publicada(quem, "Anterior");
    const nova = await publicada(quem, "Nova");
    await fixarNoticia({ id: anterior, ate: DIA }, deps(quem).deps);

    const r = await fixarNoticia({ id: nova, ate: DIA }, deps(quem).deps);

    expect(r).toMatchObject({ tipo: "fixada", desafixadas: [expect.objectContaining({ id: anterior })] });
    expect(await fixadasEntre([anterior, nova])).toEqual([nova]);
    expect((await atividadesDe(anterior)).at(-1)).toMatchObject({
      acao: "noticia.desafixar",
      detalhe: { substituida_por: nova },
    });
  });

  it("dois pedidos de fixar ao mesmo tempo deixam só uma fixada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem, "A");
    const b = await publicada(quem, "B");

    await Promise.all([fixarNoticia({ id: a, ate: DIA }, deps(quem).deps), fixarNoticia({ id: b, ate: DIA }, deps(quem).deps)]);

    expect(await fixadasEntre([a, b])).toHaveLength(1);
  });

  it("desafixar (data vazia) tira a fixação e fica na Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);

    const r = await fixarNoticia({ id, ate: null }, deps(quem).deps);

    expect(r).toMatchObject({ tipo: "desafixada" });
    expect(await fixadaAteDe(id)).toBeNull();
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.desafixar", atorId: quem.id });
  });

  it("recusa data que já passou", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);

    await expect(fixarNoticia({ id, ate: "2031-11-01" }, deps(quem).deps)).rejects.toThrow(ErroConteudo);
    expect(await fixadaAteDe(id)).toBeNull();
  });

  it("hoje ainda vale (até o fim do dia)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);

    await expect(fixarNoticia({ id, ate: "2031-11-02" }, deps(quem).deps)).resolves.toMatchObject({ tipo: "fixada" });
  });

  it("o Atendimento não pode fixar (permissão no servidor, RNF01)", async () => {
    const com = await pessoaDaEquipe("COM");
    const id = await publicada(com);
    const atd = await pessoaDaEquipe("ATD");

    await expect(fixarNoticia({ id, ate: DIA }, deps(atd).deps)).rejects.toThrow(SemPermissao);
  });

  it("oculta ou arquivada não pode ser fixada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await ocultarConteudos({ ids: [id], motivo: "Revisão" }, { quem });

    await expect(fixarNoticia({ id, ate: DIA }, deps(quem).deps)).rejects.toThrow(ErroConteudo);
  });
});

describe("fixar no rascunho vale ao publicar (E59, CA-US21.6)", () => {
  it("no rascunho, guarda a intenção sem desafixar a fixada atual e sem agendar a T05", async () => {
    const quem = await pessoaDaEquipe("COM");
    const atual = await publicada(quem, "Fixada hoje");
    await fixarNoticia({ id: atual, ate: DIA }, deps(quem).deps);
    const { id } = await rascunho(quem, "Rascunho");
    const { deps: d, pedidos } = deps(quem);

    const r = await fixarNoticia({ id, ate: DIA }, d);

    expect(r).toMatchObject({ tipo: "fixada", vale: false, desafixadas: [] });
    expect(await fixadaAteDe(id)).toEqual(FIM);
    expect(await fixadaAteDe(atual)).toEqual(FIM);
    expect(pedidos).toEqual([]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.fixar", detalhe: { ao_publicar: true } });
  });

  it("a intenção não conta como alteração da cópia de trabalho (E47)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem);

    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);

    expect((await carregarNoticia(id, { quem }))!.revisao).toBe(revisao);
  });

  it("ao publicar, a notícia fica fixada, a anterior publicada sai e a T05 é agendada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const anterior = await publicada(quem, "Anterior");
    await fixarNoticia({ id: anterior, ate: DIA }, deps(quem).deps);
    const { id, revisao } = await rascunho(quem, "Nova");
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);
    const { deps: d, pedidos } = deps(quem);

    await publicarNoticia({ id, revisaoBase: revisao }, d);

    expect(await fixadasEntre([anterior, id])).toEqual([id]);
    expect(pedidos).toEqual([{ conteudoId: id, para: FIM.toISOString() }]);
    expect((await atividadesDe(anterior)).at(-1)).toMatchObject({ acao: "noticia.desafixar", detalhe: { substituida_por: id } });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.publicar", detalhe: { fixada_ate: FIM.toISOString() } });
    expect(await fixadaAtual(banco(), AGORA)).toMatchObject({ id });
  });

  it("(a) publicar uma notícia sem intenção mantém a fixada atual", async () => {
    const quem = await pessoaDaEquipe("COM");
    const fixada = await publicada(quem, "Fixada");
    await fixarNoticia({ id: fixada, ate: DIA }, deps(quem).deps);

    const outra = await publicada(quem, "Sem intenção");

    expect(await fixadaAteDe(fixada)).toEqual(FIM);
    expect(await fixadaAteDe(outra)).toBeNull();
  });

  it("(b) a intenção de outro rascunho sobrevive quando uma terceira notícia é fixada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id: intencao } = await rascunho(quem, "Intenção");
    await fixarNoticia({ id: intencao, ate: DIA }, deps(quem).deps);
    const terceira = await publicada(quem, "Terceira");

    await fixarNoticia({ id: terceira, ate: DIA }, deps(quem).deps);

    expect(await fixadaAteDe(intencao)).toEqual(FIM);
    expect(await fixadaAteDe(terceira)).toEqual(FIM);
  });

  it("republicar a própria fixada (“Publicar alterações”) não mexe na fixação nem desafixa ninguém", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, "Fixada");
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);
    await publicarNoticia({ id, revisaoBase: revisao }, deps(quem).deps);
    const atual = (await carregarNoticia(id, { quem }))!;
    const salvo = await salvarRascunhoNoticia(
      { id, revisaoBase: atual.revisao, dados: { ...atual.dados, lide: "Lide revisado." } },
      edicaoDe(quem),
    );
    if (salvo.tipo !== "salvo") throw new Error("esperava salvo");
    const antes = (await atividadesDe(id)).length;

    await publicarNoticia({ id, revisaoBase: salvo.revisao }, deps(quem).deps);

    expect(await fixadaAteDe(id)).toEqual(FIM);
    const novas = (await atividadesDe(id)).slice(antes);
    expect(novas.map((a) => a.acao)).toEqual(["noticia.publicar_alteracoes"]);
  });

  it("intenção vencida ao publicar: publica sem fixar e limpa a intenção", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem);
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);
    const depois = new Date("2031-11-12T12:00:00Z");
    const { deps: d, pedidos } = deps(quem, depois);

    await publicarNoticia({ id, revisaoBase: revisao }, d);

    expect(await fixadaAteDe(id)).toBeNull();
    expect(pedidos).toEqual([]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.publicar", detalhe: { fixacao_vencida: true } });
  });

  it("na T01, a agendada com intenção fica fixada ao ir ao ar", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem);
    const para = new Date("2031-11-05T11:00:00Z");
    await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila: filaEmMemoria().fila, agora: AGORA });
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);
    const f = filaEmMemoria();

    await executarPublicacaoAgendada({ conteudoId: id, para: para.toISOString() }, { agora: para, fila: f.fila });

    expect(await fixadaAteDe(id)).toEqual(FIM);
    expect(f.pedidosDesafixar).toEqual([{ conteudoId: id, para: FIM.toISOString() }]);
  });

  it("na T01, intenção vencida: publica sem fixar e a Atividade registra fixacao_vencida", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem);
    const para = new Date("2031-11-15T11:00:00Z");
    await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila: filaEmMemoria().fila, agora: AGORA });
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);

    await executarPublicacaoAgendada({ conteudoId: id, para: para.toISOString() }, { agora: para, fila: filaEmMemoria().fila });

    expect(await fixadaAteDe(id)).toBeNull();
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.publicar_agendado",
      atorTipo: "sistema",
      detalhe: { fixacao_vencida: true },
    });
  });
});

describe("o site segue o relógio e a T05 limpa a fixação (CA-US21.6, CA-US21.8)", () => {
  it("depois da data, a notícia não é mais a fixada, mesmo antes da T05 rodar", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);

    expect(await fixadaAtual(banco(), new Date(FIM.getTime() - 1))).toMatchObject({ id });
    expect((await fixadaAtual(banco(), FIM))?.id).not.toBe(id);
  });

  it("a T05 desafixa na data e registra na Atividade, com o sistema como autor", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);

    const r = await executarDesafixar({ conteudoId: id, para: FIM.toISOString() });

    expect(r).toEqual({ tipo: "desafixada" });
    expect(await fixadaAteDe(id)).toBeNull();
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.desafixar",
      atorTipo: "sistema",
      atorId: null,
      detalhe: { automatico: true, fixada_ate: FIM.toISOString() },
    });
  });

  it("pedido velho (a data mudou depois) não faz nada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);
    await fixarNoticia({ id, ate: "2031-11-20" }, deps(quem).deps);

    const r = await executarDesafixar({ conteudoId: id, para: FIM.toISOString() });

    expect(r).toEqual({ tipo: "ignorada" });
    expect(await fixadaAteDe(id)).toEqual(fimDaFixacao("2031-11-20"));
  });
});

describe("ocultar e arquivar desafixam (E59)", () => {
  it("ocultar a fixada tira a fixação na mesma transação", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);

    await ocultarConteudos({ ids: [id], motivo: "Revisão" }, { quem });

    expect(await fixadaAteDe(id)).toBeNull();
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.ocultar", detalhe: { desafixada: true } });
  });

  it("arquivar o rascunho com intenção tira a intenção", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunho(quem);
    await fixarNoticia({ id, ate: DIA }, deps(quem).deps);

    await arquivarConteudos({ ids: [id] }, { quem });

    expect(await fixadaAteDe(id)).toBeNull();
  });
});
