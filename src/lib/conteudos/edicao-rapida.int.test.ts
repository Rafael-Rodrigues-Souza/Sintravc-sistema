import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { pessoaDaEquipe, urlDeTeste } from "@/testes/equipe";
import { atividadesDe, idDaCategoria, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { agendarNoticia } from "./agendar";
import { carregarNoticia, retratoNoAr } from "./carregar";
import { salvarEdicaoRapida, ultimasAcoes, type EntradaEdicaoRapida } from "./edicao-rapida";
import { ErroFaltamCampos, publicarNoticia } from "./publicar";

const AGORA = new Date("2026-11-02T12:00:00Z");
const PARA = new Date("2026-11-03T11:00:00Z");
const DEPOIS = new Date("2026-11-05T11:00:00Z");
const TITULO_ORIGINAL = "Assembleia da categoria no sábado";

function depsDe(quem: QuemDaEquipe) {
  const { fila, pedidos } = filaEmMemoria();
  return { deps: { quem, fila, agora: AGORA, urlDoArquivo: urlDeTeste }, pedidos };
}

/** O que a tela manda: o estado atual da notícia, com as mudanças da pessoa. */
async function entrada(id: string, mudancas: Partial<EntradaEdicaoRapida> = {}): Promise<EntradaEdicaoRapida> {
  const atual = (await carregarNoticia(id, { quem: await pessoaDaEquipe("ADM") }))!;
  return {
    id,
    revisaoBase: atual.revisao,
    titulo: atual.dados.titulo,
    categoriaId: atual.dados.categoriaId,
    situacao: atual.estado === "agendado" ? "agendado" : atual.estado === "publicado" ? "publicado" : "rascunho",
    para: atual.agendadoPara,
    ...mudancas,
  };
}

describe("salvarEdicaoRapida (RF36, Figma 115:2324)", () => {
  it("rascunho: muda título e categoria e fica rascunho; a Atividade diz que foi pela Edição rápida", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    const geral = await idDaCategoria("Geral");

    const resultado = await salvarEdicaoRapida(await entrada(id, { titulo: "Título ajustado", categoriaId: geral }), depsDe(quem).deps);

    expect(resultado).toMatchObject({ tipo: "salva", estado: "rascunho" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({
      estado: "rascunho",
      dados: expect.objectContaining({ titulo: "Título ajustado", categoriaId: geral }),
    });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.editar", atorId: quem.id, detalhe: { origem: "edicao_rapida" } });
  });

  it("rascunho para Agendado: grava o título e agenda, na mesma transação", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    const { deps, pedidos } = depsDe(quem);

    const resultado = await salvarEdicaoRapida(await entrada(id, { titulo: "Agendada pela lista", situacao: "agendado", para: PARA }), deps);

    expect(resultado).toMatchObject({ tipo: "salva", estado: "agendado", agendadoPara: PARA });
    expect(await carregarNoticia(id, { quem })).toMatchObject({
      estado: "agendado",
      dados: expect.objectContaining({ titulo: "Agendada pela lista" }),
    });
    expect(pedidos).toEqual([{ conteudoId: id, para: PARA.toISOString() }]);
  });

  it("se não dá para agendar (falta obrigatório), nada é gravado, nem o título", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta({ lide: "" }));

    await expect(
      salvarEdicaoRapida(await entrada(id, { titulo: "Não deveria gravar", situacao: "agendado", para: PARA }), depsDe(quem).deps),
    ).rejects.toBeInstanceOf(ErroFaltamCampos);
    expect((await carregarNoticia(id, { quem }))!.dados.titulo).toBe(TITULO_ORIGINAL);
  });

  it("Agendado sem data: pede a data", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    await expect(salvarEdicaoRapida(await entrada(id, { situacao: "agendado", para: null }), depsDe(quem).deps)).rejects.toMatchObject({
      campo: "agendadoPara",
    });
  });

  it("agendada: mudar a data reagenda; voltar para Rascunho cancela o agendamento", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await agendarNoticia({ id, revisaoBase: revisao, para: PARA }, { quem, fila: filaEmMemoria().fila, agora: AGORA });

    await salvarEdicaoRapida(await entrada(id, { para: DEPOIS }), depsDe(quem).deps);
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado", agendadoPara: DEPOIS });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.reagendar" });

    await salvarEdicaoRapida(await entrada(id, { situacao: "rascunho" }), depsDe(quem).deps);
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", agendadoPara: null });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.cancelar_agendamento" });
  });

  it("Publicar agora: vai ao ar com o título novo", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());

    const resultado = await salvarEdicaoRapida(await entrada(id, { titulo: "Publicada pela lista", situacao: "publicado" }), depsDe(quem).deps);

    expect(resultado).toMatchObject({ tipo: "salva", estado: "publicado" });
    expect((await retratoNoAr(banco(), id))!.dados.titulo).toBe("Publicada pela lista");
  });

  it("publicada: título e categoria vão para a cópia de trabalho; o site só muda ao publicar as alterações (E42, E44)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    const resultado = await salvarEdicaoRapida(await entrada(id, { titulo: "Título só na cópia" }), depsDe(quem).deps);

    expect(resultado).toMatchObject({ tipo: "salva", estado: "publicado", temAlteracoesNaoPublicadas: true });
    expect((await carregarNoticia(id, { quem }))!.dados.titulo).toBe("Título só na cópia");
    expect((await retratoNoAr(banco(), id))!.dados.titulo).toBe(TITULO_ORIGINAL);
  });

  it("sem mudança no título nem na categoria, não sobe a revisão nem registra edição", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    const antes = (await carregarNoticia(id, { quem }))!;
    const registros = (await atividadesDe(id)).length;

    await salvarEdicaoRapida(await entrada(id), depsDe(quem).deps);

    expect((await carregarNoticia(id, { quem }))!.revisao).toBe(antes.revisao);
    expect(await atividadesDe(id)).toHaveLength(registros);
  });

  it("se alguém salvou depois, devolve o conflito e não grava", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());

    const resultado = await salvarEdicaoRapida({ ...(await entrada(id, { titulo: "Atrasado" })), revisaoBase: revisao - 1 }, depsDe(quem).deps);

    expect(resultado.tipo).toBe("conflito");
    expect((await carregarNoticia(id, { quem }))!.dados.titulo).toBe(TITULO_ORIGINAL);
  });

  it("título acima do limite é recusado no campo", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    await expect(salvarEdicaoRapida(await entrada(id, { titulo: "x".repeat(111) }), depsDe(quem).deps)).rejects.toMatchObject({
      campo: "titulo",
    });
  });

  it("Atendimento não usa a Edição rápida (RNF01)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    await expect(salvarEdicaoRapida(await entrada(id), depsDe(await pessoaDaEquipe("ATD")).deps)).rejects.toBeInstanceOf(SemPermissao);
  });
});

describe("ultimasAcoes (Figma 115:2324, Últimas ações; a Atividade é só do ADM, spec §2.3)", () => {
  it("as mais recentes primeiro, com quem fez", async () => {
    const quem = await pessoaDaEquipe("COM", "Mariana Souza");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await agendarNoticia({ id, revisaoBase: revisao, para: PARA }, { quem, fila: filaEmMemoria().fila, agora: AGORA });

    const acoes = await ultimasAcoes(id, { quem: await pessoaDaEquipe("ADM") });

    expect(acoes.map((a) => a.acao)).toEqual(["noticia.agendar", "noticia.criar"]);
    expect(acoes[0]).toMatchObject({ quemNome: "Mariana Souza", detalhe: { para: PARA.toISOString() }, quando: expect.any(Date) });
  });

  it("a Comunicação não recebe as últimas ações (RNF01)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());

    await expect(ultimasAcoes(id, { quem })).rejects.toBeInstanceOf(SemPermissao);
  });
});
