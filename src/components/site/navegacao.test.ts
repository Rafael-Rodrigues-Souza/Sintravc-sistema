import { describe, expect, it } from "vitest";

import { DOCUMENTOS, estaAtivo, LINKS, MENU_PRINCIPAL, NOTICIAS, SINDICATO } from "./navegacao";

describe("menu do site (E58)", () => {
  it("Notícias é um grupo com Notícias e Comunicados, e Comunicados não fica no primeiro nível", () => {
    expect(NOTICIAS.itens).toEqual([LINKS.noticias, LINKS.comunicados]);
    expect(MENU_PRINCIPAL).toContain(NOTICIAS);
    expect(MENU_PRINCIPAL).not.toContain(LINKS.comunicados);
  });

  it.each([
    ["/comunicados", "Notícias", NOTICIAS, true],
    ["/noticias/assembleia", "Notícias", NOTICIAS, true],
    ["/contato", "Notícias", NOTICIAS, false],
    ["/sindicato/diretoria", "Sindicato", SINDICATO, true],
    ["/documentos/editais/edital-1", "Documentos", DOCUMENTOS, true],
    ["/comunicados", "Sindicato", SINDICATO, false],
  ])("em %s, %s fica ativo: %s", (caminho, _nome, grupo, ativo) => {
    expect(estaAtivo(grupo, caminho)).toBe(ativo);
  });
});
