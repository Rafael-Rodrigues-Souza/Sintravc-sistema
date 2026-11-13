import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, categoria } from "@/lib/db/schema";
import { SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";
import { enviarMidia } from "@/lib/midia/enviar";
import { usosDasMidias } from "@/lib/midia/usos";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem } from "@/testes/arquivos/gerar";
import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";

import { carregarNoticia } from "./carregar";
import { noticiaVazia, type DadosNoticia } from "./dados";
import { descartarAlteracoes, publicarNoticia, versoesDaNoticia } from "./publicar";
import { temAlteracoesNaoPublicadas } from "./publicacao";
import { salvarRascunhoNoticia } from "./salvar";

async function idDaCategoria(nome: string) {
  const [linha] = await banco().select({ id: categoria.id }).from(categoria).where(eq(categoria.nome, nome));
  return linha!.id;
}

async function completa(mudancas: Partial<DadosNoticia> = {}): Promise<DadosNoticia> {
  return {
    ...noticiaVazia(),
    titulo: "Plantão jurídico em novo horário",
    lide: "A partir de segunda, o plantão funciona das 8h às 17h.",
    corpo: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Leve seus contracheques." }] }] },
    categoriaId: await idDaCategoria("Jurídico"),
    assinatura: "Redação SINTRAVC",
    ...mudancas,
  };
}

/** Rascunho salvo pelo editor, como a tela faria. */
async function rascunho(quem: QuemDaEquipe, dados: DadosNoticia) {
  const r = await salvarRascunhoNoticia({ dados }, edicaoDe(quem));
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  return r;
}

async function enviarImagem(quem: QuemDaEquipe, nome = "foto.png") {
  const { armazenamento } = armazenamentoEmMemoria();
  return (await enviarMidia({ bytes: await imagem("png"), nome }, { quem, armazenamento })).id;
}

async function atividadesDa(id: string) {
  return banco()
    .select({ acao: atividade.acao, atorId: atividade.atorId, detalhe: atividade.detalhe })
    .from(atividade)
    .where(eq(atividade.alvoId, id))
    .orderBy(atividade.id);
}

describe("publicarNoticia: publicar agora (RF39, RN10)", () => {
  it("rascunho completo vai ao ar: estado Publicado, data, já publicado, versão 1, slug e Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, await completa());
    const antes = new Date();

    const resultado = await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    expect(resultado).toMatchObject({ tipo: "publicada", versao: 1 });
    const aberta = await carregarNoticia(id, { quem });
    expect(aberta).toMatchObject({
      estado: "publicado",
      versao: 1,
      jaPublicado: true,
      revisaoPublicada: revisao,
      slug: "plantao-juridico-em-novo-horario",
    });
    expect(aberta!.publicadoEm!.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);

    const versoes = await versoesDaNoticia(id, { quem });
    expect(versoes).toEqual([
      expect.objectContaining({ versao: 1, criadoPor: quem.id, dados: expect.objectContaining({ titulo: "Plantão jurídico em novo horário" }) }),
    ]);

    const registros = await atividadesDa(id);
    expect(registros.at(-1)).toMatchObject({ acao: "noticia.publicar", atorId: quem.id, detalhe: { versao: 1 } });
  });
});

describe("publicarNoticia: o que impede a publicação", () => {
  it("capa sem texto alternativo: publicação impedida, campo indicado e nada muda (CA-US21.3)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const capa = await enviarImagem(quem);
    const { id, revisao } = await rascunho(quem, await completa({ capaMidiaId: capa, capaAlt: "" }));

    await expect(publicarNoticia({ id, revisaoBase: revisao }, { quem })).rejects.toMatchObject({
      codigo: "invalido",
      campo: "capaAlt",
      campos: ["capaAlt"],
      message: "Falta 1 item obrigatório para publicar.",
    });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", versao: 0, jaPublicado: false, slug: null });
    expect(await versoesDaNoticia(id, { quem })).toEqual([]);
  });
});

