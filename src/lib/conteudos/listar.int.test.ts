import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { categoria, conteudo } from "@/lib/db/schema";
import { SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";
import { publicarDocumento } from "@/lib/documentos/publicar";
import { salvarRascunhoDocumento } from "@/lib/documentos/salvar";
import { documentoCompleto, documentoSalvo, edicaoDoDocumento } from "@/testes/documentos";
import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";

import { noticiaVazia, type DadosNoticia } from "./dados";
import { listarCategorias, listarConteudos } from "./listar";
import { salvarRascunhoNoticia } from "./salvar";


async function idDaCategoria(nome: string) {
  const [linha] = await banco().select({ id: categoria.id }).from(categoria).where(eq(categoria.nome, nome));
  return linha!.id;
}

async function noticia(quem: QuemDaEquipe, mudancas: Partial<DadosNoticia>) {
  const r = await salvarRascunhoNoticia({ dados: { ...noticiaVazia(), ...mudancas } }, edicaoDe(quem));
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  return r.id;
}

describe("listarConteudos (RF35)", () => {
  it("mostra manchete, categoria, autor e estado, da alteração mais recente para a mais antiga", async () => {
    const autora = await pessoaDaEquipe("COM", "Mariana Souza");
    const juridico = await idDaCategoria("Jurídico");
    const primeira = await noticia(autora, { titulo: "Primeira", categoriaId: juridico });
    const segunda = await noticia(autora, { titulo: "" });

    const { itens, total } = await listarConteudos({ autorId: autora.id }, { quem: autora });

    expect(total).toBe(2);
    expect(itens).toEqual([
      expect.objectContaining({ id: segunda, titulo: "", tipo: "noticia", estado: "rascunho", categoria: null, autorNome: "Mariana Souza" }),
      expect.objectContaining({ id: primeira, titulo: "Primeira", categoria: { nome: "Jurídico", cor: "marinho" } }),
    ]);
  });

  it("filtra por categoria e por estado", async () => {
    const autora = await pessoaDaEquipe();
    const esportes = await idDaCategoria("Esportes");
    const comCategoria = await noticia(autora, { titulo: "Copa", categoriaId: esportes });
    await noticia(autora, { titulo: "Sem categoria" });

    const porCategoria = await listarConteudos({ autorId: autora.id, categoriaId: esportes }, { quem: autora });
    expect(porCategoria.itens.map((i) => i.id)).toEqual([comCategoria]);

    expect((await listarConteudos({ autorId: autora.id, estado: "rascunho" }, { quem: autora })).total).toBe(2);
    expect((await listarConteudos({ autorId: autora.id, estado: "publicado" }, { quem: autora })).total).toBe(0);
  });

  it("busca na manchete, no nome do autor e nas palavras-chave, sem diferenciar acento e maiúscula", async () => {
    const marca = randomUUID().slice(0, 8);
    const autora = await pessoaDaEquipe("COM", `Joana Conceição ${marca}`);
    const porManchete = await noticia(autora, { titulo: `Plantão jurídico ${marca}` });
    const porPalavra = await noticia(autora, { titulo: "Outra", palavrasChave: [`saúde-${marca}`] });

    expect((await listarConteudos({ busca: `PLANTAO JURIDICO ${marca}` }, { quem: autora })).itens.map((i) => i.id)).toEqual([porManchete]);
    expect((await listarConteudos({ busca: `saude-${marca}` }, { quem: autora })).itens.map((i) => i.id)).toEqual([porPalavra]);
    expect((await listarConteudos({ busca: `conceicao ${marca}` }, { quem: autora })).total).toBe(2);
  });

  it("não mostra arquivados (eles têm aba própria, #11)", async () => {
    const autora = await pessoaDaEquipe();
    const id = await noticia(autora, { titulo: "Antiga" });
    await banco().update(conteudo).set({ estado: "arquivado" }).where(eq(conteudo.id, id));

    expect((await listarConteudos({ autorId: autora.id }, { quem: autora })).total).toBe(0);
  });

  it("pagina de 20 em 20", async () => {
    const autora = await pessoaDaEquipe();
    for (let i = 0; i < 21; i++) await noticia(autora, { titulo: `N${i}` });

    const primeira = await listarConteudos({ autorId: autora.id, pagina: 1 }, { quem: autora });
    const segunda = await listarConteudos({ autorId: autora.id, pagina: 2 }, { quem: autora });

    expect([primeira.itens.length, segunda.itens.length, segunda.total]).toEqual([20, 1, 21]);
    expect(segunda.itens[0]!.titulo).toBe("N0");
  });

  it("o Atendimento não vê a lista", async () => {
    await expect(listarConteudos({}, { quem: await pessoaDaEquipe("ATD") })).rejects.toBeInstanceOf(SemPermissao);
  });
});

describe("listarConteudos: documentos oficiais (RF35, RF42, E46)", () => {
  it("a Comunicação vê editais e acordos na lista, com as datas da versão no ar para o selo (E46)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const com = await pessoaDaEquipe("COM");
    const dados = await documentoCompleto("acordo", adm, { titulo: `Acordo ${randomUUID()}` });
    const salvo = await documentoSalvo(adm, "acordo", dados);
    const rascunho = await listarConteudos({ tipo: "acordo", busca: dados.titulo }, { quem: com });
    expect(rascunho.itens).toEqual([expect.objectContaining({ id: salvo.id, tipo: "acordo", datasNoAr: null })]);

    await publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
    // A cópia de trabalho muda as datas, mas o site (e o selo da lista) continua com as publicadas.
    await salvarRascunhoDocumento(
      { id: salvo.id, tipo: "acordo", revisaoBase: 1, dados: { ...dados, vigenciaInicio: "2025-05-01", vigenciaFim: "2026-04-30" } },
      edicaoDoDocumento(adm),
    );

    const { itens } = await listarConteudos({ tipo: "acordo", busca: dados.titulo }, { quem: com });
    expect(itens).toEqual([
      expect.objectContaining({
        id: salvo.id,
        datasNoAr: { eventoData: "", eventoHora: "", temVigencia: true, vigenciaInicio: "2026-05-01", vigenciaFim: "2027-04-30" },
      }),
    ]);
  });

  it("a busca também acha pelo número do documento", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const dados = await documentoCompleto("edital", adm);
    const salvo = await documentoSalvo(adm, "edital", dados);
    const { itens } = await listarConteudos({ busca: dados.numero.toUpperCase() }, { quem: adm });
    expect(itens.map((i) => i.id)).toEqual([salvo.id]);
  });
});

describe("listarCategorias", () => {
  it("a Comunicação vê as categorias de Notícias na ordem, para escolher no editor", async () => {
    const lista = await listarCategorias(["noticias"], { quem: await pessoaDaEquipe("COM") });
    expect(lista.map((c) => c.nome)).toEqual(["Geral", "Jurídico", "Benefícios", "Esportes", "Rádio Chofer"]);
  });

  it("o Atendimento não vê", async () => {
    await expect(listarCategorias(["noticias"], { quem: await pessoaDaEquipe("ATD") })).rejects.toBeInstanceOf(SemPermissao);
  });

  it("o filtro da lista mostra as de Notícias e as de Documentos", async () => {
    const lista = await listarCategorias(["noticias", "documentos"], { quem: await pessoaDaEquipe("COM") });
    expect(lista.map((c) => c.nome)).toEqual([
      "Geral",
      "Jurídico",
      "Benefícios",
      "Esportes",
      "Rádio Chofer",
      "Assembleias",
      "Acordos e convenções",
    ]);
  });
});
