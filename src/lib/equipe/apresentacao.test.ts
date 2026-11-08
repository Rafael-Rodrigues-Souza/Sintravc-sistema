import { describe, expect, it } from "vitest";

import { seloDuasEtapas, ultimoAcessoNaLista } from "./apresentacao";

// Equipe e perfis (Figma 168:18397). Horários no fuso da Bahia (UTC−3, RNF06).
const agora = new Date("2026-11-07T15:00:00Z"); // sábado, 12h00 na Bahia

describe("seloDuasEtapas (CA-US29.2)", () => {
  it("convite não aceito aparece como Pendente", () => {
    expect(seloDuasEtapas({ situacao: "pendente", duasEtapasAtivas: false })).toBe("pendente");
  });

  it("pessoa ativa, com as duas etapas, aparece como Ativa", () => {
    expect(seloDuasEtapas({ situacao: "ativa", duasEtapasAtivas: true })).toBe("ativa");
  });

  it("pessoa desativada aparece como Desativada", () => {
    expect(seloDuasEtapas({ situacao: "desativada", duasEtapasAtivas: true })).toBe("desativada");
  });
});

describe("ultimoAcessoNaLista", () => {
  const ativa = { situacao: "ativa" as const };

  it("convite não aceito: Convite enviado (CA-US29.2)", () => {
    expect(ultimoAcessoNaLista({ situacao: "pendente", ultimoAcesso: null }, { agora, ehVoce: false })).toBe(
      "Convite enviado",
    );
  });

  it("quem está vendo a lista: Agora (você)", () => {
    expect(ultimoAcessoNaLista({ ...ativa, ultimoAcesso: agora }, { agora, ehVoce: true })).toBe("Agora (você)");
  });

  it("hoje e ontem, com a hora da Bahia", () => {
    expect(
      ultimoAcessoNaLista({ ...ativa, ultimoAcesso: new Date("2026-11-07T10:58:00Z") }, { agora, ehVoce: false }),
    ).toBe("Hoje, 07h58");
    expect(
      ultimoAcessoNaLista({ ...ativa, ultimoAcesso: new Date("2026-11-06T21:10:00Z") }, { agora, ehVoce: false }),
    ).toBe("Ontem, 18h10");
  });

  it("perto da meia-noite, vale o dia da Bahia e não o de UTC", () => {
    // 02h30 UTC de sábado = 23h30 de sexta na Bahia.
    expect(
      ultimoAcessoNaLista({ ...ativa, ultimoAcesso: new Date("2026-11-07T02:30:00Z") }, { agora, ehVoce: false }),
    ).toBe("Ontem, 23h30");
  });

  it("até uma semana: Há N dias; depois, a data", () => {
    expect(
      ultimoAcessoNaLista({ ...ativa, ultimoAcesso: new Date("2026-11-04T12:00:00Z") }, { agora, ehVoce: false }),
    ).toBe("Há 3 dias");
    expect(
      ultimoAcessoNaLista({ ...ativa, ultimoAcesso: new Date("2026-10-20T12:00:00Z") }, { agora, ehVoce: false }),
    ).toBe("20/10/2026");
  });

  it("ativa que nunca entrou: Ainda não entrou", () => {
    expect(ultimoAcessoNaLista({ ...ativa, ultimoAcesso: null }, { agora, ehVoce: false })).toBe("Ainda não entrou");
  });
});
