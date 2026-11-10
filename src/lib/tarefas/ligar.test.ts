import { describe, expect, it } from "vitest";

import { deveIniciarTrabalhador } from "./ligar";

describe("deveIniciarTrabalhador: a fila liga junto com o servidor Next (E44)", () => {
  it("liga no servidor Node (next dev e next start)", () => {
    expect(deveIniciarTrabalhador({ NEXT_RUNTIME: "nodejs" })).toBe(true);
    expect(deveIniciarTrabalhador({ NEXT_RUNTIME: "nodejs", NEXT_PHASE: "phase-production-server" })).toBe(true);
    expect(deveIniciarTrabalhador({ NEXT_RUNTIME: "nodejs", NEXT_PHASE: "phase-development-server" })).toBe(true);
  });

  it("não liga durante o next build", () => {
    expect(deveIniciarTrabalhador({ NEXT_RUNTIME: "nodejs", NEXT_PHASE: "phase-production-build" })).toBe(false);
  });

  it("não liga no runtime edge nem fora do Next", () => {
    expect(deveIniciarTrabalhador({ NEXT_RUNTIME: "edge" })).toBe(false);
    expect(deveIniciarTrabalhador({})).toBe(false);
  });

});
