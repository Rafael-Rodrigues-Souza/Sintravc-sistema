import exifr from "exifr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { heicDeExemplo, imagem, jpgComGps, office, ole, openDocument, pdf, svg } from "@/testes/arquivos/gerar";

import { ErroMidia } from "./erros";

import { prepararArquivo, type Limites } from "./preparar";

const limites: Limites = { tamanhoMaximoBytes: 10 * 1024 * 1024, ladoMaximoPx: 2400, jpgQualidade: 82 };

describe("prepararArquivo · imagens (RN15)", () => {
  it("CA-US27.1: converte o HEIC do iPhone para JPG, reduzido, sem GPS", async () => {
    const pronto = await prepararArquivo(
      { bytes: heicDeExemplo(), nome: "foto-assembleia.heic" },
      { ...limites, ladoMaximoPx: 1000 },
    );

    expect(pronto).toMatchObject({
      tipo: "imagem",
      mime: "image/jpeg",
      extensao: "jpg",
      nomeArquivo: "foto-assembleia.jpg",
      convertidoDe: "heic",
      largura: 1000,
      altura: 667,
    });
    const meta = await sharp(pronto.conteudo).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1000, 667]);
    expect(pronto.bytes).toBe(pronto.conteudo.byteLength);
    expect(await exifr.gps(Buffer.from(pronto.conteudo))).toBeUndefined();
  });

  it("gira a foto do celular, reduz o lado maior a 2400 px e tira o GPS, mantendo o JPG", async () => {
    const original = await jpgComGps(4000, 3000);
    expect(await exifr.gps(Buffer.from(original))).toMatchObject({ latitude: -14.85 });

    const pronto = await prepararArquivo({ bytes: original, nome: "frota.jpeg" }, limites);

    // Orientation 6: a foto estava deitada; em pé fica 3000 × 4000 → reduzida para 1800 × 2400.
    expect(pronto).toMatchObject({ tipo: "imagem", mime: "image/jpeg", extensao: "jpg", largura: 1800, altura: 2400 });
    expect(pronto.nomeArquivo).toBe("frota.jpeg");
    expect(pronto.convertidoDe).toBeUndefined();
    expect(await exifr.gps(Buffer.from(pronto.conteudo))).toBeUndefined();
    expect((await sharp(pronto.conteudo).metadata()).orientation).toBeUndefined();
  });

  it.each([
    ["png", "image/png"],
    ["webp", "image/webp"],
  ] as const)("aceita %s e mantém o formato", async (formato, mime) => {
    const pronto = await prepararArquivo({ bytes: await imagem(formato, 300, 200), nome: `logo.${formato}` }, limites);
    expect(pronto).toMatchObject({ tipo: "imagem", mime, extensao: formato, largura: 300, altura: 200 });
  });

  it("o tipo vem dos bytes: um PNG chamado .jpg continua PNG", async () => {
    const pronto = await prepararArquivo({ bytes: await imagem("png"), nome: "foto.jpg" }, limites);
    expect(pronto.mime).toBe("image/png");
    expect(pronto.extensao).toBe("png");
  });
});

describe("prepararArquivo · PDF e documentos (RF48, E39)", () => {
  it("aceita PDF e conta as páginas", async () => {
    const pronto = await prepararArquivo({ bytes: await pdf(3), nome: "edital-012-2026.pdf" }, limites);
    expect(pronto).toMatchObject({ tipo: "pdf", mime: "application/pdf", extensao: "pdf", paginas: 3 });
    expect(pronto.nomeArquivo).toBe("edital-012-2026.pdf");
    expect(pronto.largura).toBeUndefined();
  });

  it.each([
    ["docx", () => office("docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["xlsx", () => office("xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["odt", () => openDocument("odt"), "application/vnd.oasis.opendocument.text"],
    ["ods", () => openDocument("ods"), "application/vnd.oasis.opendocument.spreadsheet"],
  ] as const)("aceita %s como documento, sem conversão", async (extensao, gerar, mime) => {
    const bytes = gerar();
    const pronto = await prepararArquivo({ bytes, nome: `ata.${extensao}` }, limites);
    expect(pronto).toMatchObject({ tipo: "documento", mime, extensao });
    expect(pronto.conteudo).toEqual(bytes);
  });
});

describe("prepararArquivo · recusas", () => {
  const mensagemDeFormato =
    "Formato não aceito. Envie imagem (JPG, PNG, WebP ou HEIC), PDF ou documento (Word, Excel, LibreOffice) até 10 MB.";

  it.each([
    ["GIF", "convite-assembleia.gif", () => imagem("gif")],
    ["AVIF", "foto.avif", () => imagem("avif")],
    ["SVG (pode ter script)", "logo.svg", async () => svg()],
    ["Word com macro (.docm) renomeado para .docx", "ata.docx", async () => office("docm")],
    ["Excel com macro (.xlsm)", "planilha.xlsx", async () => office("xlsm")],
    ["DOCX com vbaProject.bin escondido", "ata.docx", async () => office("docx", { comMacro: true })],
    ["Word/Excel antigo (.doc/.xls, OLE)", "ata.doc", async () => ole()],
    ["texto qualquer", "notas.txt", async () => new TextEncoder().encode("oi")],
  ])("recusa %s com a mensagem de formato", async (_caso, nome, gerar) => {
    const promessa = prepararArquivo({ bytes: await gerar(), nome }, limites);
    await expect(promessa).rejects.toBeInstanceOf(ErroMidia);
    await expect(promessa).rejects.toMatchObject({ codigo: "formato", message: mensagemDeFormato });
  });

  it("recusa arquivo acima do limite do Parametro (R7)", async () => {
    const bytes = await pdf(1);
    const promessa = prepararArquivo({ bytes, nome: "grande.pdf" }, { ...limites, tamanhoMaximoBytes: bytes.length - 1 });
    await expect(promessa).rejects.toMatchObject({ codigo: "tamanho" });
  });

  it("aceita arquivo com exatamente o limite", async () => {
    const bytes = await pdf(1);
    const pronto = await prepararArquivo({ bytes, nome: "certo.pdf" }, { ...limites, tamanhoMaximoBytes: bytes.length });
    expect(pronto.tipo).toBe("pdf");
  });
});
