import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, categoria } from "@/lib/db/schema";
import { SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";

import { usosDasMidias } from "@/lib/midia/usos";
import { enviarMidia } from "@/lib/midia/enviar";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem } from "@/testes/arquivos/gerar";
import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";

import { carregarNoticia } from "./carregar";
import { noticiaVazia, type DadosNoticia } from "./dados";
import { salvarRascunhoNoticia } from "./salvar";


function dados(mudancas: Partial<DadosNoticia> = {}): DadosNoticia {
  return { ...noticiaVazia(), ...mudancas };
}

describe("salvarRascunhoNoticia: criar (RF38, CA-US21.1)", () => {
  it("cria a notícia como rascunho no primeiro salvamento, e ela volta igual ao abrir", async () => {
    const quem = await pessoaDaEquipe();

    const resultado = await salvarRascunhoNoticia(
      { dados: dados({ titulo: "Plantão jurídico em novo horário", lide: "A partir de segunda." }) },
      edicaoDe(quem),
    );

    expect(resultado).toMatchObject({ tipo: "salvo", revisao: 1 });
    if (resultado.tipo !== "salvo") throw new Error("esperava salvo");
    const aberta = await carregarNoticia(resultado.id, { quem });
    expect(aberta).toMatchObject({
      estado: "rascunho",
      revisao: 1,
      autorId: quem.id,
      dados: { titulo: "Plantão jurídico em novo horário", lide: "A partir de segunda.", linhaFina: "" },
    });
  });
});

async function criar(quem: QuemDaEquipe, mudancas: Partial<DadosNoticia> = {}) {
  const r = await salvarRascunhoNoticia({ dados: dados(mudancas) }, edicaoDe(quem));
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  return r;
}

describe("salvarRascunhoNoticia: atualizar", () => {
  it("salvar de novo sobre a revisão atual grava o texto novo e sobe a revisão", async () => {
    const quem = await pessoaDaEquipe();
    const { id } = await criar(quem, { titulo: "Primeira manchete" });

    const resultado = await salvarRascunhoNoticia(
      { id, revisaoBase: 1, dados: dados({ titulo: "Manchete corrigida", palavrasChave: ["direitos", "jurídico"] }) },
      edicaoDe(quem),
    );

    expect(resultado).toMatchObject({ tipo: "salvo", id, revisao: 2 });
    const aberta = await carregarNoticia(id, { quem });
    expect(aberta).toMatchObject({ revisao: 2, dados: { titulo: "Manchete corrigida", palavrasChave: ["direitos", "jurídico"] } });
  });
});

describe("salvarRascunhoNoticia: conflito de versões (E02, N4)", () => {
  it("quem salva sobre uma revisão antiga não sobrescreve: recebe a versão do servidor, de quem e quando", async () => {
    const ana = await pessoaDaEquipe("COM", "Ana Lima");
    const carlos = await pessoaDaEquipe("COM", "Carlos Ribeiro");
    const { id } = await criar(ana, { titulo: "Original" });
    await salvarRascunhoNoticia(
      { id, revisaoBase: 1, dados: dados({ titulo: "Versão do Carlos" }) },
      edicaoDe(carlos),
    );

    const resultado = await salvarRascunhoNoticia(
      { id, revisaoBase: 1, dados: dados({ titulo: "Versão da Ana, feita sem internet" }) },
      edicaoDe(ana),
    );

    expect(resultado).toMatchObject({
      tipo: "conflito",
      servidor: { revisao: 2, salvoPorNome: "Carlos Ribeiro", dados: { titulo: "Versão do Carlos" } },
    });
    expect(await carregarNoticia(id, { quem: ana })).toMatchObject({ revisao: 2, dados: { titulo: "Versão do Carlos" } });
  });
});

describe("salvarRascunhoNoticia: quem pode (spec §4, RN55, E08)", () => {
  it("o Administrador geral e a Comunicação editam a notícia de outro autor", async () => {
    const autora = await pessoaDaEquipe("COM");
    const { id } = await criar(autora, { titulo: "Da autora" });

    const daAdm = await salvarRascunhoNoticia(
      { id, revisaoBase: 1, dados: dados({ titulo: "Ajuste da ADM" }) },
      edicaoDe(await pessoaDaEquipe("ADM")),
    );
    const deOutraCom = await salvarRascunhoNoticia(
      { id, revisaoBase: 2, dados: dados({ titulo: "Ajuste de outra pessoa da COM" }) },
      edicaoDe(await pessoaDaEquipe("COM")),
    );

    expect([daAdm.tipo, deOutraCom.tipo]).toEqual(["salvo", "salvo"]);
  });

  it("o Atendimento não cria nem edita notícia", async () => {
    const atd = await pessoaDaEquipe("ATD");
    const { id } = await criar(await pessoaDaEquipe("COM"));

    await expect(
      salvarRascunhoNoticia({ dados: dados() }, edicaoDe(atd)),
    ).rejects.toBeInstanceOf(SemPermissao);
    await expect(
      salvarRascunhoNoticia({ id, revisaoBase: 1, dados: dados() }, edicaoDe(atd)),
    ).rejects.toBeInstanceOf(SemPermissao);
  });

  it("notícia que não existe mais: erro claro, sem criar outra", async () => {
    await expect(
      salvarRascunhoNoticia(
        { id: randomUUID(), revisaoBase: 1, dados: dados() },
        edicaoDe(await pessoaDaEquipe("COM")),
      ),
    ).rejects.toMatchObject({ codigo: "nao_encontrada" });
  });
});

