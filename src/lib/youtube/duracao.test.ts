import { describe, expect, it } from "vitest";

import { duracaoPorExtenso, segundosDoIso, segundosDoTexto, textoDaDuracao } from "./duracao";

describe("duração", () => {
  it("lê o ISO 8601 da Data API", () => {
    expect(segundosDoIso("PT28M10S")).toBe(1690);
    expect(segundosDoIso("PT1H2M30S")).toBe(3750);
    expect(segundosDoIso("PT45S")).toBe(45);
    expect(segundosDoIso("PT2H")).toBe(7200);
    expect(segundosDoIso("P0D")).toBe(0);
    expect(segundosDoIso("lixo")).toBeNull();
    expect(segundosDoIso("PT")).toBeNull();
  });

  it("lê o que a pessoa digita", () => {
    expect(segundosDoTexto("28:10")).toBe(1690);
    expect(segundosDoTexto("1:02:30")).toBe(3750);
    expect(segundosDoTexto("90:00")).toBe(5400);
    expect(segundosDoTexto("")).toBeNull();
    expect(segundosDoTexto("  ")).toBeNull();
    expect(segundosDoTexto("28")).toBeUndefined();
    expect(segundosDoTexto("28:70")).toBeUndefined();
    expect(segundosDoTexto("1:70:00")).toBeUndefined();
    expect(segundosDoTexto("0:00")).toBeUndefined();
  });

  it("escreve para a tela e para o leitor de tela", () => {
    expect(textoDaDuracao(1690)).toBe("28:10");
    expect(textoDaDuracao(3750)).toBe("1:02:30");
    expect(textoDaDuracao(5)).toBe("0:05");
    expect(duracaoPorExtenso(1690)).toBe("28 minutos e 10 segundos");
    expect(duracaoPorExtenso(3750)).toBe("1 hora, 2 minutos e 30 segundos");
    expect(duracaoPorExtenso(60)).toBe("1 minuto");
  });
});
