import { describe, expect, it } from "vitest";

import { normalizarLinkDoComunicado, rotuloDoComunicado, situacaoDo } from "./regras";

const inicio = new Date("2026-10-30T11:00:00Z");
const fim = new Date("2026-11-03T02:59:00Z");

describe("situacaoDo (E58: a faixa segue o relógio)", () => {
  it.each([
    ["agendado antes do início", "agendado", new Date(inicio.getTime() - 1), "agendado"],
    ["agendado no instante do início", "agendado", inicio, "no_ar"],
    ["publicado no meio do período", "publicado", new Date("2026-11-01T12:00:00Z"), "no_ar"],
    ["publicado no instante do fim (23h59 já é fora)", "publicado", fim, "encerrado"],
    ["agendado depois do fim, sem a tarefa ter rodado", "agendado", new Date(fim.getTime() + 1), "encerrado"],
  ] as const)("%s", (_nome, estado, agora, esperado) => {
    expect(situacaoDo({ estado, inicio, fim }, agora)).toBe(esperado);
  });

  it("rascunho e encerrado não dependem da hora", () => {
    expect(situacaoDo({ estado: "rascunho", inicio, fim }, new Date("2026-11-01T12:00:00Z"))).toBe("rascunho");
    expect(situacaoDo({ estado: "encerrado", inicio, fim }, new Date("2026-11-01T12:00:00Z"))).toBe("encerrado");
  });
});

describe("normalizarLinkDoComunicado", () => {
  it.each([
    ["sintravc.org.br/feriado", "https://sintravc.org.br/feriado"],
    ["https://gov.br", "https://gov.br"],
    ["/contato", "/contato"],
    ["//golpe.com", null],
    ["javascript:alert(1)", null],
    ["texto solto", null],
  ])("%s → %s", (digitado, esperado) => {
    expect(normalizarLinkDoComunicado(digitado)).toBe(esperado);
  });
});

describe("rotuloDoComunicado", () => {
  it("mensagem longa vira o começo, com reticências", () => {
    expect(rotuloDoComunicado("x".repeat(140))).toHaveLength(60);
    expect(rotuloDoComunicado("Curto")).toBe("Curto");
  });
});
