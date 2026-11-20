import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { publicarNoticia } from "@/lib/conteudos/publicar";
import { banco } from "@/lib/db";
import { comunicado } from "@/lib/db/schema";
import { SemPermissao } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import {
  cancelarAgendamentoDoComunicado,
  carregarComunicado,
  comunicadosDoCalendario,
  duplicarComunicado,
  encerrarComunicado,
  excluirComunicado,
  listarComunicados,
  reordenarFila,
  salvarComunicado,
} from "./comunicados";
import { comunicadosNoAr } from "./faixa";
import { ErroComunicado, type DadosComunicado } from "./regras";
import { executarViradaDoComunicado } from "./tarefa";

/**
 * Cada teste usa um ano próprio: o banco de teste é o mesmo para o arquivo todo, e a faixa mostra
 * tudo o que está no ar naquele instante.
 */
function periodo(ano: number) {
  return {
    /** 30/10 às 08h00 na Bahia (CA-US24.1). */
    inicio: new Date(`${ano}-10-30T11:00:00Z`),
    /** 02/11 às 23h59 na Bahia. */
    fim: new Date(`${ano}-11-03T02:59:00Z`),
    antes: new Date(`${ano}-10-29T12:00:00Z`),
    durante: new Date(`${ano}-10-31T12:00:00Z`),
    depois: new Date(`${ano}-11-04T12:00:00Z`),
  };
}

const dados = (mudancas: Partial<DadosComunicado> = {}): DadosComunicado => ({
  mensagem: "Feriado de Finados: na sexta (30/10) a sede atende das 8h às 12h.",
  link: null,
  inicio: null,
  fim: null,
  ...mudancas,
});

async function linha(id: string) {
  const [l] = await banco().select().from(comunicado).where(eq(comunicado.id, id));
  return l!;
}

async function agendado(ano: number, quem?: Awaited<ReturnType<typeof pessoaDaEquipe>>, mensagem?: string) {
  const p = periodo(ano);
  const autor = quem ?? (await pessoaDaEquipe("COM"));
  const { fila, pedidosComunicado } = filaEmMemoria();
  const { id } = await salvarComunicado(
    { dados: dados({ inicio: p.inicio, fim: p.fim, ...(mensagem ? { mensagem } : {}) }), modo: "programar" },
    { quem: autor, fila, agora: p.antes },
  );
  return { id, p, quem: autor, pedidosComunicado };
}

