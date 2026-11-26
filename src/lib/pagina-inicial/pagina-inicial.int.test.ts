import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { DadosNoticia } from "@/lib/conteudos/dados";
import { ocultarConteudos } from "@/lib/conteudos/ciclo-de-vida";
import { publicarNoticia } from "@/lib/conteudos/publicar";
import { banco } from "@/lib/db";
import { atividade, destaqueHome, episodio, paginaInicial } from "@/lib/db/schema";
import { enviarMidia } from "@/lib/midia/enviar";
import { SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";
import { lerParametro } from "@/lib/parametros";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem } from "@/testes/arquivos/gerar";
import { pessoaDaEquipe } from "@/testes/equipe";
import { noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { opcoesDeDestaque } from "./opcoes";
import { CONFLITO, descartarAlteracoes, lerPainel, publicarAlteracoes, salvarRascunho, tirarDoArAgora } from "./rascunho";
import { chaveDoItem, type DadosDaHome, type ItemDoCarrossel } from "./regras";
import { destaquesDaHome } from "./site";
import { executarViradaDoDestaque } from "./tarefa";

/**
 * Página inicial (RF46, US26, E13, E62). A Home é uma só no banco: cada teste volta ao estado da
 * migração (só o slide do programa, no rascunho e no publicado). As notícias deste arquivo são
 * publicadas em 2001, antes de tudo o que os outros arquivos publicam: com o relógio dos testes em
 * 2001, a lista automática só vê as daqui, e as daqui nunca são as “mais recentes” dos outros arquivos.
 */

let relogio = new Date("2001-01-01T12:00:00Z").getTime();
function proximaHora() {
  relogio += 60 * 60 * 1000;
  return new Date(relogio);
}
/** O “agora” dos testes: depois de todas as publicações deste arquivo. */
const agoraDepois = () => new Date(relogio + 60 * 1000);
const horas = (base: Date, h: number) => new Date(base.getTime() + h * 3_600_000);

const programa: ItemDoCarrossel = { tipo: "programa", itemId: null, entraEm: null, saiEm: null, fraseChamada: null };

async function voltarAoInicio() {
  await banco().delete(destaqueHome);
  await banco()
    .insert(destaqueHome)
    .values(["rascunho", "publicado"].map((versao) => ({ versao: versao as "rascunho", area: "carrossel" as const, posicao: 1, itemTipo: "programa" as const })));
  await banco().update(paginaInicial).set({ revisao: 0, salvoEm: null, salvoPor: null, publicadoEm: null, publicadoPor: null });
}

beforeAll(() => {
  // As capas das notícias viram endereço público (a Mídia em memória não precisa de bucket).
  vi.stubEnv("S3_ENDPOINT", "http://localhost:9000");
  vi.stubEnv("S3_BUCKET", "sintravc-teste");
  vi.stubEnv("S3_CHAVE_ACESSO", "teste");
  vi.stubEnv("S3_CHAVE_SECRETA", "teste-secreta");
  vi.stubEnv("S3_URL_PUBLICA", "http://localhost:9000/sintravc-teste");
});
beforeEach(voltarAoInicio);
afterAll(async () => {
  vi.unstubAllEnvs();
  await voltarAoInicio();
  await banco().delete(episodio).where(sql`${episodio.titulo} LIKE 'Home %'`);
});

async function capa(quem: QuemDaEquipe) {
  const { armazenamento } = armazenamentoEmMemoria();
  return (await enviarMidia({ bytes: await imagem("png"), nome: "capa.png" }, { quem, armazenamento })).id;
}

async function publicada(quem: QuemDaEquipe, mais: Partial<DadosNoticia> = {}, comCapa = true) {
  const dados = await noticiaCompleta({ titulo: `Home ${randomUUID().slice(0, 8)}`, ...mais });
  if (comCapa) Object.assign(dados, { capaMidiaId: await capa(quem), capaAlt: "Assembleia na sede" });
  const { id, revisao } = await rascunhoSalvo(quem, dados);
  const r = await publicarNoticia({ id, revisaoBase: revisao }, { quem, fila: filaEmMemoria().fila, agora: proximaHora() });
  if (r.tipo !== "publicada") throw new Error("esperava publicada");
  return id;
}

async function episodioNoAr(quem: QuemDaEquipe, exibicaoEm: Date) {
  const [e] = await banco()
    .insert(episodio)
    .values({
      numero: 90000 + Math.floor(Math.random() * 9999),
      youtubeId: randomUUID().replace(/-/g, "").slice(0, 11),
      titulo: `Home episódio ${randomUUID().slice(0, 6)}`,
      estado: "publicado",
      jaPublicado: true,
      exibicaoEm,
      publicadoEm: exibicaoEm,
      criadoPor: quem.id,
      atualizadoPor: quem.id,
    })
    .returning({ id: episodio.id });
  return e!.id;
}

const noticia = (id: string, mais: Partial<ItemDoCarrossel> = {}): ItemDoCarrossel => ({
  tipo: "noticia",
  itemId: id,
  entraEm: null,
  saiEm: null,
  fraseChamada: null,
  ...mais,
});
const dados = (carrossel: ItemDoCarrossel[], lista: DadosDaHome["lista"] = [null, null, null]): DadosDaHome => ({ carrossel, lista });

async function revisaoAtual() {
  const [c] = await banco().select({ revisao: paginaInicial.revisao }).from(paginaInicial);
  return c!.revisao;
}

async function salvar(quem: QuemDaEquipe, d: DadosDaHome, agora = agoraDepois()) {
  const r = await salvarRascunho({ revisaoBase: await revisaoAtual(), dados: d }, { quem, agora });
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  return r;
}

async function atividadesDaHome(acao: string) {
  return banco()
    .select({ acao: atividade.acao, atorTipo: atividade.atorTipo, atorId: atividade.atorId, alvoRotulo: atividade.alvoRotulo, detalhe: atividade.detalhe })
    .from(atividade)
    .where(and(eq(atividade.area, "pagina_inicial"), eq(atividade.acao, acao)))
    .orderBy(asc(atividade.id));
}

const idsDosSlides = (slides: Awaited<ReturnType<typeof destaquesDaHome>>["slides"]) =>
  slides.map((s) => (s.tipo === "noticia" ? s.noticia.id : s.tipo === "episodio" ? s.episodio.id : "programa"));

describe("Página inicial: permissões (spec §4)", () => {
  it("ADM e COM editam; ATD não vê nem edita", async () => {
    const atd = await pessoaDaEquipe("ATD");
    await expect(lerPainel({ quem: atd })).rejects.toBeInstanceOf(SemPermissao);
    await expect(salvarRascunho({ revisaoBase: 0, dados: dados([programa]) }, { quem: atd })).rejects.toBeInstanceOf(SemPermissao);
    await expect(publicarAlteracoes({ revisaoBase: 0 }, { quem: atd, fila: filaEmMemoria().fila })).rejects.toBeInstanceOf(SemPermissao);
    await expect(descartarAlteracoes({ revisaoBase: 0 }, { quem: atd })).rejects.toBeInstanceOf(SemPermissao);
    await expect(tirarDoArAgora({ chave: "programa:programa", revisaoBase: 0 }, { quem: atd })).rejects.toBeInstanceOf(SemPermissao);
    await expect(opcoesDeDestaque({ tipo: "noticia", busca: "" }, { quem: atd })).rejects.toBeInstanceOf(SemPermissao);

    for (const perfil of ["ADM", "COM"] as const) {
      await voltarAoInicio();
      const quem = await pessoaDaEquipe(perfil);
      await expect(lerPainel({ quem })).resolves.toMatchObject({ revisao: 0 });
      await expect(salvarRascunho({ revisaoBase: 0, dados: dados([]) }, { quem })).resolves.toMatchObject({ tipo: "salvo", revisao: 1 });
    }
  });
});

describe("Página inicial: rascunho salvo sozinho (E62)", () => {
  it("salvar grava só o rascunho: o site continua com o publicado até “Publicar alterações”", async () => {
    const quem = await pessoaDaEquipe("COM", "Carla Escolheu");
    const a = await publicada(quem);
    await salvar(quem, dados([noticia(a), programa]));

    const painel = await lerPainel({ quem });
    expect(painel.rascunho.carrossel.map(chaveDoItem)).toEqual([`noticia:${a}`, "programa:programa"]);
    expect(painel.publicado.carrossel.map(chaveDoItem)).toEqual(["programa:programa"]);
    expect(painel.escolhidoPor[`carrossel:noticia:${a}`]).toBe("Carla Escolheu");
    expect(idsDosSlides((await destaquesDaHome(agoraDepois())).slides)).toEqual(["programa"]);
    // O salvamento automático não vai para a Atividade.
    expect(await atividadesDaHome("pagina_inicial.publicar")).toHaveLength(0);
  });

  it("salvar sem mudar nada não sobe a revisão", async () => {
    const quem = await pessoaDaEquipe("COM");
    const r = await salvarRascunho({ revisaoBase: 0, dados: dados([programa]) }, { quem });
    expect(r).toMatchObject({ tipo: "salvo", revisao: 0 });
  });

  it("conflito: quem salvou com a revisão velha recebe “conflito” e nada muda", async () => {
    const com = await pessoaDaEquipe("COM");
    const adm = await pessoaDaEquipe("ADM");
    await salvarRascunho({ revisaoBase: 0, dados: dados([]) }, { quem: adm });
    const r = await salvarRascunho({ revisaoBase: 0, dados: dados([programa, programa].slice(0, 1)) }, { quem: com });
    expect(r).toEqual({ tipo: "conflito" });
    expect((await lerPainel({ quem: com })).rascunho.carrossel).toEqual([]);
  });

  it("recusa mais itens que `home.carrossel_maximo`", async () => {
    const quem = await pessoaDaEquipe("COM");
    const ids = [];
    for (let i = 0; i < 5; i++) ids.push(await publicada(quem));
    await expect(salvar(quem, dados([programa, ...ids.map((id) => noticia(id))]))).rejects.toThrow("O carrossel aceita até 5 destaques");
  });

  it("só entra o que está no site: notícia em rascunho e episódio fora do ar são recusados", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id: rascunho } = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: "Home rascunho" }));
    await expect(salvar(quem, dados([noticia(rascunho)]))).rejects.toThrow("Esta notícia não está no site");
    await expect(salvar(quem, dados([], [{ noticiaId: rascunho }, null, null]))).rejects.toThrow("Esta notícia não está no site");
    const futuro = await episodioNoAr(quem, horas(agoraDepois(), 24));
    await expect(salvar(quem, dados([{ tipo: "episodio", itemId: futuro, entraEm: null, saiEm: null, fraseChamada: null }]))).rejects.toThrow("Este episódio não está no site");
  });

  it("notícia sem capa não entra no carrossel, mas entra na lista", async () => {
    const quem = await pessoaDaEquipe("COM");
    const semCapa = await publicada(quem, {}, false);
    await expect(salvar(quem, dados([noticia(semCapa)]))).rejects.toThrow("Esta notícia não tem capa");
    await expect(salvar(quem, dados([programa], [{ noticiaId: semCapa }, null, null]))).resolves.toMatchObject({ tipo: "salvo" });
  });

  it("recusa saída que já passou e saída antes da entrada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const agora = agoraDepois();
    await expect(salvar(quem, dados([noticia(a, { saiEm: horas(agora, -1) })]), agora)).rejects.toThrow("A saída já passou");
    await expect(salvar(quem, dados([noticia(a, { entraEm: horas(agora, 5), saiEm: horas(agora, 2) })]), agora)).rejects.toThrow(
      "A saída tem de ser depois da entrada.",
    );
  });

  it("um item que já estava no rascunho pode ficar mesmo depois de sair do ar", async () => {
    const quem = await pessoaDaEquipe("ADM");
    const a = await publicada(quem);
    await salvar(quem, dados([noticia(a), programa]));
    await ocultarConteudos({ ids: [a], motivo: "Informação errada" }, { quem });
    // Reordenar não é recusado por causa da notícia oculta; o painel marca e o site pula.
    await expect(salvar(quem, dados([programa, noticia(a)]))).resolves.toMatchObject({ tipo: "salvo" });
    expect((await lerPainel({ quem })).itens[`noticia:${a}`]).toMatchObject({ noSite: false });
  });
});

