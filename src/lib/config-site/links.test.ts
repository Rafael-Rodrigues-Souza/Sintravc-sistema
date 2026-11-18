import { describe, expect, it } from "vitest";

import { formatarTelefone, linkMapaEmbutido, linkRota, linkTelefone, linkWhatsApp } from "./links";

describe("links do site", () => {
  it("WhatsApp sem mensagem abre só a conversa", () => {
    expect(linkWhatsApp("557734234959")).toBe("https://wa.me/557734234959");
  });

  it("WhatsApp com mensagem pronta codifica acentos e pontuação (RN03)", () => {
    expect(linkWhatsApp("557734234959", "Olá! Quero me filiar ao SINTRAVC.")).toBe(
      "https://wa.me/557734234959?text=Ol%C3%A1!%20Quero%20me%20filiar%20ao%20SINTRAVC.",
    );
  });

  it("telefone com o código do Brasil", () => {
    expect(linkTelefone("7734234959")).toBe("tel:+557734234959");
  });

  it.each([
    ["7734234959", "(77) 3423-4959"],
    ["77991234567", "(77) 99123-4567"],
  ])("formata %s como %s", (entrada, saida) => {
    expect(formatarTelefone(entrada)).toBe(saida);
  });

  it("mapa e rota levam o endereço codificado", () => {
    const endereco = "Rua Laudicéia Gusmão, 586 - Centro, Vitória da Conquista - BA";
    expect(linkMapaEmbutido(endereco)).toContain("output=embed");
    expect(linkRota(endereco)).toContain(encodeURIComponent(endereco));
  });
});
