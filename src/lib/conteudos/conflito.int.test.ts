import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, pessoaEquipe } from "@/lib/db/schema";
import { SemPermissao, type Perfil, type QuemDaEquipe } from "@/lib/permissoes";

import { carregarNoticia } from "./carregar";
import { resolverConflitoNoticia } from "./conflito";
import { noticiaVazia, type DadosNoticia } from "./dados";
import { salvarRascunhoNoticia } from "./salvar";

async function pessoa(perfil: Perfil = "COM"): Promise<QuemDaEquipe> {
  const [linha] = await banco()
    .insert(pessoaEquipe)
    .values({ nome: "Conflito", email: `${randomUUID()}@sintravc.local`, perfil, situacao: "ativa" })
    .returning({ id: pessoaEquipe.id });
  return { tipo: "equipe", id: linha!.id, perfil };
}

const dados = (titulo: string): DadosNoticia => ({ ...noticiaVazia(), titulo });

/** Cria a notícia e faz outra pessoa salvar por cima: o servidor fica na revisão 2. */
async function noticiaComConflito() {
  const ana = await pessoa();
  const carlos = await pessoa();
  const r = await salvarRascunhoNoticia({ dados: dados("Original") }, { quem: ana, sessaoEdicao: randomUUID() });
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  await salvarRascunhoNoticia({ id: r.id, revisaoBase: 1, dados: dados("Do Carlos") }, { quem: carlos, sessaoEdicao: randomUUID() });
  return { id: r.id, ana };
}

async function escolhasRegistradas(id: string) {
  return banco()
    .select({ atorId: atividade.atorId, detalhe: atividade.detalhe })
    .from(atividade)
    .where(eq(atividade.alvoId, id))
    .orderBy(atividade.id)
    .then((linhas) => linhas.filter((l) => l.detalhe.escolha !== undefined));
}

describe("resolverConflitoNoticia (E02, N4)", () => {
  it("'Manter a minha versão' grava a versão do aparelho por cima e registra a escolha", async () => {
    const { id, ana } = await noticiaComConflito();

    const r = await resolverConflitoNoticia(
      { id, escolha: "minha", revisaoServidor: 2, dados: dados("Da Ana, sem internet") },
      { quem: ana, sessaoEdicao: randomUUID() },
    );

    expect(r).toMatchObject({ tipo: "salvo", revisao: 3 });
    expect(await carregarNoticia(id, { quem: ana })).toMatchObject({ revisao: 3, dados: { titulo: "Da Ana, sem internet" } });
    expect(await escolhasRegistradas(id)).toEqual([{ atorId: ana.id, detalhe: { escolha: "minha", sessao: expect.any(String) } }]);
  });

  it("'Usar a versão do servidor' não muda a notícia e registra a escolha", async () => {
    const { id, ana } = await noticiaComConflito();

    const r = await resolverConflitoNoticia(
      { id, escolha: "servidor", revisaoServidor: 2, dados: dados("Da Ana, descartada") },
      { quem: ana, sessaoEdicao: randomUUID() },
    );

    expect(r).toMatchObject({ tipo: "salvo", revisao: 2 });
    expect(await carregarNoticia(id, { quem: ana })).toMatchObject({ revisao: 2, dados: { titulo: "Do Carlos" } });
    expect(await escolhasRegistradas(id)).toEqual([{ atorId: ana.id, detalhe: { escolha: "servidor", sessao: expect.any(String) } }]);
  });

  it("se alguém salvou de novo enquanto a pessoa escolhia, devolve o conflito com a versão mais nova", async () => {
    const { id, ana } = await noticiaComConflito();
    await salvarRascunhoNoticia({ id, revisaoBase: 2, dados: dados("Mais nova") }, { quem: await pessoa(), sessaoEdicao: randomUUID() });

    const r = await resolverConflitoNoticia(
      { id, escolha: "minha", revisaoServidor: 2, dados: dados("Da Ana") },
      { quem: ana, sessaoEdicao: randomUUID() },
    );

    expect(r).toMatchObject({ tipo: "conflito", servidor: { revisao: 3, dados: { titulo: "Mais nova" } } });
    expect(await escolhasRegistradas(id)).toEqual([]);
  });

  it("o Atendimento não resolve conflito", async () => {
    const { id } = await noticiaComConflito();
    await expect(
      resolverConflitoNoticia(
        { id, escolha: "minha", revisaoServidor: 2, dados: dados("x") },
        { quem: await pessoa("ATD"), sessaoEdicao: randomUUID() },
      ),
    ).rejects.toBeInstanceOf(SemPermissao);
  });
});