describe("Página inicial: frase de chamada (E62, #75)", () => {
  it("grava a frase do item, que aparece no slide depois de publicar; acima do limite do Parametro, recusa", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const agora = agoraDepois();
    const maximo = await lerParametro("home.frase_chamada_maximo");
    await expect(salvar(quem, dados([noticia(a, { fraseChamada: "x".repeat(maximo + 1) })]), agora)).rejects.toThrow(
      `A frase de chamada tem até ${maximo} caracteres.`,
    );

    await salvar(quem, dados([noticia(a, { fraseChamada: "Sua voz na campanha salarial" }), programa]), agora);
    expect((await lerPainel({ quem })).rascunho.carrossel[0]!.fraseChamada).toBe("Sua voz na campanha salarial");
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });

    const { slides } = await destaquesDaHome(agora);
    expect(slides.map((s) => s.frase)).toEqual(["Sua voz na campanha salarial", null]);
  });
});

describe("Página inicial: publicar e descartar (E13, E62)", () => {
  it("CA-US26.1 · reordenar e publicar: o site mostra a nova ordem, com a Atividade e a T04 na mesma transação", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const b = await publicada(quem);
    const agora = agoraDepois();
    await salvar(quem, dados([noticia(a), noticia(b, { saiEm: horas(agora, 48) }), programa]), agora);
    const { fila, pedidosDestaque } = filaEmMemoria();
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila, agora });
    expect(idsDosSlides((await destaquesDaHome(agora)).slides)).toEqual([a, b, "programa"]);

    // Reordena: b, programa, a.
    await salvar(quem, dados([noticia(b, { saiEm: horas(agora, 48) }), programa, noticia(a)]), agora);
    expect(idsDosSlides((await destaquesDaHome(agora)).slides)).toEqual([a, b, "programa"]);
    // A prévia (o rascunho) já mostra a ordem nova.
    expect(idsDosSlides((await destaquesDaHome(agora, "rascunho")).slides)).toEqual([b, "programa", a]);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila, agora });
    expect(idsDosSlides((await destaquesDaHome(agora)).slides)).toEqual([b, "programa", a]);

    const publicacoes = (await atividadesDaHome("pagina_inicial.publicar")).filter((r) => r.atorId === quem.id);
    expect(publicacoes).toHaveLength(2);
    expect(publicacoes[1]).toMatchObject({ atorTipo: "pessoa", atorId: quem.id });
    expect((publicacoes[1]!.detalhe as { depois: { carrossel: { item: string }[] } }).depois.carrossel.map((i) => i.item)).toEqual([
      `noticia:${b}`,
      "programa:programa",
      `noticia:${a}`,
    ]);
    // Só a saída futura de b vai para a fila (uma vez por publicação; o pg-boss guarda uma por chave).
    expect(pedidosDestaque).toEqual([
      { chave: `noticia:${b}`, virada: "sair", para: horas(agora, 48).toISOString() },
      { chave: `noticia:${b}`, virada: "sair", para: horas(agora, 48).toISOString() },
    ]);
  });

  it("publicar sem alterações é recusado; com a revisão velha, avisa o conflito", async () => {
    const quem = await pessoaDaEquipe("COM");
    await expect(publicarAlteracoes({ revisaoBase: 0 }, { quem, fila: filaEmMemoria().fila })).rejects.toThrow("Não há alterações para publicar.");
    await salvar(quem, dados([]));
    await expect(publicarAlteracoes({ revisaoBase: 0 }, { quem, fila: filaEmMemoria().fila })).rejects.toThrow(CONFLITO);
  });

  it("descartar volta o rascunho ao publicado, com a Atividade", async () => {
    const quem = await pessoaDaEquipe("ADM");
    const a = await publicada(quem);
    await salvar(quem, dados([noticia(a)], [{ noticiaId: a }, null, null]));
    const r = await descartarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem });
    expect(r.tipo).toBe("salvo");
    const painel = await lerPainel({ quem });
    expect(painel.rascunho).toEqual(painel.publicado);
    expect(await atividadesDaHome("pagina_inicial.descartar")).toHaveLength(1);
  });
});

