import { describe, expect, it } from "vitest";

import { seloDeVigencia, seloDosCampos } from "./selo";

// 12/11/2026 às 10h00 na Bahia (UTC-3).
const AGORA = new Date("2026-11-12T13:00:00Z");

const publicado = { estado: "publicado" as const, dataEvento: null, vigenciaInicio: null, vigenciaFim: null };

describe("seloDeVigencia (C2, E46)", () => {
  it("“Prazo” enquanto a data do evento ou prazo não passou", () => {
    expect(seloDeVigencia({ ...publicado, dataEvento: new Date("2026-11-12T22:00:00Z") }, AGORA)).toBe("prazo");
  });

  it("o prazo vence na hora marcada: sem vigência, vira “Encerrado”", () => {
    expect(seloDeVigencia({ ...publicado, dataEvento: new Date("2026-11-12T12:59:00Z") }, AGORA)).toBe("encerrado");
  });

  it("com vigência: “Vigente” do início até o fim do dia final, no horário da Bahia", () => {
    const vigencia = { vigenciaInicio: "2026-11-01", vigenciaFim: "2026-11-12" };
    expect(seloDeVigencia({ ...publicado, ...vigencia }, AGORA)).toBe("vigente");
    // 12/11 às 23h59 na Bahia ainda é o último dia (já é 13/11 em UTC).
    expect(seloDeVigencia({ ...publicado, ...vigencia }, new Date("2026-11-13T02:59:00Z"))).toBe("vigente");
    expect(seloDeVigencia({ ...publicado, ...vigencia }, new Date("2026-11-13T03:00:00Z"))).toBe("encerrado");
  });

  it("vigência começa hoje: já é “Vigente”", () => {
    expect(seloDeVigencia({ ...publicado, vigenciaInicio: "2026-11-12", vigenciaFim: "2027-11-11" }, AGORA)).toBe("vigente");
  });

  it("o prazo futuro vale mais que a vigência", () => {
    expect(
      seloDeVigencia(
        { ...publicado, dataEvento: new Date("2026-11-20T22:00:00Z"), vigenciaInicio: "2026-11-01", vigenciaFim: "2027-10-31" },
        AGORA,
      ),
    ).toBe("prazo");
  });

  it("prazo vencido, mas vigência em curso: “Vigente”", () => {
    expect(
      seloDeVigencia(
        { ...publicado, dataEvento: new Date("2026-11-01T22:00:00Z"), vigenciaInicio: "2026-11-01", vigenciaFim: "2027-10-31" },
        AGORA,
      ),
    ).toBe("vigente");
  });

  it("sem selo: sem datas, ou vigência que ainda não começou", () => {
    expect(seloDeVigencia(publicado, AGORA)).toBeNull();
    expect(seloDeVigencia({ ...publicado, vigenciaInicio: "2026-12-01", vigenciaFim: "2027-11-30" }, AGORA)).toBeNull();
  });

  it("só o documento publicado tem selo: o estado não muda com as datas", () => {
    const vencido = { dataEvento: new Date("2026-11-01T22:00:00Z"), vigenciaInicio: null, vigenciaFim: null };
    for (const estado of ["rascunho", "agendado", "oculto", "arquivado"] as const) {
      expect(seloDeVigencia({ estado, ...vencido }, AGORA)).toBeNull();
    }
  });
});

describe("seloDosCampos: o selo a partir dos campos da tela (horário da Bahia)", () => {
  it("o prazo digitado como 12/11 às 19h00 ainda não passou às 10h", () => {
    const campos = { eventoData: "2026-11-12", eventoHora: "19:00", vigenciaInicio: "", vigenciaFim: "" };
    expect(seloDosCampos("publicado", campos, AGORA)).toBe("prazo");
  });

  it("campos vazios não contam", () => {
    expect(seloDosCampos("publicado", { eventoData: "", eventoHora: "", vigenciaInicio: "", vigenciaFim: "" }, AGORA)).toBeNull();
  });
});
