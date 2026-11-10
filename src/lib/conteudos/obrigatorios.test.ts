import { describe, expect, it } from "vitest";

import { noticiaVazia, type DadosNoticia } from "./dados";
import { ehCampoObrigatorio, faltasParaPublicar } from "./obrigatorios";

const MIDIA = "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
const p = (texto: string) => ({ type: "paragraph", content: [{ type: "text", text: texto }] });
const imagem = (alt: string) => ({ type: "image", attrs: { midiaId: MIDIA, src: "https://x/y.jpg", alt, title: "" } });

/** Notícia com tudo o que a publicação cobra (E42). */
function completa(mudancas: Partial<DadosNoticia> = {}): DadosNoticia {
  return {
    ...noticiaVazia(),
    titulo: "Plantão jurídico em novo horário",
    lide: "A partir de segunda, o plantão funciona das 8h às 17h.",
    corpo: { type: "doc", content: [p("Leve seus contracheques.")] },
    categoriaId: "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c",
    assinatura: "Redação SINTRAVC",
    ...mudancas,
  };
}

const campos = (dados: DadosNoticia) => faltasParaPublicar(dados).map((f) => f.campo);

describe("faltasParaPublicar (E42, RN15, CA-US21.3)", () => {
  it("notícia completa, sem capa e sem linha fina, pode ser publicada", () => {
    expect(faltasParaPublicar(completa())).toEqual([]);
  });

  it("rascunho vazio: cobra manchete, lide, corpo, assinatura e categoria, na ordem da tela", () => {
    expect(faltasParaPublicar(noticiaVazia())).toEqual([
      { campo: "titulo", rotulo: "Manchete" },
      { campo: "lide", rotulo: "Lide" },
      { campo: "corpo", rotulo: "Corpo da notícia" },
      { campo: "assinatura", rotulo: "Assinatura" },
      { campo: "categoriaId", rotulo: "Categoria" },
    ]);
  });

  it("só espaços conta como vazio", () => {
    expect(campos(completa({ titulo: "   ", assinatura: " \n" }))).toEqual(["titulo", "assinatura"]);
  });

  it("corpo só com imagem, sem texto, conta como vazio", () => {
    expect(campos(completa({ corpo: { type: "doc", content: [imagem("Ônibus da frota")] } }))).toEqual(["corpo"]);
  });

  it("capa sem texto alternativo impede a publicação e indica o campo", () => {
    expect(faltasParaPublicar(completa({ capaMidiaId: MIDIA, capaAlt: " " }))).toEqual([
      { campo: "capaAlt", rotulo: "Texto alternativo da capa" },
    ]);
  });

  it("capa com texto alternativo passa", () => {
    expect(campos(completa({ capaMidiaId: MIDIA, capaAlt: "Trabalhadores em assembleia" }))).toEqual([]);
  });

  it("imagem do corpo sem texto alternativo impede a publicação, mesmo dentro de uma citação", () => {
    const corpo = { type: "doc" as const, content: [p("Texto."), { type: "blockquote", content: [imagem("")] }] };
    expect(faltasParaPublicar(completa({ corpo }))).toEqual([
      { campo: "imagensDoCorpo", rotulo: "Texto alternativo de 1 imagem do corpo" },
    ]);
  });

  it("conta as imagens do corpo sem texto alternativo", () => {
    const corpo = { type: "doc" as const, content: [p("Texto."), imagem(""), imagem("Com texto"), imagem("  ")] };
    expect(faltasParaPublicar(completa({ corpo }))).toEqual([
      { campo: "imagensDoCorpo", rotulo: "Texto alternativo de 2 imagens do corpo" },
    ]);
  });
});

describe("ehCampoObrigatorio", () => {
  it("reconhece os campos cobrados na publicação e recusa os opcionais", () => {
    expect(["titulo", "capaAlt", "imagensDoCorpo"].map(ehCampoObrigatorio)).toEqual([true, true, true]);
    expect(["linhaFina", "local", "palavrasChave", "toString"].map(ehCampoObrigatorio)).toEqual([false, false, false, false]);
  });
});
