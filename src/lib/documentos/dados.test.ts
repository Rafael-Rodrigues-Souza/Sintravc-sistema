import { describe, expect, it } from "vitest";

import { instanteDoEvento } from "./dados";

describe("instanteDoEvento: data e hora do evento, digitadas no horário da Bahia, em UTC (RNF06)", () => {
  it("30/10/2026 às 19h00 na Bahia é 22h00 em UTC", () => {
    expect(instanteDoEvento({ eventoData: "2026-10-30", eventoHora: "19:00" })).toEqual(new Date("2026-10-30T22:00:00Z"));
  });

  it("sem data ou sem hora, não há instante", () => {
    expect(instanteDoEvento({ eventoData: "2026-10-30", eventoHora: "" })).toBeNull();
    expect(instanteDoEvento({ eventoData: "", eventoHora: "19:00" })).toBeNull();
  });
});
