import { describe, expect, it } from "vitest";

import { cartaoDoDocumento } from "./cartao";
import { documentoVazio } from "./dados";

const AGORA = new Date("2026-10-25T13:00:00Z");

describe("cartaoDoDocumento: o que o cartão da página Documentos mostra (Figma 73:629, 75:1438)", () => {
  it("edital publicado com prazo: etiqueta do tipo, selo Prazo, datas no formato da tela e o PDF", () => {
    const cartao = cartaoDoDocumento({
      tipo: "edital",
      estado: "publicado",
      dados: {
        ...documentoVazio("edital"),
        titulo: "Assembleia Geral Extraordinária",
        numero: "Edital nº 012/2026",
        subtipo: "convocacao",
        resumo: "Convocação de todos os trabalhadores.",
        eventoData: "2026-10-30",
        eventoHora: "19:00",
      },
      publicadoEm: new Date("2026-10-20T12:00:00Z"),
      pdfBytes: 1_258_291,
      hrefs: { abrir: "/abrir", baixar: "/baixar" },
      agora: AGORA,
    });
    expect(cartao).toEqual({
      etiqueta: "Edital de convocação",
      selo: { rotulo: "Prazo", tom: "prazo" },
      titulo: "Assembleia Geral Extraordinária",
      numero: "Edital nº 012/2026",
      resumo: "Convocação de todos os trabalhadores.",
      publicadoEm: "20/10/2026",
      prazo: "30/10/2026 · 19h00",
      vigencia: null,
      abrangencia: null,
      arquivo: "PDF · 1,2 MB",
      hrefAbrir: "/abrir",
      hrefBaixar: "/baixar",
    });
  });

  it("acordo: etiqueta do ACT/CCT, vigência e abrangência; rascunho sem selo nem data de publicação", () => {
    const cartao = cartaoDoDocumento({
      tipo: "acordo",
      estado: "rascunho",
      dados: { ...documentoVazio("acordo"), subtipo: "cct", vigenciaInicio: "2026-05-01", vigenciaFim: "2027-04-30", abrangencia: "Transporte urbano" },
      publicadoEm: null,
      pdfBytes: null,
      hrefs: null,
      agora: AGORA,
    });
    expect(cartao).toMatchObject({
      etiqueta: "Convenção coletiva (CCT)",
      selo: null,
      titulo: "Acordo sem título",
      publicadoEm: null,
      vigencia: "01/05/2026 a 30/04/2027",
      abrangencia: "Transporte urbano",
      arquivo: null,
      hrefAbrir: null,
    });
  });
});