describe("salvarComunicado (RF43, RN14)", () => {
  it("rascunho fica fora do site, sem período, com Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila, pedidosComunicado } = filaEmMemoria();
    const p = periodo(2030);

    const { id, situacao } = await salvarComunicado({ dados: dados(), modo: "rascunho" }, { quem, fila, agora: p.durante });

    expect(situacao).toBe("rascunho");
    expect(await linha(id)).toMatchObject({ estado: "rascunho", criadoPor: quem.id, jaPublicado: false });
    expect(pedidosComunicado).toEqual([]);
    expect((await atividadesDe(id)).map((a) => a.acao)).toEqual(["comunicado.criar"]);
    expect(await comunicadosNoAr(p.durante)).toEqual([]);
  });

  it("agendar põe na fila a entrada no início e a saída no fim (CA-US24.1)", async () => {
    const { id, p, quem, pedidosComunicado } = await agendado(2031);

    expect(await linha(id)).toMatchObject({ estado: "agendado", inicio: p.inicio, fim: p.fim, jaPublicado: false });
    expect(pedidosComunicado).toEqual([
      { comunicadoId: id, virada: "entrar", para: p.inicio.toISOString() },
      { comunicadoId: id, virada: "sair", para: p.fim.toISOString() },
    ]);
    expect((await atividadesDe(id)).map((a) => [a.acao, a.atorId])).toEqual([
      ["comunicado.criar", quem.id],
      ["comunicado.agendar", quem.id],
    ]);
  });

  it("com início agora ou antes, entra no ar na hora e o início passa a ser agora", async () => {
    const quem = await pessoaDaEquipe("ADM");
    const p = periodo(2032);
    const { fila, pedidosComunicado } = filaEmMemoria();

    const { id, situacao } = await salvarComunicado(
      { dados: dados({ inicio: p.antes, fim: p.fim }), modo: "programar" },
      { quem, fila, agora: p.durante },
    );

    expect(situacao).toBe("no_ar");
    expect(await linha(id)).toMatchObject({ estado: "publicado", inicio: p.durante, publicadoEm: p.durante, jaPublicado: true });
    expect(pedidosComunicado).toEqual([{ comunicadoId: id, virada: "sair", para: p.fim.toISOString() }]);
    expect((await atividadesDe(id)).map((a) => a.acao)).toEqual(["comunicado.criar", "comunicado.publicar"]);
    expect((await comunicadosNoAr(p.durante)).map((c) => c.id)).toEqual([id]);
  });

  it.each([
    ["mensagem vazia", dados({ mensagem: "   " }), "mensagem"],
    ["mensagem com 141 caracteres", dados({ mensagem: "x".repeat(141) }), "mensagem"],
    ["sem início", dados({ fim: new Date("2033-11-03T02:59:00Z") }), "inicio"],
    ["sem fim", dados({ inicio: new Date("2033-10-30T11:00:00Z") }), "fim"],
    ["fim antes do início", dados({ inicio: new Date("2033-11-03T02:59:00Z"), fim: new Date("2033-10-30T11:00:00Z") }), "fim"],
    ["fim que já passou", dados({ inicio: new Date("2033-10-01T11:00:00Z"), fim: new Date("2033-10-02T11:00:00Z") }), "fim"],
    ["link que não é endereço", dados({ inicio: new Date("2033-10-30T11:00:00Z"), fim: new Date("2033-11-03T02:59:00Z"), link: { tipo: "url", url: "não é link" } }), "link"],
  ])("recusa %s, no campo certo, e nada é gravado", async (_nome, entrada, campo) => {
    const quem = await pessoaDaEquipe("COM");
    const { fila, pedidosComunicado } = filaEmMemoria();
    const erro = await salvarComunicado({ dados: entrada, modo: "programar" }, { quem, fila, agora: new Date("2033-10-29T12:00:00Z") }).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroComunicado);
    expect(erro).toMatchObject({ codigo: "invalido", campo });
    expect(pedidosComunicado).toEqual([]);
  });

  it("aceita exatamente 140 caracteres", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await salvarComunicado({ dados: dados({ mensagem: "x".repeat(140) }), modo: "rascunho" }, { quem, fila: filaEmMemoria().fila });
    expect((await linha(id)).mensagem).toHaveLength(140);
  });

  it("“Saiba mais” só aceita conteúdo publicado; na faixa, vira o endereço da notícia", async () => {
    const quem = await pessoaDaEquipe("COM");
    const rascunho = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: "Horário especial no feriado" }));
    const p = periodo(2034);
    const { fila } = filaEmMemoria();
    const programar = () =>
      salvarComunicado(
        { dados: dados({ inicio: p.antes, fim: p.fim, link: { tipo: "conteudo", id: rascunho.id } }), modo: "programar" },
        { quem, fila, agora: p.durante },
      );

    await expect(programar()).rejects.toMatchObject({ campo: "link" });

    await publicarNoticia({ id: rascunho.id, revisaoBase: rascunho.revisao }, { quem });
    const { id } = await programar();
    const [faixa] = await comunicadosNoAr(p.durante);
    expect(faixa).toMatchObject({ id, link: { href: expect.stringMatching(/^\/noticias\/.+/), externo: false } });
    expect((await carregarComunicado(id, { quem }))?.rotuloDoLink).toBe("notícia “Horário especial no feriado”");
  });

  it("endereço sem https ganha https; caminho do site fica como está", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const a = await salvarComunicado({ dados: dados({ link: { tipo: "url", url: "sintravc.org.br/feriado" } }), modo: "rascunho" }, { quem, fila });
    const b = await salvarComunicado({ dados: dados({ link: { tipo: "url", url: "/contato" } }), modo: "rascunho" }, { quem, fila });
    expect((await linha(a.id)).linkUrl).toBe("https://sintravc.org.br/feriado");
    expect((await linha(b.id)).linkUrl).toBe("/contato");
  });

  it("no ar, muda a mensagem e o fim, mas não o início; a faixa muda na hora e a edição vai para a Atividade", async () => {
    const { id, p, quem } = await agendado(2035);
    const { fila, pedidosComunicado } = filaEmMemoria();
    const novoFim = new Date(p.fim.getTime() + 24 * 60 * 60 * 1000);

    await salvarComunicado(
      { id, dados: dados({ mensagem: "Feriado: sede fechada.", inicio: p.antes, fim: novoFim }), modo: "programar" },
      { quem, fila, agora: p.durante },
    );

    expect(await linha(id)).toMatchObject({ mensagem: "Feriado: sede fechada.", inicio: p.inicio, fim: novoFim });
    expect((await comunicadosNoAr(p.durante))[0]?.mensagem).toBe("Feriado: sede fechada.");
    expect(pedidosComunicado).toEqual([{ comunicadoId: id, virada: "sair", para: novoFim.toISOString() }]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "comunicado.editar",
      detalhe: { mensagem: { para: "Feriado: sede fechada." }, fim: { de: p.fim.toISOString(), para: novoFim.toISOString() } },
    });
  });

  it("no ar, não volta a rascunho: para tirar do site, é “Encerrar agora”", async () => {
    const { id, p, quem } = await agendado(2036);
    const erro = await salvarComunicado({ id, dados: dados(), modo: "rascunho" }, { quem, fila: filaEmMemoria().fila, agora: p.durante }).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroComunicado);
    expect(erro.message).toMatch(/Encerrar agora/);
  });

  it("salvar sem mudar nada não grava “editar” na Atividade", async () => {
    const { id, p, quem } = await agendado(2037);
    await salvarComunicado({ id, dados: dados({ inicio: p.inicio, fim: p.fim }), modo: "programar" }, { quem, fila: filaEmMemoria().fila, agora: p.antes });
    expect((await atividadesDe(id)).map((a) => a.acao)).toEqual(["comunicado.criar", "comunicado.agendar"]);
  });

  it("o ATD não cria comunicado", async () => {
    const quem = await pessoaDaEquipe("ATD");
    await expect(salvarComunicado({ dados: dados(), modo: "rascunho" }, { quem, fila: filaEmMemoria().fila })).rejects.toBeInstanceOf(SemPermissao);
  });
});