describe("Página inicial: “Tirar do ar agora” (E62)", () => {
  it("grava sai_em = agora no publicado e no rascunho, com a Atividade, e o item some do site", async () => {
    const quem = await pessoaDaEquipe("COM");
    const titulo = `Home tirar ${randomUUID().slice(0, 8)}`;
    const a = await publicada(quem, { titulo });
    const agora = agoraDepois();
    await salvar(quem, dados([noticia(a), programa]), agora);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });
    const antes = await revisaoAtual();

    const depois = horas(agora, 1);
    const r = await tirarDoArAgora({ chave: `noticia:${a}`, revisaoBase: antes }, { quem, agora: depois });

    expect(r).toEqual({ tipo: "salvo", revisao: antes + 1, salvoEm: depois.toISOString() });
    const painel = await lerPainel({ quem, agora: depois });
    expect(painel.publicado.carrossel[0]!.saiEm).toEqual(depois);
    expect(painel.rascunho.carrossel[0]!.saiEm).toEqual(depois);
    expect(idsDosSlides((await destaquesDaHome(depois)).slides)).toEqual(["programa"]);
    const [registro] = await atividadesDaHome("destaque.tirar_do_ar");
    expect(registro).toMatchObject({ atorTipo: "pessoa", atorId: quem.id, alvoRotulo: titulo, detalhe: { item: `noticia:${a}`, sai_em_antes: null } });
  });

  it("item agendado ou que já saiu não pode ser tirado do ar", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const agora = agoraDepois();
    await salvar(quem, dados([noticia(a, { entraEm: horas(agora, 5) })]), agora);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });
    await expect(tirarDoArAgora({ chave: `noticia:${a}`, revisaoBase: await revisaoAtual() }, { quem, agora })).rejects.toThrow("Este destaque não está no ar.");
    await expect(tirarDoArAgora({ chave: "noticia:00000000-0000-7000-8000-000000000000", revisaoBase: await revisaoAtual() }, { quem, agora })).rejects.toThrow(
      "Este destaque não está no ar.",
    );
    expect(await atividadesDaHome("destaque.tirar_do_ar")).toHaveLength(1);
  });
});

