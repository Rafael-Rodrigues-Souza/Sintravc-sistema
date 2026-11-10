import { describe, expect, it } from "vitest";

import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";
import type { QuemDaEquipe } from "@/lib/permissoes";

import { banco } from "@/lib/db";

import { carregarNoticia, retratoNoAr } from "./carregar";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { SemPermissao } from "@/lib/permissoes";
import { enviarMidia } from "@/lib/midia/enviar";
import { listarMidia } from "@/lib/midia/listar";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem } from "@/testes/arquivos/gerar";

import { agendarNoticia } from "./agendar";
import {
  arquivarNoticias,
  desfazerArquivamento,
  excluirRascunho,
  mostrarNoSite,
  ocultarNoticias,
  restaurarComoRascunho,
  restaurarVersao,
} from "./ciclo-de-vida";
import { ErroConteudo } from "./erros";
import { listarConteudos } from "./listar";
import { temAlteracoesNaoPublicadas } from "./publicacao";
import { publicarNoticia, versoesDaNoticia } from "./publicar";
import { executarPublicacaoAgendada } from "./publicar-agendado";
import { salvarRascunhoNoticia } from "./salvar";

/** Notícia publicada (versão 1), como a tela faria. */
async function publicada(quem: QuemDaEquipe, titulo = "Assembleia da categoria no sábado") {
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta({ titulo }));
  await publicarNoticia({ id, revisaoBase: revisao }, { quem });
  return id;
}

describe("ocultarNoticias (CA-US22.1, RN11)", () => {
  it("sem motivo, ou só com espaços, não oculta", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);

    for (const motivo of ["", "   "]) {
      const erro = await ocultarNoticias({ ids: [id], motivo }, { quem }).catch((e) => e);
      expect(erro).toBeInstanceOf(ErroConteudo);
      expect(erro).toMatchObject({ codigo: "invalido", campo: "motivo" });
    }
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "publicado", motivoOculto: null, ocultadoEm: null });
  });

  it("com motivo, sai do site: estado Oculto, motivo, data da retirada e Atividade com o motivo", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    const antes = new Date();

    const resultado = await ocultarNoticias({ ids: [id], motivo: "  Informação errada no lide  " }, { quem });

    expect(resultado).toEqual({ feitos: [id], ignorados: [] });
    const aberta = await carregarNoticia(id, { quem });
    expect(aberta).toMatchObject({ estado: "oculto", motivoOculto: "Informação errada no lide" });
    expect(aberta!.ocultadoEm!.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.ocultar",
      atorId: quem.id,
      motivo: "Informação errada no lide",
    });
  });
});

describe("Retirado em (E45)", () => {
  it("editar a cópia de trabalho da notícia oculta não muda a data da retirada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await ocultarNoticias({ ids: [id], motivo: "Revisar os números" }, { quem });
    const { ocultadoEm, revisao, dados } = (await carregarNoticia(id, { quem }))!;

    await new Promise((r) => setTimeout(r, 20));
    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: { ...dados, lide: "Lide corrigido." } }, edicaoDe(quem));

    const depois = (await carregarNoticia(id, { quem }))!;
    expect(depois.dados.lide).toBe("Lide corrigido.");
    expect(depois.ocultadoEm).toEqual(ocultadoEm);
  });
});

describe("mostrarNoSite (Oculto → Publicado, RN10, E45)", () => {
  it("volta a versão que estava no ar, sem versão nova; a alteração pendente continua na cópia de trabalho", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await ocultarNoticias({ ids: [id], motivo: "Revisar os números" }, { quem });
    const oculta = (await carregarNoticia(id, { quem }))!;
    await salvarRascunhoNoticia(
      { id, revisaoBase: oculta.revisao, dados: { ...oculta.dados, lide: "Lide ainda em revisão." } },
      edicaoDe(quem),
    );

    await mostrarNoSite({ id }, { quem });

    const aberta = (await carregarNoticia(id, { quem }))!;
    expect(aberta).toMatchObject({ estado: "publicado", versao: 1, motivoOculto: null, ocultadoEm: null });
    expect(aberta.dados.lide).toBe("Lide ainda em revisão.");
    expect(temAlteracoesNaoPublicadas(aberta)).toBe(true);
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(1);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.mostrar", atorId: quem.id, detalhe: { versao: 1 } });
  });

  it("só o que está oculto pode voltar ao site", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());

    const erro = await mostrarNoSite({ id }, { quem }).catch((e) => e);

    expect(erro).toMatchObject({ codigo: "invalido" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho" });
  });
});

