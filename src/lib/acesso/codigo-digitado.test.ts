import { describe, expect, it } from "vitest";

import { normalizarCodigoRecuperacao } from "./codigo-digitado";

// E37: os códigos são XXXXX-XXXXX, só maiúsculas. A pessoa digita do papel, no celular.
describe("normalizarCodigoRecuperacao", () => {
  it("passa para maiúsculas", () => {
    expect(normalizarCodigoRecuperacao("w32y3-k8azu")).toBe("W32Y3-K8AZU");
  });

  it("tira espaços nas pontas e no meio", () => {
    expect(normalizarCodigoRecuperacao("  W32Y3 - K8AZU ")).toBe("W32Y3-K8AZU");
  });

  it("aceita sem o hífen e devolve no formato do papel", () => {
    expect(normalizarCodigoRecuperacao("w32y3k8azu")).toBe("W32Y3-K8AZU");
  });

  it("aceita outros traços que o celular troca sozinho", () => {
    expect(normalizarCodigoRecuperacao("W32Y3–K8AZU")).toBe("W32Y3-K8AZU");
  });

  it("o que não tem 10 caracteres volta vazio", () => {
    expect(normalizarCodigoRecuperacao("W32Y3-K8AZ")).toBe("");
    expect(normalizarCodigoRecuperacao("")).toBe("");
  });
});
