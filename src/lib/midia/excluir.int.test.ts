import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, midia, midiaUso, pessoaEquipe } from "@/lib/db/schema";
import { SemPermissao, type Perfil, type QuemDaEquipe } from "@/lib/permissoes";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem } from "@/testes/arquivos/gerar";

import { enviarMidia } from "./enviar";
import { ErroMidia } from "./erros";
import { excluirMidia } from "./excluir";

let contador = 0;

async function pessoa(perfil: Perfil = "COM"): Promise<QuemDaEquipe> {
  contador += 1;
  const [linha] = await banco()
    .insert(pessoaEquipe)
    .values({ nome: `Excluir ${contador}`, email: `excluir${contador}-${Date.now()}@sintravc.local`, perfil, situacao: "ativa" })
    .returning({ id: pessoaEquipe.id });
  return { tipo: "equipe", id: linha!.id, perfil };
}

async function arquivoNaMidia(quem: QuemDaEquipe, nome = "copa-rodoviarios.jpg") {
  const s3 = armazenamentoEmMemoria();
  const { id } = await enviarMidia({ bytes: await imagem("webp"), nome }, { quem, armazenamento: s3.armazenamento });
  const [linha] = await banco().select().from(midia).where(eq(midia.id, id));
  return { id, chave: linha!.chaveR2, ...s3 };
}

async function atividadesDeExcluir(id: string) {
  return banco()
    .select()
    .from(atividade)
    .where(and(eq(atividade.alvoId, id), eq(atividade.acao, "midia.excluir")))
    .orderBy(atividade.id);
}

describe("excluirMidia (RF49, RN16)", () => {
  it("CA-US27.2: arquivo em uso numa notícia não é excluído, e o erro diz onde ele é usado", async () => {
    const quem = await pessoa("ADM");
    const { id, chave, armazenamento, objetos } = await arquivoNaMidia(quem);
    const noticiaId = randomUUID();
    await banco().insert(midiaUso).values({ midiaId: id, donoTipo: "noticia", donoId: noticiaId });

    const erro = await excluirMidia(id, { quem, armazenamento }).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroMidia);
    expect(erro).toMatchObject({
      codigo: "em_uso",
      message: "Não é possível excluir: o arquivo está em uso em 1 conteúdo. Tire o arquivo desses conteúdos e tente de novo.",
      usos: [expect.objectContaining({ donoTipo: "noticia", donoId: noticiaId, rotulo: expect.any(String) })],
    });
    expect(await banco().select().from(midia).where(eq(midia.id, id))).toHaveLength(1);
    expect(objetos.has(chave)).toBe(true);
    expect(await atividadesDeExcluir(id)).toHaveLength(0);
  });

  it("arquivo sem uso: apaga do banco e do S3, com a Atividade", async () => {
    const quem = await pessoa("COM");
    const { id, chave, armazenamento, objetos } = await arquivoNaMidia(quem, "copa-rodoviarios.webp");

    await excluirMidia(id, { quem, armazenamento });

    expect(await banco().select().from(midia).where(eq(midia.id, id))).toHaveLength(0);
    expect(objetos.has(chave)).toBe(false);
    const registros = await atividadesDeExcluir(id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      atorTipo: "pessoa",
      atorId: quem.id,
      area: "midia",
      alvoTipo: "midia",
      alvoRotulo: "copa-rodoviarios.webp",
    });
  });

  it("se o S3 falhar ao apagar, a exclusão no banco vale (o objeto fica órfão no bucket versionado)", async () => {
    const quem = await pessoa();
    const { id } = await arquivoNaMidia(quem);
    const { armazenamento } = armazenamentoEmMemoria({ falharAoApagar: true });

    await excluirMidia(id, { quem, armazenamento });

    expect(await banco().select().from(midia).where(eq(midia.id, id))).toHaveLength(0);
    expect(await atividadesDeExcluir(id)).toHaveLength(1);
  });

  it("o perfil Atendimento não exclui", async () => {
    const dono = await pessoa();
    const { id, armazenamento } = await arquivoNaMidia(dono);

    await expect(excluirMidia(id, { quem: await pessoa("ATD"), armazenamento })).rejects.toBeInstanceOf(SemPermissao);
    expect(await banco().select().from(midia).where(eq(midia.id, id))).toHaveLength(1);
  });

  it("arquivo que não existe mais", async () => {
    const quem = await pessoa();
    await expect(excluirMidia(randomUUID(), { quem })).rejects.toMatchObject({ codigo: "nao_encontrada" });
  });
});
