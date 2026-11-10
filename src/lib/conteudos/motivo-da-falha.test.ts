import { describe, expect, it } from "vitest";

import { motivoDaFalha } from "./motivo-da-falha";
import { ErroFaltamCampos } from "./publicar";

describe("motivoDaFalha: o que aconteceu, em linguagem simples (M06)", () => {
  it("diz quais obrigatórios faltam", () => {
    expect(motivoDaFalha(new ErroFaltamCampos(["assinatura"]))).toBe("Falta preencher: Assinatura.");
    expect(motivoDaFalha(new ErroFaltamCampos(["lide", "categoriaId"]))).toBe("Falta preencher: Lide, Categoria.");
  });

  it("qualquer outro erro vira a frase do desenho, sem detalhe técnico", () => {
    expect(motivoDaFalha(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBe("O sistema tentou publicar de novo e não conseguiu.");
    expect(motivoDaFalha(undefined)).toBe("O sistema tentou publicar de novo e não conseguiu.");
  });
});
