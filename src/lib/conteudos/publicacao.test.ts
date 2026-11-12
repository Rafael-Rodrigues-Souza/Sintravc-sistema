import { describe, expect, it } from "vitest";

import { jaFoiAoAr, temAlteracoesNaoPublicadas } from "./publicacao";

describe("temAlteracoesNaoPublicadas (E42)", () => {
  it("publicada e salva depois da publicação: tem", () => {
    expect(temAlteracoesNaoPublicadas({ estado: "publicado", revisao: 5, revisaoPublicada: 4 })).toBe(true);
  });

  it("publicada e igual ao que foi ao ar: não tem", () => {
    expect(temAlteracoesNaoPublicadas({ estado: "publicado", revisao: 4, revisaoPublicada: 4 })).toBe(false);
  });

  it("oculta e editada depois da publicação: tem, e volta assim com “Mostrar no site” (E45)", () => {
    expect(temAlteracoesNaoPublicadas({ estado: "oculto", revisao: 5, revisaoPublicada: 4 })).toBe(true);
    expect(temAlteracoesNaoPublicadas({ estado: "oculto", revisao: 4, revisaoPublicada: 4 })).toBe(false);
  });

  it("rascunho nunca publicado: não tem, mesmo com várias revisões", () => {
    expect(temAlteracoesNaoPublicadas({ estado: "rascunho", revisao: 9, revisaoPublicada: null })).toBe(false);
  });
});

describe("jaFoiAoAr (E45)", () => {
  it("publicada e oculta já foram ao ar; rascunho, agendada e arquivada, não", () => {
    expect(jaFoiAoAr("publicado")).toBe(true);
    expect(jaFoiAoAr("oculto")).toBe(true);
    for (const estado of ["rascunho", "agendado", "arquivado"] as const) expect(jaFoiAoAr(estado)).toBe(false);
  });
});