describe("publicarNoticia: conflito, repetição e permissão", () => {
  it("se alguém salvou depois do que a pessoa está vendo, nada vai ao ar e ela recebe a versão do servidor", async () => {
    const ana = await pessoaDaEquipe("COM", "Ana Lima");
    const carlos = await pessoaDaEquipe("COM", "Carlos Ribeiro");
    const { id, revisao } = await rascunho(ana, await completa());
    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: await completa({ titulo: "Versão do Carlos" }) }, edicaoDe(carlos));

    const resultado = await publicarNoticia({ id, revisaoBase: revisao }, { quem: ana });

    expect(resultado).toMatchObject({ tipo: "conflito", servidor: { salvoPorNome: "Carlos Ribeiro", dados: { titulo: "Versão do Carlos" } } });
    expect(await carregarNoticia(id, { quem: ana })).toMatchObject({ estado: "rascunho", versao: 0 });
  });

  it("publicar duas vezes seguidas (duplo clique) gera uma versão só", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, await completa());

    const primeira = await publicarNoticia({ id, revisaoBase: revisao }, { quem });
    const segunda = await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    expect(segunda).toEqual(primeira);
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(1);
    expect((await atividadesDa(id)).filter((a) => a.acao.startsWith("noticia.publicar"))).toHaveLength(1);
  });

  it("Atendimento não publica, mesmo chamando o servidor direto (RNF01)", async () => {
    const com = await pessoaDaEquipe("COM");
    const atd = await pessoaDaEquipe("ATD");
    const { id, revisao } = await rascunho(com, await completa());

    await expect(publicarNoticia({ id, revisaoBase: revisao }, { quem: atd })).rejects.toBeInstanceOf(SemPermissao);
    expect(await carregarNoticia(id, { quem: com })).toMatchObject({ estado: "rascunho" });
  });

  it("a Comunicação publica a notícia de outra pessoa, e a Atividade registra quem publicou (CA-US21.5, RN55)", async () => {
    const autora = await pessoaDaEquipe("COM");
    const colega = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(autora, await completa());

    await publicarNoticia({ id, revisaoBase: revisao }, { quem: colega });

    expect((await atividadesDa(id)).at(-1)).toMatchObject({ acao: "noticia.publicar", atorId: colega.id });
  });
});

describe("publicarNoticia: endereço da notícia (P2, E40)", () => {
  it("sem acento e sem pontuação, e com número quando já existe outra com a mesma manchete", async () => {
    const quem = await pessoaDaEquipe("COM");
    const titulo = `Reajuste: ônibus ${Date.now()} já tem acordo!`;
    const esperado = `reajuste-onibus-${titulo.match(/\d+/)![0]}-ja-tem-acordo`;
    const a = await rascunho(quem, await completa({ titulo }));
    const b = await rascunho(quem, await completa({ titulo }));

    expect(await publicarNoticia({ id: a.id, revisaoBase: a.revisao }, { quem })).toMatchObject({ slug: esperado });
    expect(await publicarNoticia({ id: b.id, revisaoBase: b.revisao }, { quem })).toMatchObject({ slug: `${esperado}-2` });
  });
});

describe("notícia publicada: cópia de trabalho (E42, E31)", () => {
  it("o salvamento automático não gera versão e não muda o que está no ar (CA-US21.10)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, await completa({ titulo: "Manchete no ar" }));
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: await completa({ titulo: "Manchete em edição" }) }, edicaoDe(quem));

    const aberta = await carregarNoticia(id, { quem });
    expect(aberta).toMatchObject({ estado: "publicado", versao: 1, revisao: revisao + 1, revisaoPublicada: revisao });
    expect(aberta!.dados.titulo).toBe("Manchete em edição");
    const versoes = await versoesDaNoticia(id, { quem });
    expect(versoes).toHaveLength(1);
    expect(versoes[0]!.dados.titulo).toBe("Manchete no ar");
  });

  it("publicar as alterações gera a versão 2, mantém a data da primeira publicação e o endereço", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, await completa({ titulo: `Primeira manchete ${Date.now()}` }));
    const primeira = await publicarNoticia({ id, revisaoBase: revisao }, { quem });
    const salvo = await salvarRascunhoNoticia(
      { id, revisaoBase: revisao, dados: await completa({ titulo: "Manchete corrigida" }) },
      edicaoDe(quem),
    );
    if (salvo.tipo !== "salvo") throw new Error("esperava salvo");

    const resultado = await publicarNoticia({ id, revisaoBase: salvo.revisao }, { quem });

    expect(resultado).toMatchObject({ tipo: "publicada", versao: 2, revisaoPublicada: salvo.revisao, slug: (primeira as { slug: string }).slug });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ versao: 2, publicadoEm: (primeira as { publicadoEm: Date }).publicadoEm });
    expect((await versoesDaNoticia(id, { quem })).map((v) => [v.versao, v.dados.titulo])).toEqual([
      [2, "Manchete corrigida"],
      [1, expect.stringMatching(/^Primeira manchete/)],
    ]);
    expect((await atividadesDa(id)).at(-1)).toMatchObject({ acao: "noticia.publicar_alteracoes", detalhe: { versao: 2 } });
  });

  it("alteração que tira um obrigatório não vai ao ar, e a versão publicada continua", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, await completa());
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });
    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: await completa({ lide: "" }) }, edicaoDe(quem));

    await expect(publicarNoticia({ id, revisaoBase: revisao + 1 }, { quem })).rejects.toMatchObject({ campos: ["lide"] });
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(1);
  });
});

describe("notícia publicada: uso da Mídia (RN16, E42)", () => {
  it("imagem tirada só da cópia de trabalho continua em uso enquanto está no ar", async () => {
    const quem = await pessoaDaEquipe("COM");
    const capa = await enviarImagem(quem);
    const { id, revisao } = await rascunho(quem, await completa({ capaMidiaId: capa, capaAlt: "Assembleia na sede" }));
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: await completa({ capaMidiaId: null }) }, edicaoDe(quem));
    expect((await usosDasMidias([capa])).get(capa)).toHaveLength(1);

    await publicarNoticia({ id, revisaoBase: revisao + 1 }, { quem });
    expect((await usosDasMidias([capa])).get(capa)).toBeUndefined();
  });
});

