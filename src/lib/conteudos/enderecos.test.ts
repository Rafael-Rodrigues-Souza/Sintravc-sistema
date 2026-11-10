import { describe, expect, it } from "vitest";

import { ehEnderecoDaWeb, ehLinkPermitido, normalizarEndereco } from "./enderecos";

describe("endereços aceitos nas notícias (E40)", () => {
  it.each([
    ["https://www.planalto.gov.br/lei", true],
    ["http://sintravc.org.br", true],
    ["https://localhost", false],
    ["javascript:alert(1)", false],
    ["ftp://arquivos.gov.br", false],
  ])("ehEnderecoDaWeb(%s) = %s", (url, esperado) => {
    expect(ehEnderecoDaWeb(url)).toBe(esperado);
  });

  it("o corpo aceita http, https e mailto, e mais nada", () => {
    expect(["https://a.br", "http://a.br", "mailto:a@b.br", "javascript:x", "data:text/html,x"].map(ehLinkPermitido)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("completa o que a pessoa digitou, ou diz que não é endereço", () => {
    expect(normalizarEndereco(" planalto.gov.br/lei ")).toBe("https://planalto.gov.br/lei");
    expect(normalizarEndereco("http://sintravc.org.br")).toBe("http://sintravc.org.br");
    expect(normalizarEndereco("não é endereço")).toBeNull();
    expect(normalizarEndereco("")).toBeNull();
    expect(normalizarEndereco("mailto:juridico@sintravc.org.br")).toBeNull();
    expect(normalizarEndereco("mailto:juridico@sintravc.org.br", { aceitarEmail: true })).toBe("mailto:juridico@sintravc.org.br");
  });
});