describe("Encerrar agora (CA-US24.2, RF44, RN09)", () => {
  it("a faixa sai do site e a ação fica na Atividade, com quem encerrou", async () => {
    const { id, p, quem } = await agendado(2040);
    expect((await comunicadosNoAr(p.durante)).map((c) => c.id)).toEqual([id]);

    await encerrarComunicado({ id }, { quem, agora: p.durante });

    expect(await comunicadosNoAr(p.durante)).toEqual([]);
    expect(await linha(id)).toMatchObject({ estado: "encerrado", encerradoEm: p.durante, encerradoPor: quem.id, jaPublicado: true });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "comunicado.encerrar", atorTipo: "pessoa", atorId: quem.id });
  });

  it("o que não está no ar não se encerra", async () => {
    const { id, p, quem } = await agendado(2041);
    await expect(encerrarComunicado({ id }, { quem, agora: p.antes })).rejects.toBeInstanceOf(ErroComunicado);
    expect((await linha(id)).estado).toBe("agendado");
  });

  it("o ATD não encerra", async () => {
    const { id, p } = await agendado(2042);
    await expect(encerrarComunicado({ id }, { quem: await pessoaDaEquipe("ATD"), agora: p.durante })).rejects.toBeInstanceOf(SemPermissao);
    expect((await comunicadosNoAr(p.durante)).map((c) => c.id)).toEqual([id]);
  });
});

