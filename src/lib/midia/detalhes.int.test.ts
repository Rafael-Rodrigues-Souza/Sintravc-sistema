import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { midia, pessoaEquipe } from "@/lib/db/schema";
import { SemPermissao, type Perfil, type QuemDaEquipe } from "@/lib/permissoes";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem } from "@/testes/arquivos/gerar";

import { salvarDetalhesMidia } from "./detalhes";
import { enviarMidia } from "./enviar";

async function pessoa(perfil: Perfil = "COM"): Promise<QuemDaEquipe> {
  const [linha] = await banco()
    .insert(pessoaEquipe)
    .values({ nome: "Detalhes", email: `${randomUUID()}@sintravc.local`, perfil, situacao: "ativa" })
    .returning({ id: pessoaEquipe.id });
  return { tipo: "equipe", id: linha!.id, perfil };
}

async function arquivo(quem: QuemDaEquipe) {
  const { armazenamento } = armazenamentoEmMemoria();
  return (await enviarMidia({ bytes: await imagem("png"), nome: "assembleia.png" }, { quem, armazenamento })).id;
}

describe("salvarDetalhesMidia (RF48: texto alternativo)", () => {
  it("grava nome, texto alternativo e legenda, sem espaços sobrando; vazio vira nulo", async () => {
    const quem = await pessoa();
    const id = await arquivo(quem);

    await salvarDetalhesMidia(
      id,
      { nomeArquivo: "  assembleia-outubro.png ", alt: " Trabalhadores reunidos em assembleia ", legenda: "   " },
      { quem },
    );

    const [linha] = await banco().select().from(midia).where(eq(midia.id, id));
    expect(linha).toMatchObject({
      nomeArquivo: "assembleia-outubro.png",
      alt: "Trabalhadores reunidos em assembleia",
      legenda: null,
    });
  });

  it.each([
    ["nomeArquivo", { nomeArquivo: " ", alt: "", legenda: "" }, "Informe o nome do arquivo."],
    ["alt", { nomeArquivo: "a.png", alt: "x".repeat(251), legenda: "" }, "Use até 250 caracteres no texto alternativo."],
    ["legenda", { nomeArquivo: "a.png", alt: "", legenda: "x".repeat(301) }, "Use até 300 caracteres na legenda e crédito."],
  ] as const)("recusa %s inválido com a mensagem do campo", async (campo, dados, mensagem) => {
    const quem = await pessoa();
    const id = await arquivo(quem);
    await expect(salvarDetalhesMidia(id, dados, { quem })).rejects.toMatchObject({ codigo: "invalido", campo, message: mensagem });
  });

  it("o perfil Atendimento não edita", async () => {
    const id = await arquivo(await pessoa());
    await expect(
      salvarDetalhesMidia(id, { nomeArquivo: "a.png", alt: "x", legenda: "" }, { quem: await pessoa("ATD") }),
    ).rejects.toBeInstanceOf(SemPermissao);
  });

  it("arquivo que não existe mais", async () => {
    await expect(
      salvarDetalhesMidia(randomUUID(), { nomeArquivo: "a.png", alt: "", legenda: "" }, { quem: await pessoa() }),
    ).rejects.toMatchObject({ codigo: "nao_encontrada" });
  });
});
