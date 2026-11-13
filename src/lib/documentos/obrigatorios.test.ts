import { describe, expect, it } from "vitest";

import { documentoVazio, type DadosDocumento } from "./dados";
import { faltasParaPublicarDocumento } from "./obrigatorios";

const PDF = "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
const CATEGORIA = "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c";

function editalCompleto(mudancas: Partial<DadosDocumento> = {}): DadosDocumento {
  return {
    ...documentoVazio("edital"),
    titulo: "Edital de convocação · Assembleia geral extraordinária",
    numero: "Edital nº 012/2026",
    subtipo: "convocacao",
    dataDocumento: "2026-10-20",
    resumo: "Convoca os trabalhadores para a assembleia geral.",
    categoriaId: CATEGORIA,
    pdfMidiaId: PDF,
    ...mudancas,
  };
}

function acordoCompleto(mudancas: Partial<DadosDocumento> = {}): DadosDocumento {
  return {
    ...documentoVazio("acordo"),
    titulo: "Convenção coletiva 2026/2027",
    numero: "CCT 2026/2027",
    subtipo: "cct",
    dataDocumento: "2026-05-01",
    vigenciaInicio: "2026-05-01",
    vigenciaFim: "2027-04-30",
    abrangencia: "Transporte coletivo urbano de Vitória da Conquista",
    partesSignatarias: "SINTRAVC e sindicato patronal",
    resumo: "Reajuste e cláusulas sociais.",
    categoriaId: CATEGORIA,
    pdfMidiaId: PDF,
    ...mudancas,
  };
}

const campos = (tipo: "edital" | "acordo", dados: DadosDocumento) => faltasParaPublicarDocumento(tipo, dados).map((f) => f.campo);

describe("faltasParaPublicarDocumento (RF41, RN12, E46)", () => {
  it("edital completo sem vigência pode ser publicado (data do evento é opcional)", () => {
    expect(faltasParaPublicarDocumento("edital", editalCompleto())).toEqual([]);
  });

  it("edital vazio: cobra os campos na ordem da tela", () => {
    expect(faltasParaPublicarDocumento("edital", documentoVazio("edital"))).toEqual([
      { campo: "titulo", rotulo: "Título oficial" },
      { campo: "numero", rotulo: "Número ou identificação" },
      { campo: "subtipo", rotulo: "Tipo de edital" },
      { campo: "dataDocumento", rotulo: "Data do documento" },
      { campo: "resumo", rotulo: "Resumo" },
      { campo: "pdfMidiaId", rotulo: "PDF oficial" },
      { campo: "categoriaId", rotulo: "Categoria" },
    ]);
  });

  it("só espaços conta como vazio", () => {
    expect(campos("edital", editalCompleto({ titulo: "  ", numero: " ", resumo: "\n" }))).toEqual(["titulo", "numero", "resumo"]);
  });

  it("edital com “Tem vigência” ligado cobra início e fim", () => {
    expect(campos("edital", editalCompleto({ temVigencia: true }))).toEqual(["vigenciaInicio", "vigenciaFim"]);
    expect(campos("edital", editalCompleto({ temVigencia: true, vigenciaInicio: "2026-10-20", vigenciaFim: "2026-10-26" }))).toEqual([]);
  });

  it("edital com o interruptor desligado ignora datas de vigência que sobraram", () => {
    expect(campos("edital", editalCompleto({ temVigencia: false, vigenciaInicio: "2026-10-20" }))).toEqual([]);
  });

  it("acordo completo pode ser publicado", () => {
    expect(faltasParaPublicarDocumento("acordo", acordoCompleto())).toEqual([]);
  });

  it("acordo cobra vigência, abrangência e partes signatárias, mesmo com o interruptor desligado", () => {
    expect(
      faltasParaPublicarDocumento(
        "acordo",
        acordoCompleto({ temVigencia: false, vigenciaInicio: "", vigenciaFim: "", abrangencia: "", partesSignatarias: " " }),
      ),
    ).toEqual([
      { campo: "vigenciaInicio", rotulo: "Início da vigência" },
      { campo: "vigenciaFim", rotulo: "Fim da vigência" },
      { campo: "abrangencia", rotulo: "Abrangência" },
      { campo: "partesSignatarias", rotulo: "Partes signatárias" },
    ]);
  });

  it("no acordo o rótulo do tipo é “Tipo de acordo”", () => {
    expect(faltasParaPublicarDocumento("acordo", acordoCompleto({ subtipo: null }))).toEqual([{ campo: "subtipo", rotulo: "Tipo de acordo" }]);
  });
});