describe("Página inicial: “Tirar do ar agora” respeita o rascunho e a Atividade (revisão do código)", () => {
  it("com a revisão velha (rascunho mudado depois), recusa sem mudar nada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const agora = agoraDepois();
    await salvar(quem, dados([noticia(a), programa]), agora);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });
    const velha = await revisaoAtual();
    // Outra aba (ou outra pessoa) reordena o rascunho depois.
    await salvar(quem, dados([programa, noticia(a)]), agora);

    await expect(tirarDoArAgora({ chave: `noticia:${a}`, revisaoBase: velha }, { quem, agora: horas(agora, 1) })).rejects.toThrow(CONFLITO);
    const painel = await lerPainel({ quem, agora: horas(agora, 1) });
    expect(painel.publicado.carrossel[0]!.saiEm).toBeNull();
    expect(painel.rascunho.carrossel.map(chaveDoItem)).toEqual(["programa:programa", `noticia:${a}`]);
  });

  it("o rótulo da Atividade é o título do item no servidor, nunca o texto que veio do navegador", async () => {
    const quem = await pessoaDaEquipe("COM");
    const titulo = `Home rótulo ${randomUUID().slice(0, 8)}`;
    const a = await publicada(quem, { titulo });
    const agora = agoraDepois();
    await salvar(quem, dados([noticia(a)]), agora);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });

    await tirarDoArAgora({ chave: `noticia:${a}`, revisaoBase: await revisaoAtual(), rotulo: "Texto inventado pelo navegador" } as { chave: string; revisaoBase: number }, {
      quem,
      agora: horas(agora, 1),
    });
    const registros = await atividadesDaHome("destaque.tirar_do_ar");
    expect(registros.at(-1)).toMatchObject({ alvoRotulo: titulo });
  });
});

