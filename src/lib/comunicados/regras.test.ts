import { describe, expect, it } from "vitest";

import { esquemaTextosDoComunicado, normalizarLinkDoComunicado, primeiroErroDosTextos, rotuloDoComunicado, situacaoDo } from "./regras";

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
  it("título longo vira o começo, com reticências", () => {
    expect(rotuloDoComunicado("x".repeat(140))).toHaveLength(60);
    expect(rotuloDoComunicado("Curto")).toBe("Curto");
  });
});

describe("esquemaTextosDoComunicado (o mesmo na tela, na ação e nas regras)", () => {
  it.each([
    ["título vazio", { titulo: "  ", texto: "Texto" }, "titulo", "Escreva o título do comunicado."],
    ["título com 141", { titulo: "x".repeat(141), texto: "Texto" }, "titulo", "O título pode ter até 140 caracteres."],
    ["texto vazio", { titulo: "Título", texto: " \n " }, "texto", "Escreva o texto do comunicado."],
    ["texto com 1.001", { titulo: "Título", texto: "y".repeat(1001) }, "texto", "O texto pode ter até 1000 caracteres."],
  ])("recusa %s, no campo certo", (_nome, dados, campo, mensagem) => {
    expect(primeiroErroDosTextos(dados)).toEqual({ campo, mensagem });
  });

  it("aceita 140 e 1.000, junta os espaços do título e guarda as quebras de linha do texto", () => {
    expect(primeiroErroDosTextos({ titulo: "x".repeat(140), texto: "y".repeat(1000) })).toBeNull();
    expect(esquemaTextosDoComunicado.parse({ titulo: "  Sede   fechada ", texto: " Linha 1\r\nLinha 2 " })).toEqual({
      titulo: "Sede fechada",
      texto: "Linha 1\nLinha 2",
    });
  });

  it("com os dois errados, o primeiro é o título", () => {
    expect(primeiroErroDosTextos({ titulo: "", texto: "" })?.campo).toBe("titulo");
  });
});
