import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

// Conferência com o Botão 2.0 do Figma (31:601): cada estilo usa os tokens certos.
describe("Botão 2.0", () => {
  it("tem 48 px de altura e cantos arredondados em todas as variantes", () => {
    for (const variant of ["primario", "secundario", "sobre-escuro", "marinho", "perigo"] as const) {
      const classes = buttonVariants({ variant });
      expect(classes).toContain("h-12");
      expect(classes).toContain("rounded-full");
      expect(classes).toContain("texto-botao");
    }
  });

  it.each([
    ["primario", ["bg-destaque-amarelo", "text-destaque-amarelo-texto"]],
    ["secundario", ["border-borda-forte", "text-texto-primario", "border-[1.5px]"]],
    ["sobre-escuro", ["bg-sobre-escuro-superficie", "border-sobre-escuro-borda", "text-texto-invertido"]],
    ["marinho", ["bg-destaque-marinho-fixo", "text-texto-invertido"]],
    ["perigo", ["bg-destaque-vermelho", "text-texto-invertido"]],
  ] as const)("variante %s usa os tokens do Figma", (variant, esperadas) => {
    const classes = buttonVariants({ variant }).split(" ");
    for (const classe of esperadas) expect(classes).toContain(classe);
  });

  it("usa o primário quando nenhuma variante é informada", () => {
    expect(buttonVariants()).toContain("bg-destaque-amarelo");
  });
});
