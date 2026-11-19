import { describe, expect, it } from "vitest";

import { DIRETORIA, iniciais } from "./site";

describe("Diretoria", () => {
  it("tem as 9 pessoas da lista, com presidente e vice primeiro", () => {
    expect(DIRETORIA.membros).toHaveLength(9);
    expect(DIRETORIA.membros[0]).toEqual({ cargo: "Presidente", nome: "Álvaro Silva Souza" });
    expect(DIRETORIA.membros[1]?.cargo).toBe("Vice-presidente");
    expect(DIRETORIA.membros.map((m) => m.nome)).toContain("José Evaristo Pereira Neto");
  });

  it.each([
    ["Álvaro Silva Souza", "ÁS"],
    ["Maria do Carmo Gonçalves da Silva", "MS"],
    ["Ana", "A"],
  ])("iniciais de %s = %s", (nome, esperado) => {
    expect(iniciais(nome)).toBe(esperado);
  });
});
