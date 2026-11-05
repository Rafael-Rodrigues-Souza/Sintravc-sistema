import { describe, expect, it } from "vitest";

import { urlPublica } from "@/lib/armazenamento";

describe("urlPublica", () => {
  it("junta a base do MinIO com a chave", () => {
    expect(urlPublica("testes/a.txt", { S3_URL_PUBLICA: "http://localhost:9000/sintravc" })).toBe(
      "http://localhost:9000/sintravc/testes/a.txt",
    );
  });

  it("ignora barras sobrando na base e na chave", () => {
    expect(urlPublica("/fotos/capa.webp", { S3_URL_PUBLICA: "https://arquivos.sintravc.org.br/" })).toBe(
      "https://arquivos.sintravc.org.br/fotos/capa.webp",
    );
  });

  it("codifica espaços e acentos sem codificar as barras", () => {
    expect(
      urlPublica("documentos/acordo coletivo 2026.pdf", { S3_URL_PUBLICA: "https://arquivos.sintravc.org.br" }),
    ).toBe("https://arquivos.sintravc.org.br/documentos/acordo%20coletivo%202026.pdf");
    expect(urlPublica("notícias/ação.jpg", { S3_URL_PUBLICA: "https://a.b" })).toBe(
      "https://a.b/not%C3%ADcias/a%C3%A7%C3%A3o.jpg",
    );
  });
});
