import { describe, expect, it } from "vitest";

import { ehJsonSimples, paraJsonSimples } from "./json";

describe("ehJsonSimples: só dados que viajam como JSON", () => {
  it("aceita texto, número, booleano, nulo, listas e objetos comuns", () => {
    expect(ehJsonSimples({ type: "doc", content: [{ type: "image", attrs: { midiaId: "x", alt: "", n: 1, ok: true, z: null } }] })).toBe(true);
  });

  it("recusa função em qualquer lugar (é como chega ao servidor uma referência temporária do React)", () => {
    const referencia = new Proxy(() => {}, {
      get() {
        throw new Error("não pode ler");
      },
    });
    expect(ehJsonSimples({ type: "doc", content: [{ type: "image", attrs: referencia }] })).toBe(false);
  });

  it("recusa instâncias de classe, undefined e números que não são finitos", () => {
    expect(ehJsonSimples({ quando: new Date() })).toBe(false);
    expect(ehJsonSimples({ a: undefined })).toBe(false);
    expect(ehJsonSimples([Number.NaN])).toBe(false);
  });
});

describe("paraJsonSimples", () => {
  it("transforma objetos sem protótipo (como os atributos do ProseMirror) em objetos comuns", () => {
    const attrs = Object.assign(Object.create(null) as Record<string, unknown>, { midiaId: "abc", alt: "Ônibus" });
    const copia = paraJsonSimples({ type: "image", attrs });

    expect(Object.getPrototypeOf(copia.attrs)).toBe(Object.prototype);
    expect(copia).toEqual({ type: "image", attrs: { midiaId: "abc", alt: "Ônibus" } });
  });
});
