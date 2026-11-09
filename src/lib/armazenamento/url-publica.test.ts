import { describe, expect, it } from "vitest";

import { contentDisposition, urlPublica } from "@/lib/armazenamento";

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

describe("contentDisposition", () => {
  it("baixa com o nome em UTF-8 e uma reserva só ASCII", () => {
    expect(contentDisposition({ tipo: "attachment", nome: 'Edital de convocação nº 12 "final".pdf' })).toBe(
      `attachment; filename="Edital de convocacao n_ 12 _final_.pdf"; filename*=UTF-8''Edital%20de%20convoca%C3%A7%C3%A3o%20n%C2%BA%2012%20%22final%22.pdf`,
    );
  });
});
