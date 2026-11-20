import { describe, expect, it } from "vitest";

import { juntarFechados, lerFechados } from "./comunicados-fechados";

const a = "01a1f991-8c63-749a-b1b1-c3d06ef30cda";
const b = "01a1f991-8c63-749a-b1b1-c3d06ef30cdb";

describe("cookie dos comunicados fechados (E58)", () => {
  it("lê os ids e ignora o que não é id", () => {
    expect(lerFechados(`${a}.lixo.${b}`)).toEqual([a, b]);
    expect(lerFechados(undefined)).toEqual([]);
  });

  it("junta sem repetir e guarda só os 20 mais novos", () => {
    expect(juntarFechados([a], [a, b])).toBe(`${a}.${b}`);
    const muitos = Array.from({ length: 25 }, (_, i) => `01a1f991-8c63-749a-b1b1-${String(i).padStart(12, "0")}`);
    expect(juntarFechados([], muitos).split(".")).toEqual(muitos.slice(-20));
  });
});
