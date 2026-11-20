import { describe, expect, it } from "vitest";

import { redesComLink, redesDaBarraEDoRodape } from "./redes";

const contato = { whatsappRecepcao: "557734234959" };
const semRedes = { instagram: null, youtube: null, facebook: null, canalWhatsapp: null };

describe("redes da barra superior e do rodapé (RN43, E57)", () => {
  it("sem canal no WhatsApp, o ícone abre a conversa com a recepção, sem mensagem pronta", () => {
    const redes = redesDaBarraEDoRodape({ redes: { ...semRedes, instagram: "https://www.instagram.com/sintravc.ba/" }, contato });

    expect(redes.map((r) => [r.nome, r.href])).toEqual([
      ["Instagram", "https://www.instagram.com/sintravc.ba/"],
      ["WhatsApp da recepção", "https://wa.me/557734234959"],
    ]);
  });

  it("com canal no WhatsApp, o ícone abre o canal", () => {
    const canal = "https://whatsapp.com/channel/abc";
    const redes = redesDaBarraEDoRodape({ redes: { ...semRedes, canalWhatsapp: canal }, contato });

    expect(redes.map((r) => [r.nome, r.href])).toEqual([["Canal no WhatsApp", canal]]);
  });

  it("rede sem link fica escondida", () => {
    const redes = redesDaBarraEDoRodape({ redes: { ...semRedes, youtube: "https://www.youtube.com/@melodialives" }, contato });

    expect(redes.map((r) => r.nome)).not.toContain("Facebook");
    expect(redes.map((r) => r.nome)).not.toContain("Instagram");
  });
});

describe("redes do Contato (RN43, E57)", () => {
  it("só as redes com link: sem marcador para Facebook e canal no WhatsApp, e sem o WhatsApp da recepção, que tem cartão próprio", () => {
    const redes = redesComLink({ ...semRedes, instagram: "https://www.instagram.com/sintravc.ba/", youtube: "https://www.youtube.com/@melodialives" });

    expect(redes.map((r) => [r.nome, r.href])).toEqual([
      ["Instagram", "https://www.instagram.com/sintravc.ba/"],
      ["YouTube", "https://www.youtube.com/@melodialives"],
    ]);
  });
});
