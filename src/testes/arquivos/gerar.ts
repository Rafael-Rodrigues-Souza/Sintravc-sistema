import { readFileSync } from "node:fs";
import { join } from "node:path";

import { strToU8, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

/**
 * Arquivos de teste da Mídia. Só o HEIC é um arquivo de verdade (ver LEIAME.md);
 * os outros são gerados aqui, para o repositório não guardar binários sem necessidade.
 */
const pasta = join(process.cwd(), "src", "testes", "arquivos");

/** Exemplo do libheif (MIT): 1280 × 854, sem EXIF nem GPS. */
export function heicDeExemplo(): Uint8Array {
  return new Uint8Array(readFileSync(join(pasta, "exemplo.heic")));
}

/** Foto "de celular": deitada (EXIF Orientation 6) e com GPS de Vitória da Conquista. */
export async function jpgComGps(largura = 4000, altura = 3000): Promise<Uint8Array> {
  const buffer = await sharp({ create: { width: largura, height: altura, channels: 3, background: "#c33" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExif({
      IFD0: { Make: "Apple" },
      IFD3: {
        GPSLatitudeRef: "S",
        GPSLatitude: "14/1 51/1 0/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "40/1 50/1 0/1",
      },
    })
    .toBuffer();
  return new Uint8Array(buffer);
}

export async function imagem(formato: "png" | "webp" | "gif" | "avif", largura = 300, altura = 200) {
  const base = sharp({ create: { width: largura, height: altura, channels: 3, background: "#036" } });
  return new Uint8Array(await base.toFormat(formato).toBuffer());
}

export function svg(): Uint8Array {
  return strToU8('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
}

export async function pdf(paginas: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) doc.addPage();
  return doc.save();
}

const TIPOS_OOXML = {
  docx: ["word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"],
  docm: ["word/document.xml", "application/vnd.ms-word.document.macroEnabled.main+xml"],
  xlsx: ["xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"],
  xlsm: ["xl/workbook.xml", "application/vnd.ms-excel.sheet.macroEnabled.main+xml"],
} as const;

/** Documento do Office mínimo (ZIP com [Content_Types].xml). `comMacro` inclui um vbaProject.bin. */
export function office(tipo: keyof typeof TIPOS_OOXML, { comMacro = false } = {}): Uint8Array {
  const [parte, contentType] = TIPOS_OOXML[tipo];
  const tipos =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    `<Override PartName="/${parte}" ContentType="${contentType}"/></Types>`;
  return zipSync({
    "[Content_Types].xml": strToU8(tipos),
    [parte]: strToU8("<x/>"),
    ...(comMacro ? { "word/vbaProject.bin": new Uint8Array([1, 2, 3]) } : {}),
  });
}

/** Documento do LibreOffice mínimo: o arquivo `mimetype` vem primeiro e sem compressão. */
export function openDocument(tipo: "odt" | "ods"): Uint8Array {
  const mime =
    tipo === "odt" ? "application/vnd.oasis.opendocument.text" : "application/vnd.oasis.opendocument.spreadsheet";
  return zipSync({ mimetype: [strToU8(mime), { level: 0 }], "content.xml": strToU8("<x/>") });
}

/** Cabeçalho de um arquivo OLE (Word 97–2003, .doc / .xls). */
export function ole(): Uint8Array {
  const bytes = new Uint8Array(2048);
  bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  return bytes;
}
