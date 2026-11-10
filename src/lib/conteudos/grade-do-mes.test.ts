import { describe, expect, it } from "vitest";

import { diaNoCalendario, gradeDoMes, mesVizinho } from "./grade-do-mes";

describe("gradeDoMes: 6 semanas, de domingo a sábado (Figma 115:2992)", () => {
  it("outubro de 2026 começa no domingo 27/09 e termina no sábado 07/11", () => {
    const grade = gradeDoMes(2026, 10);
    expect(grade).toHaveLength(42);
    expect(grade[0]).toEqual({ data: "2026-09-27", dia: 27, doMes: false });
    expect(grade[4]).toEqual({ data: "2026-10-01", dia: 1, doMes: true });
    expect(grade[34]).toEqual({ data: "2026-10-31", dia: 31, doMes: true });
    expect(grade[41]).toEqual({ data: "2026-11-07", dia: 7, doMes: false });
  });

  it("mês que começa no domingo não ganha semana vazia antes", () => {
    expect(gradeDoMes(2026, 11)[0]).toEqual({ data: "2026-11-01", dia: 1, doMes: true });
  });

  it("fevereiro de ano bissexto tem 29 dias", () => {
    expect(gradeDoMes(2028, 2).filter((d) => d.doMes)).toHaveLength(29);
  });
});

describe("diaNoCalendario: o dia em que o item aparece é o da Bahia (RNF06)", () => {
  it("02h30 UTC ainda é o dia anterior na Bahia", () => {
    expect(diaNoCalendario(new Date("2026-11-04T02:30:00Z"))).toBe("2026-11-03");
    expect(diaNoCalendario(new Date("2026-11-04T03:00:00Z"))).toBe("2026-11-04");
  });
});

describe("mesVizinho", () => {
  it("passa de ano nos dois sentidos", () => {
    expect(mesVizinho(2026, 12, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(mesVizinho(2026, 1, -1)).toEqual({ ano: 2025, mes: 12 });
  });
});
