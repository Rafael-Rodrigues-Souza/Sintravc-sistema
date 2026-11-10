import { describe, expect, it } from "vitest";

import { contarPalavras, limparCorpo, midiasDoCorpo, tempoDeLeitura } from "./corpo";

const MIDIA = "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => (marks ? { type: "text", text, marks } : { type: "text", text });

describe("limparCorpo: só os formatos do editor (Figma 112:1091)", () => {
  it("mantém parágrafo, subtítulo H2, listas, citação, quebra de linha e as marcas permitidas", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [t("O que você precisa saber")] },
        p(t("negrito", [{ type: "bold" }]), t(" itálico", [{ type: "italic" }]), { type: "hardBreak" }, t("sub", [{ type: "underline" }])),
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("um"))] }] },
        { type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [p(t("dois"))] }] },
        { type: "blockquote", content: [p(t("citação"))] },
      ],
    };
    expect(limparCorpo(doc)).toEqual(doc);
  });

  it("tira nós e marcas que o editor não oferece, mantendo o texto de dentro", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [t("Título grande")] },
        { type: "codeBlock", content: [t("código")] },
        p(t("riscado", [{ type: "strike" }, { type: "bold" }]), { type: "script", content: [t("x")] }),
      ],
    };
    expect(limparCorpo(doc)).toEqual({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [t("Título grande")] },
        p(t("código")),
        p(t("riscado", [{ type: "bold" }])),
      ],
    });
  });

  it("link só com http, https ou mailto, e sem outros atributos", () => {
    const link = (href: string) => p(t("aqui", [{ type: "link", attrs: { href, onclick: "alert(1)", class: "x" } }]));
    expect(limparCorpo({ type: "doc", content: [link("https://sintravc.org.br"), link("javascript:alert(1)"), link("mailto:a@b.br")] })).toEqual({
      type: "doc",
      content: [
        p(t("aqui", [{ type: "link", attrs: { href: "https://sintravc.org.br" } }])),
        p(t("aqui")),
        p(t("aqui", [{ type: "link", attrs: { href: "mailto:a@b.br" } }])),
      ],
    });
  });

  it("imagem só da Mídia (com o id do arquivo), com texto alternativo e legenda", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "image", attrs: { midiaId: MIDIA, src: "https://arquivos/x.jpg", alt: "Ônibus", title: "Foto: SINTRAVC", onerror: "x" } },
        { type: "image", attrs: { src: "https://outro-site/y.jpg", alt: "" } },
      ],
    };
    expect(limparCorpo(doc)).toEqual({
      type: "doc",
      content: [{ type: "image", attrs: { midiaId: MIDIA, src: "https://arquivos/x.jpg", alt: "Ônibus", title: "Foto: SINTRAVC" } }],
    });
  });

  it("o que não é um documento vira documento vazio", () => {
    expect(limparCorpo("<p>oi</p>")).toEqual({ type: "doc", content: [] });
    expect(limparCorpo(null)).toEqual({ type: "doc", content: [] });
  });
});

describe("midiasDoCorpo", () => {
  it("lista as imagens da Mídia usadas no corpo, sem repetir", () => {
    const img = { type: "image", attrs: { midiaId: MIDIA, src: "s", alt: "", title: "" } };
    expect(midiasDoCorpo({ type: "doc", content: [img, { type: "blockquote", content: [img] }] })).toEqual([MIDIA]);
  });
});

describe("contarPalavras e tempoDeLeitura (Figma: “412 palavras · cerca de 3 min de leitura”)", () => {
  it("conta as palavras do texto, ignorando formatação e espaços repetidos", () => {
    const doc = { type: "doc" as const, content: [p(t("O SINTRAVC  mantém"), t(" seu compromisso", [{ type: "bold" }])), p(t("com clareza."))] };
    expect(contarPalavras(doc)).toBe(7);
    expect(contarPalavras({ type: "doc", content: [] })).toBe(0);
  });

  it("arredonda para cima, com 200 palavras por minuto", () => {
    expect(tempoDeLeitura(0)).toBe(0);
    expect(tempoDeLeitura(1)).toBe(1);
    expect(tempoDeLeitura(200)).toBe(1);
    expect(tempoDeLeitura(412)).toBe(3);
  });
});
