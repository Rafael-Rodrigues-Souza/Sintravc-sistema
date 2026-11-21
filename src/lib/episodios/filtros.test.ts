import { describe, expect, it } from "vitest";

import { enderecoDoRadio, lerFiltrosDoRadio, numeroDaBusca, temFiltroNoRadio } from "./filtros";

describe("filtros do Rádio Chofer no site", () => {
  it("lê a busca, o tema e a leva da URL", () => {
    expect(lerFiltrosDoRadio({ busca: "  saúde ", tema: "Saude", leva: "3" })).toEqual({ busca: "saúde", tema: "saude", leva: 3 });
    expect(lerFiltrosDoRadio({})).toEqual({ busca: "", tema: null, leva: 1 });
  });

  it("ignora tema e leva malformados", () => {
    expect(lerFiltrosDoRadio({ tema: "../x", leva: "abc" })).toEqual({ busca: "", tema: null, leva: 1 });
    expect(lerFiltrosDoRadio({ leva: "0" }).leva).toBe(1);
    expect(lerFiltrosDoRadio({ leva: "9999" }).leva).toBe(50);
    expect(lerFiltrosDoRadio({ busca: "x".repeat(300) }).busca).toHaveLength(100);
  });

  it("monta o endereço só com o que não é padrão", () => {
    expect(enderecoDoRadio({})).toBe("/radio-chofer");
    expect(enderecoDoRadio({ busca: "jornada", tema: "saude", leva: 2 }, "#episodios")).toBe(
      "/radio-chofer?busca=jornada&tema=saude&leva=2#episodios",
    );
    expect(temFiltroNoRadio({ busca: "", tema: null })).toBe(false);
    expect(temFiltroNoRadio({ busca: "", tema: "saude" })).toBe(true);
  });

  it("reconhece a busca pelo número", () => {
    expect(numeroDaBusca("42")).toBe(42);
    expect(numeroDaBusca("ep 42")).toBe(42);
    expect(numeroDaBusca("Ep. 42")).toBe(42);
    expect(numeroDaBusca("#42")).toBe(42);
    expect(numeroDaBusca("episódio 7")).toBe(7);
    expect(numeroDaBusca("jornada 42")).toBeNull();
  });
});