describe("Duplicar, cancelar agendamento e excluir", () => {
  it("duplicar só o encerrado: a cópia é um rascunho sem período, com Atividade", async () => {
    const { id, p, quem } = await agendado(2043);
    await expect(duplicarComunicado({ id }, { quem, agora: p.durante })).rejects.toBeInstanceOf(ErroComunicado);

    await encerrarComunicado({ id }, { quem, agora: p.durante });
    const copia = await duplicarComunicado({ id }, { quem, agora: p.depois });

    expect(await linha(copia.id)).toMatchObject({ estado: "rascunho", mensagem: (await linha(id)).mensagem, inicio: null, fim: null, jaPublicado: false });
    expect((await atividadesDe(copia.id)).at(-1)).toMatchObject({ acao: "comunicado.duplicar", detalhe: { origem: id } });
  });

  it("depois do fim, mesmo sem a tarefa rodar, conta como encerrado e pode ser duplicado", async () => {
    const { id, p, quem } = await agendado(2044);
    await expect(duplicarComunicado({ id }, { quem, agora: p.depois })).resolves.toMatchObject({ id: expect.any(String) });
  });

  it("cancelar agendamento volta a rascunho, guarda o período e registra", async () => {
    const { id, p, quem } = await agendado(2045);
    await cancelarAgendamentoDoComunicado({ id }, { quem, agora: p.antes });
    expect(await linha(id)).toMatchObject({ estado: "rascunho", inicio: p.inicio });
    expect(await comunicadosNoAr(p.durante)).toEqual([]);
    expect((await atividadesDe(id)).at(-1)?.acao).toBe("comunicado.cancelar_agendamento");
  });

  it("exclui rascunho nunca publicado de quem criou; a COM não exclui o de outra pessoa (E07)", async () => {
    const autora = await pessoaDaEquipe("COM");
    const { id } = await salvarComunicado({ dados: dados(), modo: "rascunho" }, { quem: autora, fila: filaEmMemoria().fila });

    await expect(excluirComunicado({ id }, { quem: await pessoaDaEquipe("COM") })).rejects.toBeInstanceOf(SemPermissao);
    await excluirComunicado({ id }, { quem: autora });

    expect(await banco().select().from(comunicado).where(eq(comunicado.id, id))).toEqual([]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "comunicado.excluir", atorId: autora.id });
  });

  it("o que já foi ao ar nunca é excluído, nem pelo ADM", async () => {
    const { id, p, quem } = await agendado(2046);
    await encerrarComunicado({ id }, { quem, agora: p.durante });
    await expect(excluirComunicado({ id }, { quem: await pessoaDaEquipe("ADM") })).rejects.toBeInstanceOf(SemPermissao);
  });
});

describe("Fila e faixa (CA-US01.2)", () => {
  it("vários no ar aparecem na ordem da fila; reordenar muda a faixa e vai para a Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await agendado(2050, quem, "Primeiro aviso");
    const b = await agendado(2050, quem, "Segundo aviso");
    const p = a.p;

    expect((await comunicadosNoAr(p.durante)).map((c) => c.mensagem)).toEqual(["Primeiro aviso", "Segundo aviso"]);

    await reordenarFila({ ids: [b.id, a.id] }, { quem });

    expect((await comunicadosNoAr(p.durante)).map((c) => c.mensagem)).toEqual(["Segundo aviso", "Primeiro aviso"]);
    const lista = await listarComunicados({ aba: "no_ar" }, { quem, agora: p.durante });
    expect(lista.itens.map((c) => c.id)).toEqual([b.id, a.id]);
    expect((await atividadesDe(b.id)).at(-1)).toMatchObject({ acao: "comunicado.reordenar", detalhe: { para: [b.id, a.id] } });
  });

  it("as abas seguem o relógio: agendado, no ar e encerrado sem depender da tarefa", async () => {
    const { id, p, quem } = await agendado(2051);
    const naAba = async (aba: "no_ar" | "agendados" | "encerrados", agora: Date) =>
      (await listarComunicados({ aba }, { quem, agora })).itens.some((c) => c.id === id);

    expect(await naAba("agendados", p.antes)).toBe(true);
    expect(await naAba("no_ar", p.durante)).toBe(true);
    expect(await naAba("encerrados", p.depois)).toBe(true);
    expect(await naAba("no_ar", p.depois)).toBe(false);
  });
});

