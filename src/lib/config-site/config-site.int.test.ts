import { readFileSync } from "node:fs";

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
      cep: "45000-705",
      horario: "Segunda a sexta, das 8h às 11h e das 14h às 17h",
    });
    expect(config.mensagemFiliacao).toBe("Olá! Quero me filiar ao SINTRAVC.");
    expect(config.historia.marcos[0]).toMatchObject({ id: "fundacao", ano: "1993" });
  });
});

describe("ConfigSite: redes do sindicato (E57)", () => {
  const MIGRACAO = "drizzle/0014_redes_do_sindicato.sql";

  it("o seed traz o Instagram e o YouTube, e deixa o Facebook e o canal no WhatsApp sem link", async () => {
    const config = await lerConfigSite();
    expect(config.redes).toEqual({
      instagram: "https://www.instagram.com/sintravc.ba/",
      youtube: "https://www.youtube.com/@melodialives",
      facebook: null,
      canalWhatsapp: null,
    });
  });

  it("a migração não sobrescreve um link que alguém já tenha configurado", async () => {
    const copia = structuredClone(original) as ConfigSite;
    copia.redes = { ...copia.redes, instagram: "https://www.instagram.com/outro/", youtube: null };
    await gravar(copia);

    await banco().execute(sql.raw(readFileSync(MIGRACAO, "utf8")));

    const [linha] = await banco().select({ dados: configSite.dados }).from(configSite);
    expect((linha?.dados as ConfigSite).redes).toMatchObject({
      instagram: "https://www.instagram.com/outro/",
      youtube: "https://www.youtube.com/@melodialives",
    });
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

describe("ConfigSite: CEP", () => {
  it.each(["45000-705", "[CEP a definir pelo sindicato]"])("aceita %s", async (cep) => {
    const dados = structuredClone(original) as ConfigSite;
    dados.contato.cep = cep;
    await gravar(dados);
    expect((await lerConfigSite()).contato.cep).toBe(cep);
  });

  it("recusa CEP fora do formato 00000-000", async () => {
    const dados = structuredClone(original) as ConfigSite;
    dados.contato.cep = "45000705";
    await gravar(dados);
    await expect(lerConfigSite()).rejects.toThrow(/contato\.cep/);
  });
});
