import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { banco } from "@/lib/db";
import { configSite } from "@/lib/db/schema";
import { limparCacheParametros } from "@/lib/parametros";

import { lerConfigSite, limparCacheConfigSite, type ConfigSite } from ".";

let original: unknown;

beforeEach(async () => {
  limparCacheConfigSite();
  limparCacheParametros();
  const [linha] = await banco().select({ dados: configSite.dados }).from(configSite);
  original = linha?.dados;
});

afterEach(async () => {
  vi.useRealTimers();
  await gravar(original);
});

async function gravar(dados: unknown) {
  await banco()
    .update(configSite)
    .set({ dados: sql`${JSON.stringify(dados)}::jsonb` })
    .where(eq(configSite.id, "site"));
}

function comTelefone(dados: unknown, telefone: string): ConfigSite {
  const copia = structuredClone(dados) as ConfigSite;
  copia.contato.telefone = telefone;
  return copia;
}

describe("ConfigSite: dados de exemplo (seed)", () => {
  it("passam na validação e trazem o contato confirmado pelo sindicato", async () => {
    const config = await lerConfigSite();
    expect(config.contato).toMatchObject({
      endereco: "Rua Laudicéia Gusmão, 586 - Centro",
      cidade: "Vitória da Conquista - BA",
      telefone: "7734234959",
      whatsappRecepcao: "557734234959",
      email: "sintravcrodoviarios@gmail.com",
    });
    expect(config.mensagemFiliacao).toBe("Olá! Quero me filiar ao SINTRAVC.");
    expect(config.historia.marcos[0]).toMatchObject({ id: "fundacao", ano: "1993" });
  });
});

describe("ConfigSite: atualização em até 1 minuto (RN43)", () => {
  it("mudança no banco não aparece antes de 60 s e aparece depois", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
    expect((await lerConfigSite()).contato.telefone).toBe("7734234959");

    await gravar(comTelefone(original, "7730000000"));
    vi.setSystemTime(new Date("2026-11-18T12:00:59Z"));
    expect((await lerConfigSite()).contato.telefone).toBe("7734234959");

    vi.setSystemTime(new Date("2026-11-18T12:01:01Z"));
    expect((await lerConfigSite()).contato.telefone).toBe("7730000000");
  });

  it("JSON inválido no banco dá erro claro, com o campo", async () => {
    await gravar(comTelefone(original, "(77) 3423"));
    await expect(lerConfigSite()).rejects.toThrow(/contato\.telefone/);
  });

  it("com um valor já lido, JSON inválido depois não derruba o site", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
    await lerConfigSite();

    await gravar(comTelefone(original, "x"));
    vi.setSystemTime(new Date("2026-11-18T12:05:00Z"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await lerConfigSite()).contato.telefone).toBe("7734234959");
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });
});