describe("arquivarNoticias (CA-US22.2, RN10)", () => {
  it("2 conteúdos em lote saem da lista, vão para Arquivados e cada um ganha a sua linha na Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const marca = `lote-${Date.now()}`;
    const a = await publicada(quem, `Campanha de vacinação ${marca}`);
    const b = await publicada(quem, `Plantão no feriado ${marca}`);
    await ocultarNoticias({ ids: [b], motivo: "Data errada" }, { quem });

    const resultado = await arquivarNoticias({ ids: [a, b] }, { quem });

    expect(resultado.feitos.sort()).toEqual([a, b].sort());
    expect(resultado.ignorados).toEqual([]);
    expect((await listarConteudos({ busca: marca }, { quem })).itens).toEqual([]);
    const arquivados = await listarConteudos({ busca: marca, arquivados: true }, { quem });
    expect(arquivados.itens.map((i) => i.id).sort()).toEqual([a, b].sort());
    expect(arquivados.itens.every((i) => i.estado === "arquivado")).toBe(true);

    expect((await atividadesDe(a)).filter((r) => r.acao === "noticia.arquivar")).toEqual([
      expect.objectContaining({ atorId: quem.id, detalhe: { estado_anterior: "publicado" } }),
    ]);
    expect((await atividadesDe(b)).filter((r) => r.acao === "noticia.arquivar")).toEqual([
      expect.objectContaining({ atorId: quem.id, detalhe: { estado_anterior: "oculto" } }),
    ]);
  });

  it("arquivada não se edita: o salvamento é recusado e nada muda", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await arquivarNoticias({ ids: [id] }, { quem });
    const { revisao, dados } = (await carregarNoticia(id, { quem }))!;

    const erro = await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: { ...dados, lide: "Outro" } }, edicaoDe(quem)).catch(
      (e) => e,
    );

    expect(erro).toMatchObject({ codigo: "invalido" });
    expect((await carregarNoticia(id, { quem }))!.dados.lide).toBe(dados.lide);
  });

  it("o que já está arquivado fica de fora do lote, e os outros seguem", async () => {
    const quem = await pessoaDaEquipe("COM");
    const a = await publicada(quem);
    const { id: b } = await rascunhoSalvo(quem, await noticiaCompleta());
    await arquivarNoticias({ ids: [a] }, { quem });

    const resultado = await arquivarNoticias({ ids: [a, b] }, { quem });

    expect(resultado.feitos).toEqual([b]);
    expect(resultado.ignorados).toEqual([expect.objectContaining({ id: a, motivo: expect.stringContaining("arquivad") })]);
    expect((await atividadesDe(a)).filter((r) => r.acao === "noticia.arquivar")).toHaveLength(1);
  });
});

