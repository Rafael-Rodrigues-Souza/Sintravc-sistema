import { describe, expect, it } from "vitest";

import { conferirMotivo, MOTIVO_OCULTAR_MAXIMO } from "./motivo";

describe("conferirMotivo (RN11, E45)", () => {
  it("o limite é 500 caracteres, o mesmo na tela, nas actions e no domínio", () => {
    expect(MOTIVO_OCULTAR_MAXIMO).toBe(500);
  });

  it("tira os espaços das pontas e aceita até o limite", () => {
    expect(conferirMotivo("  Data errada  ")).toBe("Data errada");
    expect(conferirMotivo("a".repeat(500))).toHaveLength(500);
  });

  it("vazio, só espaços ou acima do limite é recusado no campo do motivo", () => {
    for (const motivo of ["", "   ", "a".repeat(501)]) {
      expect(() => conferirMotivo(motivo)).toThrow(expect.objectContaining({ codigo: "invalido", campo: "motivo" }));
    }
  });
});
