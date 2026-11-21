import { describe, expect, it } from "vitest";

import { DESLIZE_MINIMO, passoDoDeslize, vizinhoNaFila } from "./deslize";

describe("passoDoDeslize", () => {
  const inicio = { x: 200, y: 100 };

  it("para a esquerda vai para o próximo; para a direita, para o anterior", () => {
    expect(passoDoDeslize(inicio, { x: 200 - DESLIZE_MINIMO, y: 100 })).toBe(1);
    expect(passoDoDeslize(inicio, { x: 200 + DESLIZE_MINIMO, y: 110 })).toBe(-1);
  });

  it("pouco movimento é toque, não deslize", () => {
    expect(passoDoDeslize(inicio, { x: 200 - (DESLIZE_MINIMO - 1), y: 100 })).toBe(0);
  });

  it("mais na vertical que de lado é rolagem da página", () => {
    expect(passoDoDeslize(inicio, { x: 140, y: 170 })).toBe(0);
    expect(passoDoDeslize(inicio, { x: 140, y: 40 })).toBe(0);
  });
});

describe("vizinhoNaFila", () => {
  it("anda um para a frente ou para trás e dá a volta nas pontas", () => {
    expect(vizinhoNaFila(0, 1, 3)).toBe(1);
    expect(vizinhoNaFila(2, 1, 3)).toBe(0);
    expect(vizinhoNaFila(0, -1, 3)).toBe(2);
    expect(vizinhoNaFila(1, -1, 3)).toBe(0);
  });
});