describe("Home do site: segue o relógio (E62)", () => {
  it("o item entra e sai nas datas, sem esperar a T04", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const agora = agoraDepois();
    await salvar(quem, dados([noticia(a, { entraEm: horas(agora, 1), saiEm: horas(agora, 3) })]), agora);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });

    expect(idsDosSlides((await destaquesDaHome(agora)).slides)).toEqual(["programa"]);
    expect(idsDosSlides((await destaquesDaHome(horas(agora, 1))).slides)).toEqual([a]);
    expect(idsDosSlides((await destaquesDaHome(horas(agora, 3))).slides)).toEqual(["programa"]);
  });

  it("episódio no carrossel e notícia oculta pulada; a lista completa com as mais recentes", async () => {
    const quem = await pessoaDaEquipe("ADM");
    const a = await publicada(quem);
    const b = await publicada(quem);
    const c = await publicada(quem);
    const ep = await episodioNoAr(quem, new Date("2000-06-01T16:00:00Z"));
    const agora = agoraDepois();
    await salvar(quem, dados([{ tipo: "episodio", itemId: ep, entraEm: null, saiEm: null, fraseChamada: null }, noticia(a)], [null, { noticiaId: a }, null]), agora);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });

    const home = await destaquesDaHome(agora);
    expect(idsDosSlides(home.slides)).toEqual([ep, a]);
    // A posição 2 é a escolhida (a), mesmo estando no carrossel; as outras pegam c e b.
    expect(home.lista.map((n) => n.id)).toEqual([c, a, b]);
    expect(home.intervaloSegundos).toBe(8);

    await ocultarConteudos({ ids: [a], motivo: "Informação errada" }, { quem });
    const depois = await destaquesDaHome(agora);
    expect(idsDosSlides(depois.slides)).toEqual([ep]);
    expect(depois.lista.map((n) => n.id)).toEqual([c, b, depois.lista[2]!.id]);
    expect(depois.lista.map((n) => n.id)).not.toContain(a);
  });
});

