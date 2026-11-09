import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { categoria, conteudo, pessoaEquipe } from "@/lib/db/schema";
import { SemPermissao, type Perfil, type QuemDaEquipe } from "@/lib/permissoes";

import { noticiaVazia, type DadosNoticia } from "./dados";
import { listarCategorias, listarConteudos } from "./listar";
import { salvarRascunhoNoticia } from "./salvar";

async function pessoa(perfil: Perfil = "COM", nome = `Pessoa ${randomUUID().slice(0, 6)}`): Promise<QuemDaEquipe> {
  const [linha] = await banco()
    .insert(pessoaEquipe)
    .values({ nome, email: `${randomUUID()}@sintravc.local`, perfil, situacao: "ativa" })
    .returning({ id: pessoaEquipe.id });
  return { tipo: "equipe", id: linha!.id, perfil };
}

async function idDaCategoria(nome: string) {
  const [linha] = await banco().select({ id: categoria.id }).from(categoria).where(eq(categoria.nome, nome));
  return linha!.id;
}

async function noticia(quem: QuemDaEquipe, mudancas: Partial<DadosNoticia>) {
  const r = await salvarRascunhoNoticia({ dados: { ...noticiaVazia(), ...mudancas } }, { quem, sessaoEdicao: randomUUID() });
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  return r.id;
}

describe("listarConteudos (RF35)", () => {
  it("mostra manchete, categoria, autor e estado, da alteração mais recente para a mais antiga", async () => {
    const autora = await pessoa("COM", "Mariana Souza");
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
    const autora = await pessoa();
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
    const autora = await pessoa("COM", `Joana Conceição ${marca}`);
    const porManchete = await noticia(autora, { titulo: `Plantão jurídico ${marca}` });
    const porPalavra = await noticia(autora, { titulo: "Outra", palavrasChave: [`saúde-${marca}`] });

    expect((await listarConteudos({ busca: `PLANTAO JURIDICO ${marca}` }, { quem: autora })).itens.map((i) => i.id)).toEqual([porManchete]);
    expect((await listarConteudos({ busca: `saude-${marca}` }, { quem: autora })).itens.map((i) => i.id)).toEqual([porPalavra]);
    expect((await listarConteudos({ busca: `conceicao ${marca}` }, { quem: autora })).total).toBe(2);
  });

  it("não mostra arquivados (eles têm aba própria, #11)", async () => {
    const autora = await pessoa();
    const id = await noticia(autora, { titulo: "Antiga" });
    await banco().update(conteudo).set({ estado: "arquivado" }).where(eq(conteudo.id, id));

    expect((await listarConteudos({ autorId: autora.id }, { quem: autora })).total).toBe(0);
  });

  it("pagina de 20 em 20", async () => {
    const autora = await pessoa();
    for (let i = 0; i < 21; i++) await noticia(autora, { titulo: `N${i}` });

    const primeira = await listarConteudos({ autorId: autora.id, pagina: 1 }, { quem: autora });
    const segunda = await listarConteudos({ autorId: autora.id, pagina: 2 }, { quem: autora });

    expect([primeira.itens.length, segunda.itens.length, segunda.total]).toEqual([20, 1, 21]);
    expect(segunda.itens[0]!.titulo).toBe("N0");
  });

  it("o Atendimento não vê a lista", async () => {
    await expect(listarConteudos({}, { quem: await pessoa("ATD") })).rejects.toBeInstanceOf(SemPermissao);
  });
});

describe("listarCategorias", () => {
  it("a Comunicação vê as categorias de Notícias na ordem, para escolher no editor", async () => {
    const lista = await listarCategorias("noticias", { quem: await pessoa("COM") });
    expect(lista.map((c) => c.nome)).toEqual(["Geral", "Jurídico", "Benefícios", "Esportes", "Rádio Chofer"]);
  });

  it("o Atendimento não vê", async () => {
    await expect(listarCategorias("noticias", { quem: await pessoa("ATD") })).rejects.toBeInstanceOf(SemPermissao);
  });
});
