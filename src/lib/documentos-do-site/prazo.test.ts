import { naBahia } from "@/testes/datas";
import { describe, expect, it } from "vitest";

import { documentoVazio, type DadosDocumento } from "@/lib/documentos/dados";
import { seloDosDados } from "@/lib/documentos/selo";

import { contagemDoPrazo, ehNovo, prazoEmAberto } from "./prazo";

/** Edital com prazo em 20/11/2026 às 19h00 na Bahia (22h00 UTC). */
const edital: DadosDocumento = { ...documentoVazio("edital"), eventoData: "2026-11-20", eventoHora: "19:00" };
/** Um instante dado no relógio da Bahia (UTC-3). */

describe("contagemDoPrazo (E60)", () => {
  it("conta os dias pelo calendário da Bahia", () => {
    expect(contagemDoPrazo("edital", edital, naBahia("2026-11-15", "10:00"))).toBe("Faltam 5 dias");
    expect(contagemDoPrazo("edital", edital, naBahia("2026-11-18", "23:59"))).toBe("Faltam 2 dias");
  });

  it("na véspera, “Falta 1 dia”; no último dia, “Termina hoje” até a hora do prazo", () => {
    expect(contagemDoPrazo("edital", edital, naBahia("2026-11-19", "23:59"))).toBe("Falta 1 dia");
    expect(contagemDoPrazo("edital", edital, naBahia("2026-11-20", "00:00"))).toBe("Termina hoje");
    expect(contagemDoPrazo("edital", edital, naBahia("2026-11-20", "18:59"))).toBe("Termina hoje");
  });

  it("some na hora do prazo, mesmo antes de o dia acabar", () => {
    expect(contagemDoPrazo("edital", edital, naBahia("2026-11-20", "19:00"))).toBeNull();
    expect(contagemDoPrazo("edital", edital, naBahia("2026-11-20", "23:59"))).toBeNull();
  });

  it("sem prazo, sem contagem", () => {
    expect(contagemDoPrazo("edital", documentoVazio("edital"), naBahia("2026-11-15", "10:00"))).toBeNull();
  });

  it("nunca discorda do selo do cartão: há contagem se e só se o selo é “Prazo”", () => {
    const instantes = [
      naBahia("2026-11-19", "23:59"), // véspera
      naBahia("2026-11-20", "00:00"), // virada para o último dia
      naBahia("2026-11-20", "18:59"), // 1 min antes da hora
      naBahia("2026-11-20", "19:00"), // a hora exata
      naBahia("2026-11-20", "19:01"), // 1 min depois
      naBahia("2026-11-20", "23:59"), // fim do último dia
      naBahia("2026-11-21", "00:00"), // dia seguinte
    ];
    const comVigencia: DadosDocumento = { ...edital, temVigencia: true, vigenciaInicio: "2026-11-01", vigenciaFim: "2026-12-31" };
    for (const dados of [edital, comVigencia]) {
      for (const agora of instantes) {
        const selo = seloDosDados("edital", "publicado", dados, agora);
        expect(contagemDoPrazo("edital", dados, agora) !== null, agora.toISOString()).toBe(selo === "prazo");
        expect(prazoEmAberto("edital", dados, agora), agora.toISOString()).toBe(selo === "prazo");
      }
    }
  });
});

describe("ehNovo (documento.novo_dias, E46)", () => {
  const publicado = naBahia("2026-11-10", "23:30");

  it("vale do dia da publicação até o 6º dia depois, com 7 dias", () => {
    expect(ehNovo(publicado, naBahia("2026-11-10", "23:59"), 7)).toBe(true);
    expect(ehNovo(publicado, naBahia("2026-11-16", "23:59"), 7)).toBe(true);
    expect(ehNovo(publicado, naBahia("2026-11-17", "00:00"), 7)).toBe(false);
  });

  it("com 0 dias, nenhum documento é novo", () => {
    expect(ehNovo(publicado, publicado, 0)).toBe(false);
  });
});