async function idDaCategoria(nome: string) {
  const [linha] = await banco().select({ id: categoria.id }).from(categoria).where(eq(categoria.nome, nome));
  return linha!.id;
}

describe("salvarRascunhoNoticia: o que o servidor recusa", () => {
  it.each([
    ["titulo", { titulo: "x".repeat(111) }, "A manchete pode ter até 110 caracteres."],
    ["linhaFina", { linhaFina: "x".repeat(201) }, "A linha fina pode ter até 200 caracteres."],
  ] as const)("recusa %s acima do limite, com a mensagem do campo", async (campo, mudancas, mensagem) => {
    await expect(
      salvarRascunhoNoticia({ dados: dados(mudancas) }, edicaoDe(await pessoaDaEquipe())),
    ).rejects.toMatchObject({ codigo: "invalido", campo, message: mensagem });
  });

  it("aceita exatamente 110 e 200 caracteres, e campos vazios no rascunho (E40)", async () => {
    const r = await salvarRascunhoNoticia(
      { dados: dados({ titulo: "x".repeat(110), linhaFina: "y".repeat(200) }) },
      edicaoDe(await pessoaDaEquipe()),
    );
    expect(r.tipo).toBe("salvo");
  });

  it("aceita categoria de Notícias e recusa categoria só de Documentos", async () => {
    const quem = await pessoaDaEquipe();
    const ok = await salvarRascunhoNoticia(
      { dados: dados({ categoriaId: await idDaCategoria("Jurídico") }) },
      edicaoDe(quem),
    );
    expect(ok.tipo).toBe("salvo");

    await expect(
      salvarRascunhoNoticia(
        { dados: dados({ categoriaId: await idDaCategoria("Assembleias") }) },
        edicaoDe(quem),
      ),
    ).rejects.toMatchObject({ codigo: "invalido", campo: "categoriaId" });
  });
});

async function arquivo(quem: QuemDaEquipe, nome = "foto.png") {
  const { armazenamento } = armazenamentoEmMemoria();
  return (await enviarMidia({ bytes: await imagem("png"), nome }, { quem, armazenamento })).id;
}

describe("salvarRascunhoNoticia: fontes, anexos e uso da Mídia (RN16)", () => {
  it("grava fontes e anexos na ordem da tela", async () => {
    const quem = await pessoaDaEquipe();
    const pdf = await arquivo(quem, "orientacoes.png");
    const links = [
      { tipo: "fonte", titulo: "Lei nº 13.467/2017", url: "https://www.planalto.gov.br/lei", midiaId: null, visivel: true },
      { tipo: "anexo", titulo: "Orientações do plantão", url: null, midiaId: pdf, visivel: false },
    ] as const;

    const { id } = await criar(quem, { links: [...links] });

    expect((await carregarNoticia(id, { quem }))!.dados.links).toEqual(links);
  });

  it("a capa e os anexos aparecem em 'Usado em' com a manchete, e saem quando deixam de ser usados", async () => {
    const quem = await pessoaDaEquipe();
    const capa = await arquivo(quem);
    const anexo = await arquivo(quem);
    const { id } = await criar(quem, {
      titulo: "Assembleia geral",
      capaMidiaId: capa,
      links: [{ tipo: "anexo", titulo: "Pauta", url: null, midiaId: anexo, visivel: true }],
    });

    const usos = await usosDasMidias([capa, anexo]);
    expect(usos.get(capa)).toEqual([
      { donoTipo: "noticia", donoId: id, rotulo: "Assembleia geral", href: `/painel/conteudos/noticia/${id}` },
    ]);
    expect(usos.get(anexo)).toHaveLength(1);

    await salvarRascunhoNoticia(
      { id, revisaoBase: 1, dados: dados({ titulo: "Assembleia geral", capaMidiaId: null }) },
      edicaoDe(quem),
    );

    const depois = await usosDasMidias([capa, anexo]);
    expect(depois.get(capa)).toBeUndefined();
    expect(depois.get(anexo)).toBeUndefined();
  });
});

async function atividadesDa(id: string) {
  return banco()
    .select({ acao: atividade.acao, atorId: atividade.atorId, alvoRotulo: atividade.alvoRotulo })
    .from(atividade)
    .where(eq(atividade.alvoId, id))
    .orderBy(atividade.id);
}

