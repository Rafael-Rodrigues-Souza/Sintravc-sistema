import { describe, expect, it } from "vitest";

import { seloDaPrevia } from "./selo-da-previa";

const QUANDO = new Date("2026-11-10T13:06:00Z"); // 10h06 na Bahia

describe("seloDaPrevia (RF39, E42, E45)", () => {
  it("cópia de trabalho: nunca publicada, igual ao site ou com alterações", () => {
    expect(seloDaPrevia({ estado: "rascunho", comAlteracoes: false })).toBe("Prévia · ainda não publicada");
    expect(seloDaPrevia({ estado: "publicado", comAlteracoes: false })).toBe("Prévia · igual ao site");
    expect(seloDaPrevia({ estado: "publicado", comAlteracoes: true })).toBe("Prévia · alterações não publicadas");
  });

  it("oculta: diz que está fora do site, e se há alterações (não “ainda não publicada”)", () => {
    expect(seloDaPrevia({ estado: "oculto", comAlteracoes: false })).toBe("Prévia · oculta, fora do site");
    expect(seloDaPrevia({ estado: "oculto", comAlteracoes: true })).toBe("Prévia · oculta, com alterações não publicadas");
  });

  it("versão: no site agora, a que volta com “Mostrar no site” ou uma antiga", () => {
    expect(seloDaPrevia({ estado: "publicado", comAlteracoes: false, versao: { versao: 3, noAr: true, voltaAoSite: false, criadoEm: QUANDO } })).toBe(
      "Versão 3 · no site agora",
    );
    expect(seloDaPrevia({ estado: "oculto", comAlteracoes: false, versao: { versao: 3, noAr: false, voltaAoSite: true, criadoEm: QUANDO } })).toBe(
      "Versão 3 · volta ao site com “Mostrar no site”",
    );
    expect(seloDaPrevia({ estado: "oculto", comAlteracoes: false, versao: { versao: 1, noAr: false, voltaAoSite: false, criadoEm: QUANDO } })).toMatch(
      /^Versão 1 · publicada em 10\/11\/2026/,
    );
  });
});
