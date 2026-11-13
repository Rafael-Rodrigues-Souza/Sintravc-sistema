import { afterEach, describe, expect, it, vi } from "vitest";

import { pdf, pdfComTexto } from "@/testes/arquivos/gerar";

import { extrairTextoDoPdf } from "./extrair-texto";

const LIMITES = { tempoMaximoMs: 20_000, paginasMaximas: 200 };

describe("extrairTextoDoPdf (P3, T08, E46)", () => {
  afterEach(() => vi.useRealTimers());

  it("lê o texto de todas as páginas, na ordem", async () => {
    const bytes = await pdfComTexto(["Edital de convocação", "Assembleia geral extraordinária"]);
    const resultado = await extrairTextoDoPdf(bytes, LIMITES);
    expect(resultado.temTexto).toBe(true);
    expect(resultado.texto).toMatch(/Edital de convocação[\s\S]*Assembleia geral extraordinária/);
  });

  it("PDF só com imagem (escaneado) volta sem texto", async () => {
    expect(await extrairTextoDoPdf(await pdf(2), LIMITES)).toEqual({ texto: "", temTexto: false, motivo: "sem_texto" });
  });

  it("lê só até o teto de páginas", async () => {
    const bytes = await pdfComTexto(["primeira", "segunda", "terceira"]);
    const resultado = await extrairTextoDoPdf(bytes, { ...LIMITES, paginasMaximas: 2 });
    expect(resultado.texto).toContain("segunda");
    expect(resultado.texto).not.toContain("terceira");
  });

  it("PDF corrompido não derruba o envio: volta sem texto", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nisto não é um pdf de verdade");
    expect(await extrairTextoDoPdf(bytes, LIMITES)).toEqual({ texto: "", temTexto: false, motivo: "erro" });
  });

  it("passou do tempo máximo: desiste e volta sem texto", async () => {
    vi.useFakeTimers();
    const leitorLento = () => new Promise<string>(() => {});
    const promessa = extrairTextoDoPdf(new Uint8Array(), { ...LIMITES, leitor: leitorLento });
    await vi.advanceTimersByTimeAsync(LIMITES.tempoMaximoMs);
    expect(await promessa).toEqual({ texto: "", temTexto: false, motivo: "tempo" });
  });
});
