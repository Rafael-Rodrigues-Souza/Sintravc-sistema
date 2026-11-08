import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { parametro, pessoaEquipe } from "@/lib/db/schema";
import { limparCacheParametros } from "@/lib/parametros";

import { auth } from "./auth";
import { gravarSenha, registrarSenha, senhaJaUsada } from "./senha-anterior";

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

describe("gravarSenha: a senha do login e o histórico juntos (RN47)", () => {
  async function hashDe(senha: string) {
    return (await auth().$context).password.hash(senha);
  }

  async function entraCom(email: string, senha: string) {
    try {
      await auth().api.signInEmail({ body: { email, password: senha } });
      return true;
    } catch {
      return false;
    }
  }

  async function emailDe(id: string) {
    const [linha] = await banco().select({ email: pessoaEquipe.email }).from(pessoaEquipe).where(eq(pessoaEquipe.id, id));
    return linha!.email;
  }

  it("a pessoa passa a entrar com a senha nova, e ela fica no histórico", async () => {
    const id = await novaPessoa();
    const hash = await hashDe("primeira01");

    await banco().transaction((tx) => gravarSenha(tx, id, hash));

    expect(await entraCom(await emailDe(id), "primeira01")).toBe(true);
    expect(await senhaJaUsada(id, "primeira01")).toBe(true);
  });

  it("trocar de novo substitui a senha do login e guarda as duas no histórico", async () => {
    const id = await novaPessoa();
    await banco().transaction(async (tx) => gravarSenha(tx, id, await hashDe("primeira01")));
    const novo = await hashDe("segunda002");

    await banco().transaction((tx) => gravarSenha(tx, id, novo));

    const email = await emailDe(id);
    expect(await entraCom(email, "primeira01")).toBe(false);
    expect(await entraCom(email, "segunda002")).toBe(true);
    expect(await senhaJaUsada(id, "primeira01")).toBe(true);
  });

  it("se a transação falha, nada fica gravado: nem a senha do login, nem o histórico", async () => {
    const id = await novaPessoa();
    const hash = await hashDe("primeira01");

    await expect(
      banco().transaction(async (tx) => {
        await gravarSenha(tx, id, hash);
        throw new Error("falhou depois");
      }),
    ).rejects.toThrow("falhou depois");

    expect(await entraCom(await emailDe(id), "primeira01")).toBe(false);
    expect(await senhaJaUsada(id, "primeira01")).toBe(false);
  });
});
