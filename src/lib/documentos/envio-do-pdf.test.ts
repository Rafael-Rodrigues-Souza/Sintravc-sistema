import { describe, expect, it } from "vitest";

import { acaoDoEnvioDoPdf } from "./envio-do-pdf";

describe("acaoDoEnvioDoPdf: qual permissão o envio do PDF confere (RF41, RN08)", () => {
  it("documento novo ou ainda sem PDF: “criar”", () => {
    expect(acaoDoEnvioDoPdf(null)).toBe("criar");
    expect(acaoDoEnvioDoPdf({ pdfMidiaId: null })).toBe("criar");
  });

  it("documento que já tem PDF: “substituir”", () => {
    expect(acaoDoEnvioDoPdf({ pdfMidiaId: "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b" })).toBe("substituir");
  });
});