describe("T04 · destaques da Home (spec §6, E62)", () => {
  it("grava entrar e sair com o ator sistema e o atraso; pedido repetido ou velho não faz nada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const agora = agoraDepois();
    const entra = horas(agora, 1);
    const sai = horas(agora, 2);
    await salvar(quem, dados([noticia(a, { entraEm: entra, saiEm: sai })]), agora);
    await publicarAlteracoes({ revisaoBase: await revisaoAtual() }, { quem, fila: filaEmMemoria().fila, agora });
    const chave = `noticia:${a}`;

    expect(await executarViradaDoDestaque({ chave, virada: "entrar", para: entra.toISOString() }, { agora: horas(entra, 0.01) })).toEqual({ tipo: "feita" });
    expect(await executarViradaDoDestaque({ chave, virada: "entrar", para: entra.toISOString() }, { agora: horas(entra, 0.02) })).toEqual({ tipo: "ignorada" });
    // Hora que não bate mais (republicado com outra data): ignorado.
    expect(await executarViradaDoDestaque({ chave, virada: "sair", para: horas(sai, 1).toISOString() })).toEqual({ tipo: "ignorada" });
    expect(await executarViradaDoDestaque({ chave, virada: "sair", para: sai.toISOString() }, { agora: sai })).toEqual({ tipo: "feita" });

    const entradas = (await atividadesDaHome("destaque.entrar_no_ar")).filter((r) => (r.detalhe as { item: string }).item === chave);
    expect(entradas).toEqual([
      expect.objectContaining({ atorTipo: "sistema", atorId: null, detalhe: { item: chave, marcado_para: entra.toISOString(), atraso_segundos: 36 } }),
    ]);
    const saidas = (await atividadesDaHome("destaque.sair_do_ar")).filter((r) => (r.detalhe as { item: string }).item === chave);
    expect(saidas).toHaveLength(1);
  });

  it("item removido do publicado: o pedido não faz nada", async () => {
    expect(await executarViradaDoDestaque({ chave: `noticia:${randomUUID()}`, virada: "entrar", para: new Date().toISOString() })).toEqual({ tipo: "ignorada" });
  });
});

describe("Opções da janela “Adicionar destaque”", () => {
  it("só traz o que está no ar, com a busca no título, e marca a notícia sem capa", async () => {
    const quem = await pessoaDaEquipe("COM");
    const marca = randomUUID().slice(0, 8);
    const comCapa = await publicada(quem, { titulo: `Home opção ${marca} com capa` });
    const semCapa = await publicada(quem, { titulo: `Home opção ${marca} sem capa` }, false);
    await rascunhoSalvo(quem, await noticiaCompleta({ titulo: `Home opção ${marca} rascunho` }));

    const opcoes = await opcoesDeDestaque({ tipo: "noticia", busca: `opcao ${marca}` }, { quem });
    expect(opcoes.map((o) => [o.itemId, o.temCapa])).toEqual([
      [semCapa, false],
      [comCapa, true],
    ]);
  });
});
