import { describe, expect, it } from "vitest";

import { mesNaBahia } from "@/lib/datas";

import { abaDoSegmento, enderecoDaAba, lerFiltros, temFiltro } from "./filtros";

describe("lerFiltros (E60)", () => {
  it("lê busca, tipo, ano e “mais”", () => {
    expect(lerFiltros("editais", { busca: "  012 ", tipo: "prestacao-de-contas", ano: "2026", mais: "3" })).toEqual({
      busca: "012",
      subtipo: "prestacao_contas",
      ano: 2026,
      mais: 3,
    });
  });

  it("ignora o tipo da outra aba e valores inválidos", () => {
    expect(lerFiltros("editais", { tipo: "act", ano: "abc", mais: "0" })).toEqual({ busca: "", subtipo: null, ano: null, mais: 1 });
    expect(lerFiltros("acordos-coletivos", { tipo: "convocacao", ano: "20260" })).toMatchObject({ subtipo: null, ano: null });
    expect(lerFiltros("acordos-coletivos", { tipo: ["cct", "act"] })).toMatchObject({ subtipo: "cct" });
  });

  it("corta a busca longa e limita o “mais”", () => {
    const f = lerFiltros("editais", { busca: "a".repeat(300), mais: "9999" });
    expect(f.busca).toHaveLength(100);
    expect(f.mais).toBe(50);
  });

  it("temFiltro só com busca, tipo ou ano", () => {
    expect(temFiltro({ busca: "", subtipo: null, ano: null })).toBe(false);
    expect(temFiltro({ busca: "", subtipo: null, ano: 2025 })).toBe(true);
  });
});

describe("enderecoDaAba", () => {
  it("deixa os valores padrão fora do endereço", () => {
    expect(enderecoDaAba("editais", {})).toBe("/documentos/editais");
    expect(enderecoDaAba("acordos-coletivos", { mais: 1 })).toBe("/documentos/acordos-coletivos");
  });

  it("monta o endereço com os filtros, ida e volta", () => {
    const endereco = enderecoDaAba("editais", { busca: "assembleia geral", subtipo: "prestacao_contas", ano: 2026, mais: 2 });
    expect(endereco).toBe("/documentos/editais?busca=assembleia+geral&tipo=prestacao-de-contas&ano=2026&mais=2");
    const params = Object.fromEntries(new URL(endereco, "http://x").searchParams);
    expect(lerFiltros("editais", params)).toEqual({ busca: "assembleia geral", subtipo: "prestacao_contas", ano: 2026, mais: 2 });
  });

  it("abaDoSegmento só aceita as duas abas", () => {
    expect(abaDoSegmento("editais")).toBe("editais");
    expect(abaDoSegmento("acordos-coletivos")).toBe("acordos-coletivos");
    expect(abaDoSegmento("acordos")).toBeNull();
  });
});

describe("mesNaBahia", () => {
  it("usa o mês da Bahia, não o do UTC", () => {
    // 01/11/2026 às 01h00 UTC ainda é 31/10 na Bahia.
    expect(mesNaBahia(new Date("2026-11-01T01:00:00Z"))).toEqual({ chave: "2026-10", rotulo: "Outubro de 2026" });
    expect(mesNaBahia(new Date("2026-03-15T12:00:00Z"))).toEqual({ chave: "2026-03", rotulo: "Março de 2026" });
  });
});
