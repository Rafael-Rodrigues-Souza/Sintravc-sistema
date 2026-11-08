import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { duasEtapas, parametro } from "@/lib/db/schema";
import { limparCacheParametros } from "@/lib/parametros";

import { auth } from "./auth";
import { gerarCodigosRecuperacao } from "./codigos-recuperacao";
import { criarPessoaDeTeste } from "./pessoas-de-teste";

// RN49: 8 códigos de uso único (equipe.codigos_recuperacao), guardados criptografados pelo plugin (E36).
let contador = 0;

async function novaPessoa() {
  contador += 1;
  return criarPessoaDeTeste({
    nome: `Códigos ${contador}`,
    email: `codigos${contador}-${Date.now()}@sintravc.local`,
    perfil: "COM",
    senha: "senha-certa-123",
  });
}

async function codigosQueOPluginLe(pessoaId: string) {
  const resposta = await auth().api.viewBackupCodes({ body: { userId: pessoaId } });
  return resposta.backupCodes;
}

async function mudarParametro(valor: number) {
  await banco().update(parametro).set({ valor }).where(eq(parametro.chave, "equipe.codigos_recuperacao"));
  limparCacheParametros();
}

afterEach(async () => {
  await mudarParametro(8);
});

describe("gerarCodigosRecuperacao (RN49)", () => {
  it("gera 8 códigos diferentes, que o plugin consegue ler", async () => {
    const p = await novaPessoa();

    const codigos = await gerarCodigosRecuperacao(p.id);

    expect(codigos).toHaveLength(8);
    expect(new Set(codigos).size).toBe(8);
    // Fácil de ler e digitar no celular: só maiúsculas e algarismos, sem 0/O, 1/I/L (Figma 262:40453).
    for (const codigo of codigos) expect(codigo).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
    expect(await codigosQueOPluginLe(p.id)).toEqual(codigos);
  });

  it("guarda os códigos criptografados: nenhum aparece no banco", async () => {
    const p = await novaPessoa();
    const codigos = await gerarCodigosRecuperacao(p.id);

    const [linha] = await banco().select().from(duasEtapas).where(eq(duasEtapas.pessoaId, p.id));
    for (const codigo of codigos) expect(linha!.codigosRecuperacao).not.toContain(codigo);
  });

  it("gerar de novo invalida todos os códigos anteriores", async () => {
    const p = await novaPessoa();
    const antigos = await gerarCodigosRecuperacao(p.id);

    const novos = await gerarCodigosRecuperacao(p.id);

    const validos = await codigosQueOPluginLe(p.id);
    expect(validos).toEqual(novos);
    for (const codigo of antigos) expect(validos).not.toContain(codigo);
  });

  it("usa a quantidade do Parametro", async () => {
    const p = await novaPessoa();
    await mudarParametro(5);
    expect(await gerarCodigosRecuperacao(p.id)).toHaveLength(5);
  });

  it("recusa quem ainda não tem as duas etapas configuradas", async () => {
    await expect(gerarCodigosRecuperacao("00000000-0000-7000-8000-000000000000")).rejects.toThrow(/duas etapas/);
  });

  it("as pessoas de teste já nascem com os 8 códigos", async () => {
    const p = await novaPessoa();
    expect(p.codigosRecuperacao).toHaveLength(8);
    expect(await codigosQueOPluginLe(p.id)).toEqual(p.codigosRecuperacao);
  });
});
