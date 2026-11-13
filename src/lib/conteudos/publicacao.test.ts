import { describe, expect, it } from "vitest";

import { jaFoiAoAr, mesmosDados, temAlteracoesNaoPublicadas } from "./publicacao";

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

describe("mesmosDados (E47)", () => {
  it("mesmos campos em outra ordem de chaves (o jsonb reordena): é o mesmo", () => {
    const corpo = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Oi" }] }] };
    const corpoReordenado = { content: [{ content: [{ text: "Oi", type: "text" }], type: "paragraph" }], type: "doc" };
    expect(mesmosDados({ titulo: "A", corpo, links: [] }, { links: [], corpo: corpoReordenado, titulo: "A" })).toBe(true);
  });

  it("um campo diferente: não é o mesmo", () => {
    expect(mesmosDados({ titulo: "A", temVigencia: false }, { titulo: "A", temVigencia: true })).toBe(false);
  });

  it("a ordem das listas conta (fontes e anexos aparecem nessa ordem no site)", () => {
    expect(mesmosDados({ links: [{ url: "a" }, { url: "b" }] }, { links: [{ url: "b" }, { url: "a" }] })).toBe(false);
  });

  it("campo ausente num retrato antigo e nulo na cópia: é o mesmo", () => {
    expect(mesmosDados({ titulo: "A" }, { titulo: "A", capaLegenda: null })).toBe(true);
    expect(mesmosDados({ titulo: "A" }, { titulo: "A", capaLegenda: "" })).toBe(false);
  });
});
