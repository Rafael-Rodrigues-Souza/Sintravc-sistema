import { describe, expect, it } from "vitest";

import { formatarTelefone, formatarWhatsApp, linkFiliacao, linkMapaEmbutido, linkRota, linkTelefone, linkWhatsApp } from "./links";

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

describe("Filiar-se e número do WhatsApp", () => {
  const config = {
    contato: { whatsappRecepcao: "557734234959" },
    mensagemFiliacao: "Olá! Quero me filiar ao SINTRAVC.",
  } as Parameters<typeof linkFiliacao>[0];

  it("o link do Filiar-se leva a mensagem pronta da ConfigSite (RN03)", () => {
    expect(linkFiliacao(config)).toBe(linkWhatsApp("557734234959", "Olá! Quero me filiar ao SINTRAVC."));
  });

  it("o número do WhatsApp aparece sem o 55", () => {
    expect(formatarWhatsApp("557734234959")).toBe("(77) 3423-4959");
    expect(formatarWhatsApp("5577991234567")).toBe("(77) 99123-4567");
  });
});