describe("salvarRascunhoNoticia: Atividade (E40, CA-US21.5)", () => {
  it("registra a criação, e a edição uma vez por sessão do editor, com quem editou", async () => {
    const autora = await pessoaDaEquipe("COM");
    const colega = await pessoaDaEquipe("COM");
    const sessaoDaAutora = randomUUID();
    const r = await salvarRascunhoNoticia({ dados: dados({ titulo: "Plantão" }) }, edicaoDe(autora, sessaoDaAutora));
    if (r.tipo !== "salvo") throw new Error("esperava salvo");
    const { id } = r;

    // A autora continua digitando na mesma sessão: o salvamento automático não repete a Atividade.
    await salvarRascunhoNoticia({ id, revisaoBase: 1, dados: dados({ titulo: "Plantão jurídico" }) }, edicaoDe(autora, sessaoDaAutora));
    // A colega abre o editor e salva duas vezes.
    const sessaoDaColega = randomUUID();
    await salvarRascunhoNoticia({ id, revisaoBase: 2, dados: dados({ titulo: "Plantão jurídico novo" }) }, edicaoDe(colega, sessaoDaColega));
    await salvarRascunhoNoticia({ id, revisaoBase: 3, dados: dados({ titulo: "Plantão jurídico em novo horário" }) }, edicaoDe(colega, sessaoDaColega));

    expect(await atividadesDa(id)).toEqual([
      { acao: "noticia.criar", atorId: autora.id, alvoRotulo: "Plantão" },
      { acao: "noticia.editar", atorId: colega.id, alvoRotulo: "Plantão jurídico novo" },
    ]);
  });

  it("um conflito não grava nada, nem na Atividade", async () => {
    const autora = await pessoaDaEquipe("COM");
    const { id } = await criar(autora);
    await salvarRascunhoNoticia({ id, revisaoBase: 1, dados: dados() }, edicaoDe(autora));
    const antes = await atividadesDa(id);

    const r = await salvarRascunhoNoticia({ id, revisaoBase: 1, dados: dados() }, edicaoDe(await pessoaDaEquipe()));

    expect(r.tipo).toBe("conflito");
    expect(await atividadesDa(id)).toEqual(antes);
  });
});

describe("salvarRascunhoNoticia: corpo rico (RF37)", () => {
  it("grava o corpo limpo, e as imagens do corpo contam como uso da Mídia", async () => {
    const quem = await pessoaDaEquipe();
    const foto = await arquivo(quem);
    const corpo = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Texto", marks: [{ type: "strike" }] }] },
        { type: "image", attrs: { midiaId: foto, src: "https://arquivos.sintravc.org.br/x.png", alt: "Ônibus", title: "Foto" } },
      ],
    };

    const { id } = await criar(quem, { corpo });

    expect((await carregarNoticia(id, { quem }))!.dados.corpo).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Texto" }] },
        {
          type: "image",
          attrs: { midiaId: foto, src: expect.stringMatching(/^https:\/\/arquivos\.teste\/midia\//), alt: "Ônibus", title: "Foto" },
        },
      ],
    });
    expect((await usosDasMidias([foto])).get(foto)).toHaveLength(1);
  });

  it("o endereço da imagem vem da Mídia, não do que a tela mandou (sem imagem de outro site)", async () => {
    const quem = await pessoaDaEquipe();
    const foto = await arquivo(quem);
    const corpo = {
      type: "doc" as const,
      content: [{ type: "image", attrs: { midiaId: foto, src: "https://rastreador.example/pixel.gif", alt: "", title: "" } }],
    };

    const { id } = await criar(quem, { corpo });

    const [imagem] = (await carregarNoticia(id, { quem }))!.dados.corpo.content as { attrs: { src: string } }[];
    expect(imagem!.attrs.src).not.toContain("rastreador.example");
    expect(imagem!.attrs.src).toMatch(/\/midia\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
  });

  it("recusa corpo grande demais", async () => {
    const paragrafo = { type: "paragraph", content: [{ type: "text", text: "x".repeat(1000) }] };
    const corpo = { type: "doc" as const, content: Array.from({ length: 300 }, () => paragrafo) };
    await expect(
      salvarRascunhoNoticia({ dados: dados({ corpo }) }, edicaoDe(await pessoaDaEquipe())),
    ).rejects.toMatchObject({ codigo: "invalido", campo: "corpo" });
  });

  it("recusa imagem no corpo de um arquivo que não está na Mídia", async () => {
    const corpo = {
      type: "doc" as const,
      content: [{ type: "image", attrs: { midiaId: randomUUID(), src: "https://x/y.png", alt: "", title: "" } }],
    };
    await expect(
      salvarRascunhoNoticia({ dados: dados({ corpo }) }, edicaoDe(await pessoaDaEquipe())),
    ).rejects.toMatchObject({ codigo: "invalido", campo: "midia" });
  });
});
