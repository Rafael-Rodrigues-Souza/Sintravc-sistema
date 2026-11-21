import { describe, expect, it } from "vitest";

import { descricaoDaNoticia, linksDeCompartilhar } from "./compartilhar";
import { enderecoDaLista, faixaDePaginas, lerFiltros, temFiltro } from "./filtros";

describe("lerFiltros: filtros da página Notícias na URL (E59)", () => {
  it("lê categoria, busca, ordem e página", () => {
    expect(lerFiltros({ categoria: "juridico", busca: "  plantão ", ordem: "antigas", pagina: "3" })).toEqual({
      categoria: "juridico",
      busca: "plantão",
      ordem: "antigas",
      pagina: 3,
    });
  });

  it("valores estranhos viram o padrão", () => {
    expect(lerFiltros({ categoria: "<script>", ordem: "x", pagina: "-2" })).toEqual({ categoria: null, busca: "", ordem: "recentes", pagina: 1 });
    expect(lerFiltros({ pagina: ["2", "5"] }).pagina).toBe(2);
  });

  it("temFiltro só com categoria ou busca", () => {
    expect(temFiltro({ categoria: null, busca: "" })).toBe(false);
    expect(temFiltro({ categoria: "geral", busca: "" })).toBe(true);
  });
});

describe("enderecoDaLista", () => {
  it("deixa os padrões fora do endereço", () => {
    expect(enderecoDaLista({})).toBe("/noticias");
    expect(enderecoDaLista({ ordem: "recentes", pagina: 1 })).toBe("/noticias");
    expect(enderecoDaLista({ categoria: "juridico", busca: "hora extra", ordem: "antigas", pagina: 2 })).toBe(
      "/noticias?categoria=juridico&busca=hora+extra&ordem=antigas&pagina=2",
    );
  });
});

describe("faixaDePaginas (Figma 80:973)", () => {
  it("poucas páginas: todas", () => {
    expect(faixaDePaginas(1, 1)).toEqual([1]);
    expect(faixaDePaginas(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("muitas páginas: 1 2 3 4 … 8 no começo, como no Figma", () => {
    expect(faixaDePaginas(1, 8)).toEqual([1, 2, 3, 4, "…", 8]);
  });

  it("no meio e no fim", () => {
    expect(faixaDePaginas(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(faixaDePaginas(10, 10)).toEqual([1, "…", 7, 8, 9, 10]);
  });
});

describe("compartilhar e prévia do link (E59, P4)", () => {
  it("links do WhatsApp e do Facebook com o endereço codificado", () => {
    const l = linksDeCompartilhar("https://sintravc.org.br/noticias/a-b", "Plantão & horário");
    expect(l.whatsapp).toBe("https://wa.me/?text=Plant%C3%A3o%20%26%20hor%C3%A1rio%20https%3A%2F%2Fsintravc.org.br%2Fnoticias%2Fa-b");
    expect(l.facebook).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fsintravc.org.br%2Fnoticias%2Fa-b");
  });

  it("a descrição é a linha fina; sem ela, o lide cortado numa palavra", () => {
    expect(descricaoDaNoticia({ linhaFina: "Linha fina.", lide: "Lide." })).toBe("Linha fina.");
    const d = descricaoDaNoticia({ linhaFina: "", lide: "palavra ".repeat(60) });
    expect(d.length).toBeLessThanOrEqual(200);
    expect(d.endsWith("palavra…")).toBe(true);
  });
});

describe("dataCurtaNaBahia", () => {
  it("12 out 2026, no horário da Bahia", async () => {
    const { dataCurtaNaBahia } = await import("@/lib/datas");
    expect(dataCurtaNaBahia(new Date("2026-10-12T15:00:00Z"))).toBe("12 out 2026");
    // 01h00 UTC de 13/10 ainda é 12/10 na Bahia.
    expect(dataCurtaNaBahia(new Date("2026-10-13T01:00:00Z"))).toBe("12 out 2026");
  });
});
