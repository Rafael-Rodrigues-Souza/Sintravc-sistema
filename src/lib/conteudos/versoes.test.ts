import { describe, expect, it } from "vitest";

import { noticiaVazia, type DadosNoticia } from "./dados";
import { resumirMudancas } from "./versoes";

const v1: DadosNoticia = { ...noticiaVazia(), titulo: "Assembleia no sábado", lide: "Lide.", linhaFina: "Linha fina." };

describe("resumirMudancas (Histórico de versões, N14)", () => {
  it("a primeira versão é a primeira publicação", () => {
    expect(resumirMudancas(null, v1)).toBe("Primeira publicação.");
  });

  it("lista o que mudou, na ordem do editor", () => {
    expect(resumirMudancas(v1, { ...v1, linhaFina: "Outra.", lide: "Outro." })).toBe("Mudou: linha fina e lide.");
    expect(resumirMudancas(v1, { ...v1, titulo: "Nova", lide: "Outro.", assinatura: "Redação" })).toBe(
      "Mudou: manchete, lide e assinatura.",
    );
  });

  it("capa, texto alternativo e legenda contam como imagem de capa uma vez só", () => {
    expect(resumirMudancas(v1, { ...v1, capaAlt: "Motoristas", capaLegenda: "Foto: Ana" })).toBe("Mudou: imagem de capa.");
  });

  it("sem diferença no que o site mostra", () => {
    expect(resumirMudancas(v1, { ...v1 })).toBe("Sem mudanças no texto.");
  });
});
