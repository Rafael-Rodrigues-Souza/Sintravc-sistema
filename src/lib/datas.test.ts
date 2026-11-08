import { describe, expect, it } from "vitest";

import { dataHoraNaBahia } from "./datas";

describe("dataHoraNaBahia", () => {
  it("escreve a data no horário da Bahia (RNF06)", () => {
    expect(dataHoraNaBahia(new Date("2026-11-05T17:30:00Z"))).toBe("05/11/2026 às 14h30");
    expect(dataHoraNaBahia(new Date("2026-11-06T02:05:00Z"))).toBe("05/11/2026 às 23h05");
  });
});
