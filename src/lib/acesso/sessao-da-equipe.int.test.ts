import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { pessoaEquipe, sessao } from "@/lib/db/schema";

import { confirmarCodigo, entrar } from "./entrar";
import { codigoTotp, cookiesDe, criarPessoaDeTeste } from "./pessoas-de-teste";
import { conferirSessaoDaEquipe, mostrarComoExpirada, sessaoRecusada } from "./sessao-da-equipe";

let contador = 0;

/** Entra de verdade (senha + código) e devolve o cabeçalho Cookie e o id da pessoa. */
async function sessaoNova() {
  contador += 1;
  const p = await criarPessoaDeTeste({
    nome: `Sessão ${contador}`,
    email: `sessao${contador}-${Date.now()}@sintravc.local`,
    perfil: "COM",
    senha: "senha-certa-123",
  });
  const primeira = await entrar({ email: p.email, senha: p.senha });
  if (primeira.tipo !== "precisa_codigo") throw new Error(`login: ${primeira.tipo}`);
  const final = await confirmarCodigo(
    { codigo: await codigoTotp(p.segredoTotp) },
    { cabecalhos: new Headers({ cookie: cookiesDe(primeira.cabecalhos) }) },
  );
  if (final.tipo !== "entrou") throw new Error(`código: ${final.tipo}`);
  return { cookie: cookiesDe(final.cabecalhos), pessoaId: p.id };
}

describe("conferirSessaoDaEquipe (E05)", () => {
  it("sessão vencida conferida por várias requisições ao mesmo tempo: todas mandam para o login como 'expirada'", async () => {
    // Ex.: a pessoa volta depois de 2 h e clica num link enquanto a lateral faz pré-busca das áreas.
    // A primeira requisição apaga a sessão; as outras não podem confundir isso com "pessoa inativa".
    const { cookie, pessoaId } = await sessaoNova();
    await banco()
      .update(sessao)
      .set({ ultimoUso: sql`now() - interval '3 hours'` })
      .where(eq(sessao.pessoaId, pessoaId));

    const respostas = await Promise.all(
      Array.from({ length: 5 }, () => conferirSessaoDaEquipe(new Headers({ cookie }))),
    );

    expect(respostas.map((r) => sessaoRecusada(r) && mostrarComoExpirada(r))).toEqual(Array(5).fill(true));
  });

  it("pessoa desativada continua sendo 'inativa'", async () => {
    const { cookie, pessoaId } = await sessaoNova();
    await banco().update(pessoaEquipe).set({ situacao: "desativada" }).where(eq(pessoaEquipe.id, pessoaId));

    const resposta = await conferirSessaoDaEquipe(new Headers({ cookie }));
    expect(resposta).toMatchObject({ motivo: "inativa" });
    expect(sessaoRecusada(resposta) && mostrarComoExpirada(resposta)).toBe(false);
  });
});
