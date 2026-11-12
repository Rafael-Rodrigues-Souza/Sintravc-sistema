import { describe, expect, it } from "vitest";

import { noticiaVazia, type DadosNoticia } from "./dados";
import { resumirMudancas, versaoNaTela } from "./versoes";

const v1: DadosNoticia = { ...noticiaVazia(), titulo: "Assembleia no sábado", lide: "Lide.", linhaFina: "Linha fina." };

describe("resumirMudancas (Histórico de versões, N14)", () => {
  it("a primeira versão é a primeira publicação", () => {
    expect(resumirMudancas(null, v1)).toBe("Primeira publicação.");
  });

  it("lista o que mudou, na ordem do editor", () => {
    expect(resumirMudancas(v1, { ...v1, linhaFina: "Outra.", lide: "Outro." })).toBe("Mudou: linha fina e lide.");
    expect(resumirMudancas(v1, { ...v1, titulo: "Nova", lide: "Outro.", assinatura: "Redação" })).toBe(
      "Mudou: manchete, lide e assinatura.",
    );
  });

  it("capa, texto alternativo e legenda contam como imagem de capa uma vez só", () => {
    expect(resumirMudancas(v1, { ...v1, capaAlt: "Motoristas", capaLegenda: "Foto: Ana" })).toBe("Mudou: imagem de capa.");
  });

  it("sem diferença no que o site mostra", () => {
    expect(resumirMudancas(v1, { ...v1 })).toBe("Sem mudanças no texto.");
  });
});

describe("versaoNaTela: a versão como o Histórico recebe (N14)", () => {
  it("só os campos do painel, com a data em texto ISO (sem os dados da versão)", () => {
    const criadoEm = new Date("2026-11-10T13:06:00Z");
    // A versão vem do domínio com os dados junto; o painel não precisa deles.
    const doDominio = { versao: 2, criadoPorNome: "Mariana Souza", criadoEm, noAr: true, voltaAoSite: false, resumo: "Mudou: resumo.", dados: { x: 1 } };
    expect(versaoNaTela(doDominio)).toEqual({ versao: 2, criadoPorNome: "Mariana Souza", criadoEm: "2026-11-10T13:06:00.000Z", noAr: true, voltaAoSite: false, resumo: "Mudou: resumo." });
  });
});
