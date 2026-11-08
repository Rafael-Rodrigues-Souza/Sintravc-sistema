import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { parametro, pessoaEquipe } from "@/lib/db/schema";
import { limparCacheParametros } from "@/lib/parametros";

import { auth } from "./auth";
import { registrarSenha, senhaJaUsada } from "./senha-anterior";

// RN47: a senha nova não pode repetir as 3 últimas (equipe.senhas_anteriores_bloqueadas).
let contador = 0;

async function novaPessoa() {
  contador += 1;
  const [pessoa] = await banco()
    .insert(pessoaEquipe)
    .values({ nome: `Senha ${contador}`, email: `senha${contador}-${Date.now()}@sintravc.local`, perfil: "COM" })
    .returning({ id: pessoaEquipe.id });
  return pessoa!.id;
}

async function trocarPara(pessoaId: string, senha: string) {
  const hash = await (await auth().$context).password.hash(senha);
  await banco().transaction((tx) => registrarSenha(tx, pessoaId, hash));
}

async function mudarParametro(valor: number) {
  await banco().update(parametro).set({ valor }).where(eq(parametro.chave, "equipe.senhas_anteriores_bloqueadas"));
  limparCacheParametros();
}

afterEach(async () => {
  await mudarParametro(3);
});

describe("senhas anteriores (RN47)", () => {
  it("quem nunca teve senha pode usar qualquer uma", async () => {
    const id = await novaPessoa();
    expect(await senhaJaUsada(id, "onibus2026")).toBe(false);
  });

  it("bloqueia as 3 últimas senhas e libera a 4ª mais antiga", async () => {
    const id = await novaPessoa();
    for (const senha of ["primeira01", "segunda002", "terceira03", "quarta0004"]) await trocarPara(id, senha);

    expect(await senhaJaUsada(id, "quarta0004")).toBe(true);
    expect(await senhaJaUsada(id, "terceira03")).toBe(true);
    expect(await senhaJaUsada(id, "segunda002")).toBe(true);
    expect(await senhaJaUsada(id, "primeira01")).toBe(false);
  });

  it("não confunde as senhas de pessoas diferentes", async () => {
    const ana = await novaPessoa();
    const bruno = await novaPessoa();
    await trocarPara(ana, "da-ana-2026");
    expect(await senhaJaUsada(bruno, "da-ana-2026")).toBe(false);
  });

  it("usa a quantidade do Parametro", async () => {
    const id = await novaPessoa();
    for (const senha of ["primeira01", "segunda002", "terceira03"]) await trocarPara(id, senha);

    await mudarParametro(1);
    expect(await senhaJaUsada(id, "segunda002")).toBe(false);
    expect(await senhaJaUsada(id, "terceira03")).toBe(true);

    await mudarParametro(5);
    await trocarPara(id, "quarta0004");
    expect(await senhaJaUsada(id, "primeira01")).toBe(true);
  });
});