describe("desfazerArquivamento (aviso “Desfazer”, CA-US22.2, E45)", () => {
  it("cada notícia volta ao estado de antes; a oculta volta com o mesmo motivo", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const a = await publicada(quem);
    const b = await publicada(quem);
    await ocultarNoticias({ ids: [b], motivo: "Data errada" }, { quem });
    const { id: c } = await rascunhoSalvo(quem, await noticiaCompleta());
    await arquivarNoticias({ ids: [a, b, c] }, { quem });

    const resultado = await desfazerArquivamento({ ids: [a, b, c] }, { quem, fila });

    expect(resultado.feitos.sort()).toEqual([a, b, c].sort());
    expect(await carregarNoticia(a, { quem })).toMatchObject({ estado: "publicado", versao: 1 });
    expect(await carregarNoticia(b, { quem })).toMatchObject({ estado: "oculto", motivoOculto: "Data errada" });
    expect(await carregarNoticia(c, { quem })).toMatchObject({ estado: "rascunho" });
    expect((await atividadesDe(b)).at(-1)).toMatchObject({ acao: "noticia.desfazer_arquivamento", detalhe: { estado: "oculto" } });
  });

  it("agendada arquivada não vai ao ar na hora; o desfazer reagenda se a data ainda não passou", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila, pedidos } = filaEmMemoria();
    const agora = new Date("2026-11-02T12:00:00Z");
    const para = new Date("2026-11-03T11:00:00Z");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila, agora });
    await arquivarNoticias({ ids: [id] }, { quem });

    expect(await executarPublicacaoAgendada(pedidos[0]!, { agora: para })).toEqual({ tipo: "ignorada" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "arquivado", jaPublicado: false });

    await desfazerArquivamento({ ids: [id] }, { quem, fila, agora });

    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado", agendadoPara: para });
    expect(pedidos).toHaveLength(2);
    expect(pedidos[1]).toEqual({ conteudoId: id, para: para.toISOString() });
  });

  it("agendada cuja data passou enquanto estava arquivada volta como rascunho, sem data", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila, pedidos } = filaEmMemoria();
    const para = new Date("2026-11-03T11:00:00Z");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila, agora: new Date("2026-11-02T12:00:00Z") });
    await arquivarNoticias({ ids: [id] }, { quem });

    await desfazerArquivamento({ ids: [id] }, { quem, fila, agora: new Date("2026-11-04T12:00:00Z") });

    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", agendadoPara: null, agendadoPor: null });
    expect(pedidos).toHaveLength(1);
  });

  it("o que não está arquivado fica de fora", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const id = await publicada(quem);

    const resultado = await desfazerArquivamento({ ids: [id] }, { quem, fila });

    expect(resultado.feitos).toEqual([]);
    expect(resultado.ignorados).toEqual([expect.objectContaining({ id })]);
  });
});

describe("restaurarComoRascunho (Arquivado → Rascunho, RN10)", () => {
  it("volta como rascunho, fora do site, e guarda as versões, o endereço e a marca de já publicado", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    await ocultarNoticias({ ids: [id], motivo: "Data errada" }, { quem });
    await arquivarNoticias({ ids: [id] }, { quem });
    const slug = (await carregarNoticia(id, { quem }))!.slug;

    await restaurarComoRascunho({ id }, { quem });

    expect(await carregarNoticia(id, { quem })).toMatchObject({
      estado: "rascunho",
      jaPublicado: true,
      slug,
      versao: 1,
      motivoOculto: null,
      ocultadoEm: null,
    });
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(1);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.restaurar", atorId: quem.id });
  });

  it("só o arquivado é restaurado", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);

    const erro = await restaurarComoRascunho({ id }, { quem }).catch((e) => e);

    expect(erro).toMatchObject({ codigo: "invalido" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "publicado" });
  });
});

describe("excluirRascunho (CA-US22.3 a CA-US22.5, RN54, E07)", () => {
  async function enviarImagem(quem: QuemDaEquipe, nome: string) {
    const { armazenamento } = armazenamentoEmMemoria();
    return (await enviarMidia({ bytes: await imagem("png"), nome }, { quem, armazenamento })).id;
  }

  it("o autor exclui o próprio rascunho nunca publicado: some de vez, fica na Atividade e a capa passa a “Sem uso”", async () => {
    const quem = await pessoaDaEquipe("COM");
    const nome = `capa-${Date.now()}.png`;
    const capa = await enviarImagem(quem, nome);
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta({ capaMidiaId: capa, capaAlt: "Motoristas na garagem" }));
    expect((await listarMidia({ busca: nome })).itens[0]).toMatchObject({ id: capa, usos: 1 });

    await excluirRascunho({ id }, { quem });

    expect(await carregarNoticia(id, { quem })).toBeNull();
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.excluir", atorId: quem.id });
    expect((await listarMidia({ busca: nome })).itens[0]).toMatchObject({ id: capa, usos: 0 });
  });

  it("o que já foi publicado alguma vez não se exclui, nem depois de restaurado como rascunho", async () => {
    const quem = await pessoaDaEquipe("ADM");
    const id = await publicada(quem);
    await arquivarNoticias({ ids: [id] }, { quem });
    await restaurarComoRascunho({ id }, { quem });

    const erro = await excluirRascunho({ id }, { quem }).catch((e) => e);

    expect(erro).toBeInstanceOf(SemPermissao);
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho" });
  });

  it("agendada nunca publicada não se exclui: precisa voltar a rascunho antes", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await agendarNoticia({ id, revisaoBase: revisao, para: new Date(Date.now() + 86_400_000) }, { quem, fila });

    const erro = await excluirRascunho({ id }, { quem }).catch((e) => e);

    expect(erro).toMatchObject({ codigo: "invalido" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado" });
  });

  it("a Comunicação não exclui o rascunho de outra pessoa; o Administrador geral exclui", async () => {
    const autora = await pessoaDaEquipe("COM");
    const colega = await pessoaDaEquipe("COM");
    const adm = await pessoaDaEquipe("ADM");
    const { id } = await rascunhoSalvo(autora, await noticiaCompleta());

    expect(await excluirRascunho({ id }, { quem: colega }).catch((e) => e)).toBeInstanceOf(SemPermissao);
    expect(await carregarNoticia(id, { quem: autora })).not.toBeNull();

    await excluirRascunho({ id }, { quem: adm });
    expect(await carregarNoticia(id, { quem: autora })).toBeNull();
  });
});

