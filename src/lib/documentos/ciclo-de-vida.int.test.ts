import { describe, expect, it } from "vitest";

import {
  arquivarConteudos,
  desfazerArquivamento,
  excluirRascunho,
  mostrarNoSite,
  ocultarConteudos,
  restaurarComoRascunho,
} from "@/lib/conteudos/ciclo-de-vida";
import { SemPermissao } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { documentoCompleto, documentoSalvo, edicaoDoDocumento, pdfEnviado } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { agendarDocumento } from "./agendar";
import { carregarDocumento } from "./carregar";
import { documentoVazio, type TipoDocumento } from "./dados";
import { publicarDocumento } from "./publicar";
import { salvarRascunhoDocumento } from "./salvar";
import { descartarAlteracoesDocumento, restaurarVersaoDocumento, resolverConflitoDocumento, versoesDoDocumento } from "./versoes";

async function erroDe(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("não deu erro");
}

async function publicado(tipo: TipoDocumento = "edital") {
  const adm = await pessoaDaEquipe("ADM");
  const dados = await documentoCompleto(tipo, adm);
  const salvo = await documentoSalvo(adm, tipo, dados);
  await publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
  return { adm, id: salvo.id, dados };
}

describe("ciclo de vida do documento (RN10, RN11, E45, E46)", () => {
  it("o ADM oculta com motivo, mostra de novo, arquiva, desfaz, arquiva e restaura como rascunho", async () => {
    const { adm, id } = await publicado();

    await ocultarConteudos({ ids: [id], motivo: "Edital republicado com correção." }, { quem: adm });
    expect(await carregarDocumento(id, { quem: adm })).toMatchObject({ estado: "oculto", motivoOculto: "Edital republicado com correção." });
    await mostrarNoSite({ id }, { quem: adm });
    await arquivarConteudos({ ids: [id] }, { quem: adm });
    await desfazerArquivamento({ ids: [id] }, { quem: adm, fila: filaEmMemoria().fila });
    expect(await carregarDocumento(id, { quem: adm })).toMatchObject({ estado: "publicado" });
    await arquivarConteudos({ ids: [id] }, { quem: adm });
    await restaurarComoRascunho({ id }, { quem: adm });

    expect(await carregarDocumento(id, { quem: adm })).toMatchObject({ estado: "rascunho", jaPublicado: true });
    expect((await atividadesDe(id)).map((a) => a.acao).slice(-6)).toEqual([
      "documento.ocultar",
      "documento.mostrar",
      "documento.arquivar",
      "documento.desfazer_arquivamento",
      "documento.arquivar",
      "documento.restaurar",
    ]);
  });

  it("a Comunicação não oculta, não arquiva, não restaura e não exclui documentos (RN08)", async () => {
    const { id } = await publicado();
    const com = await pessoaDaEquipe("COM");

    expect(await ocultarConteudos({ ids: [id], motivo: "x" }, { quem: com })).toEqual({
      feitos: [],
      ignorados: [{ id, titulo: expect.any(String), motivo: "Só o Administrador geral altera documentos oficiais." }],
    });
    expect((await arquivarConteudos({ ids: [id] }, { quem: com })).feitos).toEqual([]);
    expect(await erroDe(mostrarNoSite({ id }, { quem: com }))).toBeInstanceOf(SemPermissao);
    expect(await erroDe(restaurarComoRascunho({ id }, { quem: com }))).toBeInstanceOf(SemPermissao);
    expect(await erroDe(excluirRascunho({ id }, { quem: com }))).toBeInstanceOf(SemPermissao);
  });

  it("arquivar em lote pela Comunicação: as notícias vão, os documentos ficam com o porquê", async () => {
    const { id: documentoId } = await publicado();
    const com = await pessoaDaEquipe("COM");
    const noticia = await rascunhoSalvo(com, await noticiaCompleta());

    const r = await arquivarConteudos({ ids: [documentoId, noticia.id] }, { quem: com });

    expect(r.feitos).toEqual([noticia.id]);
    expect(r.ignorados.map((i) => i.id)).toEqual([documentoId]);
  });

  it("o rascunho que nunca foi ao ar pode ser excluído pelo ADM; o PDF deixa de estar em uso", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    await excluirRascunho({ id: salvo.id }, { quem: adm });
    expect(await carregarDocumento(salvo.id, { quem: adm })).toBeNull();
    expect((await atividadesDe(salvo.id)).at(-1)).toMatchObject({ acao: "documento.excluir" });
  });

  it("o que já foi ao ar não se exclui, nem pelo ADM (RN54)", async () => {
    const { adm, id } = await publicado();
    await arquivarConteudos({ ids: [id] }, { quem: adm });
    await restaurarComoRascunho({ id }, { quem: adm });
    expect(await erroDe(excluirRascunho({ id }, { quem: adm }))).toBeInstanceOf(SemPermissao);
  });
});

