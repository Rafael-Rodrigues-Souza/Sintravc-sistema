import { describe, expect, it } from "vitest";

import { temAlteracoesNaoPublicadas } from "./publicacao";

describe("temAlteracoesNaoPublicadas (E42)", () => {
  it("publicada e salva depois da publicação: tem", () => {
    expect(temAlteracoesNaoPublicadas({ estado: "publicado", revisao: 5, revisaoPublicada: 4 })).toBe(true);
  });

  it("publicada e igual ao que foi ao ar: não tem", () => {
    expect(temAlteracoesNaoPublicadas({ estado: "publicado", revisao: 4, revisaoPublicada: 4 })).toBe(false);
  });

  it("rascunho nunca publicado: não tem, mesmo com várias revisões", () => {
    expect(temAlteracoesNaoPublicadas({ estado: "rascunho", revisao: 9, revisaoPublicada: null })).toBe(false);
  });
});
