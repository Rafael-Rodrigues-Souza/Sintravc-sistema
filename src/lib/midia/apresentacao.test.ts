import { describe, expect, it } from "vitest";

import { linhaDoCartao, podeTerLogo, tamanhoLegivel, tipoLegivel } from "./apresentacao";

describe("apresentação da Mídia (Figma 116:2727)", () => {
  it.each([
    [512, "512 B"],
    [420 * 1024, "420 KB"],
    [2.4 * 1024 * 1024, "2,4 MB"],
    [10 * 1024 * 1024, "10 MB"],
  ])("tamanhoLegivel(%d) = %s", (bytes, texto) => {
    expect(tamanhoLegivel(bytes)).toBe(texto);
  });

  it("linha do cartão: imagem, PDF e documento", () => {
    expect(
      linhaDoCartao({ tipo: "imagem", mime: "image/jpeg", largura: 1600, altura: 900, paginas: null, bytes: 420 * 1024 }),
    ).toBe("JPG · 1600 × 900 · 420 KB");
    expect(
      linhaDoCartao({ tipo: "pdf", mime: "application/pdf", largura: null, altura: null, paginas: 6, bytes: 2.4 * 1024 * 1024 }),
    ).toBe("PDF · 6 páginas · 2,4 MB");
    expect(
      linhaDoCartao({ tipo: "pdf", mime: "application/pdf", largura: null, altura: null, paginas: 1, bytes: 1024 }),
    ).toBe("PDF · 1 página · 1 KB");
    expect(
      linhaDoCartao({
        tipo: "documento",
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        largura: null,
        altura: null,
        paginas: null,
        bytes: 35 * 1024,
      }),
    ).toBe("XLSX · 35 KB");
  });

  it("tipo legível nos detalhes", () => {
    expect(tipoLegivel("image/jpeg")).toBe("Imagem JPG");
    expect(tipoLegivel("image/webp")).toBe("Imagem WebP");
    expect(tipoLegivel("application/pdf")).toBe("PDF");
    expect(tipoLegivel("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("Documento Word");
    expect(tipoLegivel("application/vnd.oasis.opendocument.spreadsheet")).toBe("Planilha LibreOffice");
  });

  // Logo com fundo transparente vem em PNG ou WebP: a miniatura mostra inteira, sobre o xadrez (E48).
  // Foto em JPG continua preenchendo a miniatura.
  it.each([
    ["image/png", true],
    ["image/webp", true],
    ["image/jpeg", false],
    ["application/pdf", false],
  ])("podeTerLogo(%s) = %s", (mime, esperado) => {
    expect(podeTerLogo(mime)).toBe(esperado);
  });
});
