import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade } from "@/lib/db/schema";

import { registrarAtividade } from ".";

const exemplo = {
  ator: { tipo: "sistema" as const },
  acao: "teste.registrar",
  area: "teste",
  alvo: { tipo: "teste", id: "1", rotulo: "Registro de teste" },
};

async function registrarUm(acao: string) {
  return banco().transaction((tx) => registrarAtividade(tx, { ...exemplo, acao }));
}

/** O Drizzle embrulha o erro do Postgres; a mensagem do trigger fica em `cause`. */
async function erroDoBanco(consulta: Promise<unknown>): Promise<string> {
  try {
    await consulta;
  } catch (erro) {
    const causa = erro instanceof Error && erro.cause instanceof Error ? erro.cause : erro;
    return causa instanceof Error ? causa.message : String(causa);
  }
  throw new Error("a consulta deveria ter falhado");
}

async function buscarPorAcao(acao: string) {
  return banco().select().from(atividade).where(eq(atividade.acao, acao));
}

describe("registrarAtividade", () => {
  it("grava o registro com ator, ação, área, alvo, detalhe e motivo", async () => {
    await banco().transaction((tx) =>
      registrarAtividade(tx, {
        ator: { tipo: "pessoa", id: "0190f0c4-0000-7000-8000-000000000001" },
        acao: "noticia.ocultar",
        area: "conteudos",
        alvo: { tipo: "noticia", id: "alvo-do-teste-de-registro", rotulo: "Assembleia geral" },
        detalhe: { de: "publicado", para: "oculto" },
        motivo: "Informação errada",
      }),
    );

    // Pelo alvo, que é só deste teste: outros arquivos também registram "noticia.ocultar" no mesmo banco.
    const [registro] = await banco().select().from(atividade).where(eq(atividade.alvoId, "alvo-do-teste-de-registro"));
    expect(registro).toMatchObject({
      atorTipo: "pessoa",
      atorId: "0190f0c4-0000-7000-8000-000000000001",
      area: "conteudos",
      alvoTipo: "noticia",
      alvoId: "alvo-do-teste-de-registro",
      alvoRotulo: "Assembleia geral",
      detalhe: { de: "publicado", para: "oculto" },
      motivo: "Informação errada",
    });
    expect(registro?.quando).toBeInstanceOf(Date);
  });

  it("não grava nada se a ação falhar depois, na mesma transação", async () => {
    const acao = "teste.acao-que-falha";

    await expect(
      banco().transaction(async (tx) => {
        await registrarAtividade(tx, { ...exemplo, acao });
        throw new Error("a ação falhou");
      }),
    ).rejects.toThrow("a ação falhou");

    expect(await buscarPorAcao(acao)).toHaveLength(0);
  });
});

describe("Atividade é só inserção (RN18)", () => {
  it("recusa UPDATE por SQL direto", async () => {
    await registrarUm("teste.update");
    expect(await erroDoBanco(banco().execute(sql`UPDATE atividade SET motivo = 'alterado' WHERE acao = 'teste.update'`))).toMatch(/só inserção/);
    const [registro] = await buscarPorAcao("teste.update");
    expect(registro?.motivo).toBeNull();
  });

  it("recusa DELETE por SQL direto", async () => {
    await registrarUm("teste.delete");
    expect(await erroDoBanco(banco().execute(sql`DELETE FROM atividade WHERE acao = 'teste.delete'`))).toMatch(/só inserção/);
    expect(await buscarPorAcao("teste.delete")).toHaveLength(1);
  });

  it("recusa TRUNCATE", async () => {
    await registrarUm("teste.truncate");
    expect(await erroDoBanco(banco().execute(sql`TRUNCATE atividade`))).toMatch(/só inserção/);
    expect(await buscarPorAcao("teste.truncate")).toHaveLength(1);
  });
});
