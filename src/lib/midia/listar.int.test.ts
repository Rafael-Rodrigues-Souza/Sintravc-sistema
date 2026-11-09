import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { midia, midiaUso, pessoaEquipe } from "@/lib/db/schema";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem, office, pdf } from "@/testes/arquivos/gerar";

import type { QuemDaEquipe } from "@/lib/permissoes";

import { enviarMidia } from "./enviar";
import { contarMidia, detalharMidia, listarMidia } from "./listar";

async function pessoa(): Promise<QuemDaEquipe & { nome: string }> {
  const nome = `Mariana ${randomUUID().slice(0, 6)}`;
  const [linha] = await banco()
    .insert(pessoaEquipe)
    .values({ nome, email: `${randomUUID()}@sintravc.local`, perfil: "COM", situacao: "ativa" })
    .returning({ id: pessoaEquipe.id });
  return { tipo: "equipe", id: linha!.id, perfil: "COM", nome };
}

/** Cria um lote com nomes marcados por `marca`, para a busca não pegar arquivos de outros testes. */
async function lote(marca: string) {
  const quem = await pessoa();
  const { armazenamento } = armazenamentoEmMemoria();
  const enviar = async (bytes: Uint8Array, nome: string) => (await enviarMidia({ bytes, nome }, { quem, armazenamento })).id;
  const foto = await enviar(await imagem("png"), `${marca}-Assembleia Convocação.png`);
  const fotoComAlt = await enviar(await imagem("webp"), `${marca}-frota.webp`);
  await banco().update(midia).set({ alt: "Ônibus da frota municipal" }).where(eq(midia.id, fotoComAlt));
  const edital = await enviar(await pdf(2), `${marca}-edital.pdf`);
  const ata = await enviar(office("docx"), `${marca}-ata.docx`);
  return { quem, foto, fotoComAlt, edital, ata };
}

describe("listarMidia e contarMidia (Figma 116:2727)", () => {
  it("a busca ignora acento e maiúsculas e a ordem é do mais novo para o mais antigo", async () => {
    const marca = `b${randomUUID().slice(0, 8)}`;
    const { foto, fotoComAlt, edital, ata } = await lote(marca);

    const todos = await listarMidia({ busca: marca.toUpperCase() });
    expect(todos.itens.map((i) => i.id)).toEqual([ata, edital, fotoComAlt, foto]);
    expect(todos.total).toBe(4);

    const semAcento = await listarMidia({ busca: `${marca}-assembleia convocacao` });
    expect(semAcento.itens.map((i) => i.id)).toEqual([foto]);
  });

  it.each([
    ["imagens", ["fotoComAlt", "foto"]],
    ["pdfs", ["edital"]],
    ["documentos", ["ata"]],
    ["sem_alt", ["foto"]],
  ] as const)("filtro %s", async (filtro, esperados) => {
    const marca = `f${randomUUID().slice(0, 8)}`;
    const ids = await lote(marca);
    const lista = await listarMidia({ filtro, busca: marca });
    expect(lista.itens.map((i) => i.id)).toEqual(esperados.map((nome) => ids[nome]));
  });

  it("o item traz quem enviou e quantos usos tem", async () => {
    const marca = `u${randomUUID().slice(0, 8)}`;
    const { quem, edital } = await lote(marca);
    await banco().insert(midiaUso).values([
      { midiaId: edital, donoTipo: "noticia", donoId: randomUUID() },
      { midiaId: edital, donoTipo: "documento", donoId: randomUUID() },
    ]);

    const [item] = (await listarMidia({ filtro: "pdfs", busca: marca })).itens;
    expect(item).toMatchObject({ id: edital, tipo: "pdf", paginas: 2, enviadoPor: quem.nome, usos: 2 });

    const detalhe = await detalharMidia(edital);
    expect(detalhe?.usos.map((u) => u.donoTipo)).toEqual(["documento", "noticia"]);
    expect(await detalharMidia(randomUUID())).toBeUndefined();
  });

  it("os contadores das abas sobem com cada envio", async () => {
    const antes = await contarMidia();
    await lote(`c${randomUUID().slice(0, 8)}`);
    const depois = await contarMidia();
    expect({
      todos: depois.todos - antes.todos,
      imagens: depois.imagens - antes.imagens,
      pdfs: depois.pdfs - antes.pdfs,
      documentos: depois.documentos - antes.documentos,
      semAlt: depois.semAlt - antes.semAlt,
    }).toEqual({ todos: 4, imagens: 2, pdfs: 1, documentos: 1, semAlt: 1 });
  });

  it("pagina os resultados", async () => {
    const marca = `p${randomUUID().slice(0, 8)}`;
    const { foto, fotoComAlt, edital, ata } = await lote(marca);
    const primeira = await listarMidia({ busca: marca, porPagina: 3, pagina: 1 });
    const segunda = await listarMidia({ busca: marca, porPagina: 3, pagina: 2 });
    expect(primeira.itens.map((i) => i.id)).toEqual([ata, edital, fotoComAlt]);
    expect(segunda.itens.map((i) => i.id)).toEqual([foto]);
    expect(segunda.total).toBe(4);
  });
});
