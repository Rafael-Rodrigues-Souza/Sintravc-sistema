import { describe, expect, it } from "vitest";

import { dataHoraDoEmail } from "./modelos";

describe("dataHoraDoEmail", () => {
  it("escreve a data no horário da Bahia (RNF06)", () => {
    expect(dataHoraDoEmail(new Date("2026-11-05T17:30:00Z"))).toBe("05/11/2026 às 14h30");
    expect(dataHoraDoEmail(new Date("2026-11-06T02:05:00Z"))).toBe("05/11/2026 às 23h05");
  });
});
