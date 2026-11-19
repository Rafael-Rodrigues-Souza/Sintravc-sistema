import { describe, expect, it } from "vitest";

import { anoNaBahia, bahiaParaUtc, camposEmTexto, dataHoraNaBahia } from "./datas";

describe("dataHoraNaBahia", () => {
  it("escreve a data no horário da Bahia (RNF06)", () => {
    expect(dataHoraNaBahia(new Date("2026-11-05T17:30:00Z"))).toBe("05/11/2026 às 14h30");
    expect(dataHoraNaBahia(new Date("2026-11-06T02:05:00Z"))).toBe("05/11/2026 às 23h05");
  });
});

describe("bahiaParaUtc: data e hora escolhidas na tela são do horário da Bahia (E44)", () => {
  it("03/11 às 08h00 na Bahia é 11h00 em UTC (CA-US21.2)", () => {
    expect(bahiaParaUtc("2026-11-03", "08:00")).toEqual(new Date("2026-11-03T11:00:00Z"));
  });

  it("perto da meia-noite, o dia em UTC já é o seguinte", () => {
    expect(bahiaParaUtc("2026-11-03", "23:30")).toEqual(new Date("2026-11-04T02:30:00Z"));
  });

  it("31/12 às 23h59 na Bahia já é o ano seguinte em UTC", () => {
    expect(bahiaParaUtc("2026-12-31", "23:59")).toEqual(new Date("2027-01-01T02:59:00Z"));
  });

  it("não depende do fuso do computador (o servidor converte)", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "Asia/Tokyo";
      expect(bahiaParaUtc("2026-11-03", "00:15")).toEqual(new Date("2026-11-03T03:15:00Z"));
    } finally {
      process.env.TZ = original;
    }
  });

  it("recusa data ou hora que não existem", () => {
    expect(bahiaParaUtc("2026-02-30", "08:00")).toBeNull();
    expect(bahiaParaUtc("2026-11-03", "24:00")).toBeNull();
    expect(bahiaParaUtc("03/11/2026", "08:00")).toBeNull();
    expect(bahiaParaUtc("2026-11-03", "8h")).toBeNull();
  });
});

describe("camposEmTexto", () => {
  it("escreve a data e a hora escolhidas como a tela mostra", () => {
    expect(camposEmTexto({ data: "2026-11-03", hora: "08:00" })).toBe("03/11/2026 às 08h00");
  });
});

describe("anoNaBahia (ano do rodapé, RNF06)", () => {
  it("em 31/12 às 21h na Bahia (já 1º/1 em UTC), ainda é o ano que termina", () => {
    expect(anoNaBahia(new Date("2027-01-01T00:00:00Z"))).toBe(2026);
  });

  it("à meia-noite de 1º/1 na Bahia, já é o ano novo", () => {
    expect(anoNaBahia(new Date("2027-01-01T03:00:00Z"))).toBe(2027);
  });
});
