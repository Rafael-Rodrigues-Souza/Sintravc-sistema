import { describe, expect, it } from "vitest";

import { ErroConteudo } from "@/lib/conteudos/erros";

import { conferirDocumento, normalizarNumero } from "./conferir";
import { documentoVazio, LIMITE_RESUMO, type DadosDocumento } from "./dados";

function erroDe(fn: () => unknown): { campo?: string; mensagem: string } {
  try {
    fn();
  } catch (erro) {
    if (erro instanceof ErroConteudo) return { campo: erro.campo, mensagem: erro.message };
    throw erro;
  }
  throw new Error("não deu erro");
}

const edital = (mudancas: Partial<DadosDocumento>) => ({ ...documentoVazio("edital"), ...mudancas });

describe("normalizarNumero (E46)", () => {
  it("ignora espaços nas pontas e repetidos, e maiúsculas", () => {
    expect(normalizarNumero("  Edital  nº 012/2026 ")).toBe("edital nº 012/2026");
    expect(normalizarNumero("EDITAL Nº 012/2026")).toBe(normalizarNumero("edital nº 012/2026"));
  });

  it("número vazio não tem forma normalizada (fica fora da unicidade)", () => {
    expect(normalizarNumero("   ")).toBeNull();
  });
});

describe("conferirDocumento (RF41, E46)", () => {
  it("rascunho vazio passa", () => {
    expect(conferirDocumento("edital", documentoVazio("edital"))).toEqual(documentoVazio("edital"));
  });

  it("tira os espaços das pontas", () => {
    expect(conferirDocumento("edital", edital({ titulo: "  Edital  ", numero: " 12/2026 " }))).toMatchObject({
      titulo: "Edital",
      numero: "12/2026",
    });
  });

  it("resumo acima do limite aponta o campo", () => {
    expect(erroDe(() => conferirDocumento("edital", edital({ resumo: "a".repeat(LIMITE_RESUMO + 1) })))).toEqual({
      campo: "resumo",
      mensagem: "O resumo pode ter até 400 caracteres.",
    });
  });

  it("o tipo de edital não aceita ACT ou CCT, e o acordo não aceita tipos de edital", () => {
    expect(erroDe(() => conferirDocumento("edital", edital({ subtipo: "cct" }))).campo).toBe("subtipo");
    expect(erroDe(() => conferirDocumento("acordo", { ...documentoVazio("acordo"), subtipo: "eleicao" })).campo).toBe("subtipo");
  });

  it("data que não existe aponta o campo", () => {
    expect(erroDe(() => conferirDocumento("edital", edital({ dataDocumento: "2026-02-30" })))).toEqual({
      campo: "dataDocumento",
      mensagem: "Confira a data do documento.",
    });
  });

  it("fim da vigência antes do início não é aceito, nem no rascunho", () => {
    expect(
      erroDe(() => conferirDocumento("edital", edital({ temVigencia: true, vigenciaInicio: "2026-10-26", vigenciaFim: "2026-10-20" }))),
    ).toEqual({ campo: "vigenciaFim", mensagem: "O fim da vigência não pode ser antes do início." });
  });

  it("no edital, desligar a vigência limpa as datas de vigência", () => {
    expect(
      conferirDocumento("edital", edital({ temVigencia: false, vigenciaInicio: "2026-10-20", vigenciaFim: "2026-10-26" })),
    ).toMatchObject({ temVigencia: false, vigenciaInicio: "", vigenciaFim: "" });
  });

  it("no acordo a vigência vale sempre", () => {
    expect(conferirDocumento("acordo", { ...documentoVazio("acordo"), temVigencia: false })).toMatchObject({ temVigencia: true });
  });

  it("data do evento sem hora (ou hora sem data) aponta o campo que falta", () => {
    expect(erroDe(() => conferirDocumento("edital", edital({ eventoData: "2026-10-30" })))).toEqual({
      campo: "eventoHora",
      mensagem: "Informe a hora do evento ou prazo.",
    });
    expect(erroDe(() => conferirDocumento("edital", edital({ eventoHora: "19:00" }))).campo).toBe("eventoData");
  });

  it("formato estranho vindo da tela é recusado", () => {
    expect(() => conferirDocumento("edital", { ...edital({}), temVigencia: "sim" } as unknown as DadosDocumento)).toThrow(ErroConteudo);
  });
});