describe("T02 · entrar e sair do ar (CA-US24.1, spec §6)", () => {
  it("no início, o agendado fica Publicado; no fim, Encerrado; os dois com ator sistema e atraso", async () => {
    const { id, p } = await agendado(2060);
    const entrar = { comunicadoId: id, virada: "entrar" as const, para: p.inicio.toISOString() };
    const sair = { comunicadoId: id, virada: "sair" as const, para: p.fim.toISOString() };

    expect(await comunicadosNoAr(new Date(p.inicio.getTime() - 1000))).toEqual([]);
    expect(await executarViradaDoComunicado(entrar, { agora: new Date(p.inicio.getTime() + 5000) })).toEqual({ tipo: "feita" });
    expect(await linha(id)).toMatchObject({ estado: "publicado", publicadoEm: p.inicio, jaPublicado: true });
    expect((await comunicadosNoAr(p.inicio)).map((c) => c.id)).toEqual([id]);

    expect(await executarViradaDoComunicado(sair, { agora: p.fim })).toEqual({ tipo: "feita" });
    expect(await linha(id)).toMatchObject({ estado: "encerrado", encerradoEm: p.fim, encerradoPor: null });
    expect(await comunicadosNoAr(p.fim)).toEqual([]);

    expect((await atividadesDe(id)).slice(-2)).toMatchObject([
      { acao: "comunicado.entrar_no_ar", atorTipo: "sistema", detalhe: { atraso_segundos: 5 } },
      { acao: "comunicado.sair_do_ar", atorTipo: "sistema", detalhe: { atraso_segundos: 0 } },
    ]);
  });

  it("é idempotente: rodar de novo, pedido velho (período mudou) ou encerrado antes não fazem nada", async () => {
    const { id, p, quem } = await agendado(2061);
    const entrarVelho = { comunicadoId: id, virada: "entrar" as const, para: p.inicio.toISOString() };

    const novoInicio = new Date(p.inicio.getTime() + 60 * 60 * 1000);
    await salvarComunicado({ id, dados: dados({ inicio: novoInicio, fim: p.fim }), modo: "programar" }, { quem, fila: filaEmMemoria().fila, agora: p.antes });
    expect(await executarViradaDoComunicado(entrarVelho, { agora: p.inicio })).toEqual({ tipo: "ignorada" });
    expect((await linha(id)).estado).toBe("agendado");

    const entrar = { ...entrarVelho, para: novoInicio.toISOString() };
    expect(await executarViradaDoComunicado(entrar, { agora: novoInicio })).toEqual({ tipo: "feita" });
    expect(await executarViradaDoComunicado(entrar, { agora: novoInicio })).toEqual({ tipo: "ignorada" });

    await encerrarComunicado({ id }, { quem, agora: p.durante });
    const sair = { comunicadoId: id, virada: "sair" as const, para: p.fim.toISOString() };
    expect(await executarViradaDoComunicado(sair, { agora: p.fim })).toEqual({ tipo: "ignorada" });
    expect(await linha(id)).toMatchObject({ estado: "encerrado", encerradoEm: p.durante, encerradoPor: quem.id });
  });

  it("servidor fora do ar no período todo: a saída encerra direto e a faixa nunca ficou presa", async () => {
    const { id, p } = await agendado(2062);
    expect(await comunicadosNoAr(p.depois)).toEqual([]);
    await executarViradaDoComunicado({ comunicadoId: id, virada: "sair", para: p.fim.toISOString() }, { agora: p.depois });
    expect(await linha(id)).toMatchObject({ estado: "encerrado", jaPublicado: true, publicadoEm: p.inicio });
  });
});

describe("calendário de Conteúdos (E17, C3)", () => {
  it("mostra o período em dias da Bahia, vai até o encerramento e deixa o rascunho de fora", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, p } = await agendado(2070);
    const encerrado = await agendado(2070, quem, "Encerrado antes do fim");
    await encerrarComunicado({ id: encerrado.id }, { quem, agora: p.durante });
    const rascunho = await salvarComunicado({ dados: dados({ inicio: p.inicio, fim: p.fim }), modo: "rascunho" }, { quem, fila: filaEmMemoria().fila });
    const { diaNoCalendario } = await import("@/lib/conteudos/grade-do-mes");

    const lista = await comunicadosDoCalendario(
      { de: new Date("2070-10-01T03:00:00Z"), ate: new Date("2070-11-30T03:00:00Z") },
      { quem, agora: p.antes, diaDe: diaNoCalendario },
    );

    expect(lista.find((c) => c.id === id)).toMatchObject({ situacao: "agendado", primeiroDia: "2070-10-30", ultimoDia: "2070-11-02" });
    expect(lista.find((c) => c.id === encerrado.id)).toMatchObject({ situacao: "encerrado", primeiroDia: "2070-10-30", ultimoDia: "2070-10-31" });
    expect(lista.some((c) => c.id === rascunho.id)).toBe(false);
  });

  it("o ATD não vê", async () => {
    await expect(
      comunicadosDoCalendario({ de: new Date(), ate: new Date() }, { quem: await pessoaDaEquipe("ATD"), diaDe: (d) => d.toISOString() }),
    ).rejects.toBeInstanceOf(SemPermissao);
  });
});