describe("agendado: trocar o PDF pede cancelar o agendamento (RN12, E46)", () => {
  it("o PDF confirmado ao agendar não muda sem nova confirmação", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const dados = await documentoCompleto("edital", adm);
    const salvo = await documentoSalvo(adm, "edital", dados);
    await agendarDocumento(
      { id: salvo.id, revisaoBase: 1, para: new Date(Date.now() + 86_400_000), confirmoOficial: true },
      { quem: adm, fila: filaEmMemoria().fila },
    );

    const erro = await erroDe(
      salvarRascunhoDocumento(
        { id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...dados, pdfMidiaId: await pdfEnviado(adm) } },
        edicaoDoDocumento(adm),
      ),
    );
    expect(erro).toMatchObject({
      campo: "pdfMidiaId",
      message: "Para trocar o PDF, cancele o agendamento antes. Ao agendar de novo, você confirma o PDF novo.",
    });
    // Os outros campos continuam editáveis.
    await expect(
      salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...dados, resumo: "Outro." } }, edicaoDoDocumento(adm)),
    ).resolves.toMatchObject({ tipo: "salvo" });
  });
});

describe("versões do documento (E31, E42, N14)", () => {
  it("histórico com o que mudou; restaurar uma versão volta a cópia de trabalho sem tirar a atual do ar", async () => {
    const { adm, id, dados } = await publicado();
    await salvarRascunhoDocumento({ id, tipo: "edital", revisaoBase: 1, dados: { ...dados, resumo: "Resumo novo." } }, edicaoDoDocumento(adm));
    await publicarDocumento({ id, revisaoBase: 2, confirmoOficial: true }, { quem: adm });

    const versoes = await versoesDoDocumento(id, { quem: adm });
    expect(versoes.map((v) => [v.versao, v.noAr, v.resumo])).toEqual([
      [2, true, "Mudou: resumo."],
      [1, false, "Primeira publicação."],
    ]);

    const r = await restaurarVersaoDocumento({ id, versao: 1, revisaoBase: 2 }, { quem: adm });
    expect(r).toMatchObject({ tipo: "restaurada", documento: { estado: "publicado", versao: 2, revisao: 3, dados: { resumo: dados.resumo } } });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "documento.restaurar_versao", detalhe: { versao: 1 } });
  });

  it("descartar alterações volta a cópia de trabalho para a versão no ar", async () => {
    const { adm, id, dados } = await publicado("acordo");
    await salvarRascunhoDocumento({ id, tipo: "acordo", revisaoBase: 1, dados: { ...dados, resumo: "Rascunho." } }, edicaoDoDocumento(adm));
    const r = await descartarAlteracoesDocumento({ id, revisaoBase: 2 }, { quem: adm });
    expect(r).toMatchObject({ tipo: "descartada", documento: { revisao: 3, revisaoPublicada: 3, dados } });
  });

  it("conflito: “ficar com a minha” grava a versão do navegador; “a do servidor” só registra", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", { ...documentoVazio("edital"), titulo: "Servidor" });
    const minha = { ...documentoVazio("edital"), titulo: "Minha" };
    const r = await resolverConflitoDocumento({ id: salvo.id, tipo: "edital", escolha: "minha", revisaoServidor: 1, dados: minha }, edicaoDoDocumento(adm));
    expect(r).toMatchObject({ tipo: "salvo", revisao: 2 });
    expect((await carregarDocumento(salvo.id, { quem: adm }))!.dados.titulo).toBe("Minha");
    expect((await atividadesDe(salvo.id)).at(-1)).toMatchObject({ acao: "documento.resolver_conflito", detalhe: { escolha: "minha" } });
  });

  it("a Comunicação não vê o histórico nem restaura versões", async () => {
    const { id } = await publicado();
    const com = await pessoaDaEquipe("COM");
    expect(await erroDe(versoesDoDocumento(id, { quem: com }))).toBeInstanceOf(SemPermissao);
    expect(await erroDe(restaurarVersaoDocumento({ id, versao: 1, revisaoBase: 1 }, { quem: com }))).toBeInstanceOf(SemPermissao);
  });
});
