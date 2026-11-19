import { describe, expect, it } from "vitest";

import { mensagemConviteEquipe, mensagemRedefinirSenha } from "./modelos";

const urlSite = "https://sintravc.org.br/";

describe("logo dos e-mails (#61)", () => {
  it.each([
    [
      "convite",
      () =>
        mensagemConviteEquipe("ana@sintravc.org.br", {
          nome: "Ana Souza",
          perfil: "Comunicação",
          link: "https://sintravc.org.br/painel/convite/abc",
          valeAte: "20/11/2026 às 10h00",
          urlSite,
        }),
    ],
    [
      "recuperação de senha",
      () => mensagemRedefinirSenha("ana@sintravc.org.br", { email: "ana@sintravc.org.br", link: "https://sintravc.org.br/x", horas: 1, urlSite }),
    ],
  ])("o %s traz a logo nova, branca, por endereço absoluto e com texto alternativo", async (_, montar) => {
    const { html } = await montar();
    expect(html).toContain('src="https://sintravc.org.br/marca/sintravc-escura.png"');
    expect(html).toContain('alt="SINTRAVC, Sindicato dos Rodoviários de Vitória da Conquista"');
  });
});