describe("restaurarVersao (CA-US21.9, E31, E42)", () => {
  /** Publicada e editada 2 vezes: versões 1, 2 e 3, cada uma com uma manchete. */
  async function comTresVersoes(quem: QuemDaEquipe) {
    const id = await publicada(quem, "Manchete da versão 1");
    for (const titulo of ["Manchete da versão 2", "Manchete da versão 3"]) {
      const atual = (await carregarNoticia(id, { quem }))!;
      const salvo = await salvarRascunhoNoticia({ id, revisaoBase: atual.revisao, dados: { ...atual.dados, titulo } }, edicaoDe(quem));
      if (salvo.tipo !== "salvo") throw new Error("esperava salvo");
      await publicarNoticia({ id, revisaoBase: salvo.revisao }, { quem });
    }
    return id;
  }

  it("a versão 1 vira a cópia de trabalho e a versão 3 continua no ar, com o aviso de alterações", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await comTresVersoes(quem);
    const { revisao } = (await carregarNoticia(id, { quem }))!;

    const resultado = await restaurarVersao({ id, versao: 1, revisaoBase: revisao }, edicaoDe(quem));

    expect(resultado).toMatchObject({ tipo: "restaurada" });
    const aberta = (await carregarNoticia(id, { quem }))!;
    expect(aberta).toMatchObject({ estado: "publicado", versao: 3 });
    expect(aberta.dados.titulo).toBe("Manchete da versão 1");
    expect(temAlteracoesNaoPublicadas(aberta)).toBe(true);
    expect((await retratoNoAr(banco(), id))!.dados.titulo).toBe("Manchete da versão 3");
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(3);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "noticia.restaurar_versao", atorId: quem.id, detalhe: { versao: 1 } });
  });

  it("o Histórico lista as versões com quem, quando, o que mudou e qual está no site agora", async () => {
    const quem = await pessoaDaEquipe("COM", "Mariana Souza");
    const id = await comTresVersoes(quem);

    const versoes = await versoesDaNoticia(id, { quem });

    expect(versoes.map((v) => [v.versao, v.noAr, v.resumo, v.criadoPorNome])).toEqual([
      [3, true, "Mudou: manchete.", "Mariana Souza"],
      [2, false, "Mudou: manchete.", "Mariana Souza"],
      [1, false, "Primeira publicação.", "Mariana Souza"],
    ]);
  });

  it("se alguém salvou depois, nada muda e a pessoa vê o conflito", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await comTresVersoes(quem);
    const { revisao } = (await carregarNoticia(id, { quem }))!;

    const resultado = await restaurarVersao({ id, versao: 1, revisaoBase: revisao - 1 }, edicaoDe(quem));

    expect(resultado).toMatchObject({ tipo: "conflito" });
    expect((await carregarNoticia(id, { quem }))!.dados.titulo).toBe("Manchete da versão 3");
  });

  it("versão que não existe é recusada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const id = await publicada(quem);
    const { revisao } = (await carregarNoticia(id, { quem }))!;

    const erro = await restaurarVersao({ id, versao: 7, revisaoBase: revisao }, edicaoDe(quem)).catch((e) => e);

    expect(erro).toMatchObject({ codigo: "nao_encontrada" });
  });
});