describe("descartarAlteracoes (E42)", () => {
  it("volta a cópia de trabalho para a versão no ar, com fontes e anexos, sem gerar versão", async () => {
    const quem = await pessoaDaEquipe("COM");
    const fonte = { tipo: "fonte" as const, titulo: "Lei 13.467", url: "https://www.planalto.gov.br/lei", midiaId: null, visivel: true };
    const { id, revisao } = await rascunho(quem, await completa({ titulo: "Manchete no ar", links: [fonte] }));
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });
    await salvarRascunhoNoticia(
      { id, revisaoBase: revisao, dados: await completa({ titulo: "Manchete mexida", links: [] }) },
      edicaoDe(quem),
    );

    const resultado = await descartarAlteracoes({ id, revisaoBase: revisao + 1 }, { quem });

    expect(resultado).toMatchObject({
      tipo: "descartada",
      noticia: { revisao: revisao + 2, revisaoPublicada: revisao + 2, dados: { titulo: "Manchete no ar", links: [fonte] } },
    });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "publicado", versao: 1, dados: { titulo: "Manchete no ar" } });
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(1);
    expect((await atividadesDa(id)).at(-1)).toMatchObject({ acao: "noticia.descartar_alteracoes", atorId: quem.id, detalhe: { versao: 1 } });
  });

  it("se alguém salvou depois do que a pessoa está vendo, nada é descartado", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, await completa());
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });
    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: await completa({ titulo: "Mexida 1" }) }, edicaoDe(quem));
    await salvarRascunhoNoticia({ id, revisaoBase: revisao + 1, dados: await completa({ titulo: "Mexida 2" }) }, edicaoDe(quem));

    expect(await descartarAlteracoes({ id, revisaoBase: revisao + 1 }, { quem })).toMatchObject({ tipo: "conflito" });
    expect((await carregarNoticia(id, { quem }))!.dados.titulo).toBe("Mexida 2");
  });

  it("rascunho nunca publicado não tem o que descartar; Atendimento não descarta", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunho(quem, await completa());

    await expect(descartarAlteracoes({ id, revisaoBase: revisao }, { quem })).rejects.toMatchObject({ codigo: "invalido" });
    await expect(descartarAlteracoes({ id, revisaoBase: revisao }, { quem: await pessoaDaEquipe("ATD") })).rejects.toBeInstanceOf(
      SemPermissao,
    );
  });
});

describe("alterações não publicadas: compara o conteúdo, não o número de gravações (E47)", () => {
  it("mudar e desfazer: o aviso some, publicar não gera versão e a Atividade fica com uma edição só", async () => {
    const quem = await pessoaDaEquipe("COM");
    const original = await completa({ titulo: "Manchete no ar" });
    const { id, revisao } = await rascunho(quem, original);
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });
    const sessao = edicaoDe(quem);

    const mudou = await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: { ...original, titulo: "Manchete mexida" } }, sessao);
    if (mudou.tipo !== "salvo") throw new Error("esperava salvo");
    expect(temAlteracoesNaoPublicadas((await carregarNoticia(id, { quem }))!)).toBe(true);

    const desfez = await salvarRascunhoNoticia({ id, revisaoBase: mudou.revisao, dados: original }, sessao);

    expect(desfez).toMatchObject({ tipo: "salvo", revisaoPublicada: (desfez as { revisao: number }).revisao });
    expect(temAlteracoesNaoPublicadas((await carregarNoticia(id, { quem }))!)).toBe(false);
    await publicarNoticia({ id, revisaoBase: (desfez as { revisao: number }).revisao }, { quem });
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(1);
    expect((await atividadesDa(id)).map((a) => a.acao)).toEqual(["noticia.criar", "noticia.publicar", "noticia.editar"]);
  });

  it("mudar de verdade continua mostrando o aviso", async () => {
    const quem = await pessoaDaEquipe("COM");
    const original = await completa();
    const { id, revisao } = await rascunho(quem, original);
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    const salvo = await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: { ...original, local: "Vitória da Conquista" } }, edicaoDe(quem));

    expect(salvo).toMatchObject({ tipo: "salvo", revisaoPublicada: revisao });
    expect(temAlteracoesNaoPublicadas((await carregarNoticia(id, { quem }))!)).toBe(true);
  });

  it("salvar sem mudar nada (Ctrl+S) não grava, não sobe a revisão e não vai para a Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const original = await completa();
    const { id, revisao } = await rascunho(quem, original);

    const salvo = await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: original }, edicaoDe(quem));

    expect(salvo).toMatchObject({ tipo: "salvo", revisao });
    expect((await atividadesDa(id)).map((a) => a.acao)).toEqual(["noticia.criar"]);
  });
});
