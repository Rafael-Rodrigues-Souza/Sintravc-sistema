import { unzipSync } from "fflate";
import { fileTypeFromBuffer } from "file-type";
import decodificarHeic from "heic-decode";
import { PDFDocument } from "pdf-lib";
import sharp, { type Sharp } from "sharp";

import { erroDeFormato, erroDeTamanho } from "./erros";

/** Valores do Parametro (midia.*), passados por quem chama. */
export type Limites = { tamanhoMaximoBytes: number; ladoMaximoPx: number; jpgQualidade: number };

export type TipoMidia = "imagem" | "pdf" | "documento";

/** Arquivo pronto para ir ao armazenamento: o tipo e o conteúdo vêm sempre dos bytes, nunca do navegador. */
export type ArquivoPreparado = {
  tipo: TipoMidia;
  mime: string;
  extensao: string;
  nomeArquivo: string;
  conteudo: Uint8Array;
  bytes: number;
  largura?: number;
  altura?: number;
  paginas?: number;
  convertidoDe?: "heic";
};

type Entrada = { bytes: Uint8Array; nome: string };

const IMAGENS = {
  jpg: { mime: "image/jpeg", gravar: (s: Sharp, l: Limites) => s.jpeg({ quality: l.jpgQualidade, mozjpeg: true }) },
  png: { mime: "image/png", gravar: (s: Sharp) => s.png() },
  webp: { mime: "image/webp", gravar: (s: Sharp, l: Limites) => s.webp({ quality: l.jpgQualidade }) },
} as const;

type FormatoImagem = keyof typeof IMAGENS;

/**
 * Confere e prepara um arquivo enviado para a Mídia (RN15, R7, E39).
 * O formato é detectado pelos bytes; a extensão e o tipo mandados pelo navegador não valem.
 * Lança ErroMidia ("formato" ou "tamanho") com a mensagem para a tela.
 */
export async function prepararArquivo(entrada: Entrada, limites: Limites): Promise<ArquivoPreparado> {
  if (entrada.bytes.byteLength > limites.tamanhoMaximoBytes) throw erroDeTamanho(limites.tamanhoMaximoBytes);

  const detectado = await fileTypeFromBuffer(entrada.bytes);
  const ext = detectado?.ext;

  if (ext === "jpg" || ext === "png" || ext === "webp") {
    return prepararImagem(sharp(entrada.bytes, { failOn: "error" }).rotate(), ext, entrada.nome, limites);
  }
  if (ext === "heic") {
    const heic = await decodificarHeic({ buffer: entrada.bytes }).catch(() => {
      throw erroDeFormato(limites.tamanhoMaximoBytes);
    });
    const pixels = sharp(Buffer.from(heic.data.buffer, heic.data.byteOffset, heic.data.byteLength), {
      raw: { width: heic.width, height: heic.height, channels: 4 },
    }).removeAlpha();
    const pronto = await prepararImagem(pixels, "jpg", trocarExtensao(entrada.nome, "jpg"), limites);
    return { ...pronto, convertidoDe: "heic" };
  }
  if (ext === "pdf") {
    const paginas = await contarPaginas(entrada.bytes).catch(() => {
      throw erroDeFormato(limites.tamanhoMaximoBytes);
    });
    return arquivoSemConversao(entrada, "pdf", "application/pdf", "pdf", { paginas });
  }
  if (ext && ext in DOCUMENTOS && !temMacro(entrada.bytes)) {
    const extensao = ext as keyof typeof DOCUMENTOS;
    return arquivoSemConversao(entrada, "documento", DOCUMENTOS[extensao], extensao);
  }

  throw erroDeFormato(limites.tamanhoMaximoBytes);
}

/**
 * Documentos aceitos (E39). O file-type lê o [Content_Types].xml (Office) e o `mimetype` (LibreOffice),
 * então .docm, .xlsm e afins aparecem com a própria extensão e ficam de fora; .doc e .xls (OLE) também.
 */
const DOCUMENTOS = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
} as const;

/** Macro escondida num arquivo com tipo de documento comum: qualquer vbaProject.bin dentro do ZIP. */
function temMacro(bytes: Uint8Array): boolean {
  let achou = false;
  try {
    unzipSync(bytes, {
      filter: (arquivo) => {
        if (/(^|\/)vbaProject\.bin$/i.test(arquivo.name)) achou = true;
        return false; // só olha os nomes, não descompacta nada
      },
    });
  } catch {
    return true;
  }
  return achou;
}

async function contarPaginas(bytes: Uint8Array) {
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return documento.getPageCount();
}

function arquivoSemConversao(
  entrada: Entrada,
  tipo: TipoMidia,
  mime: string,
  extensao: string,
  extra: { paginas?: number } = {},
): ArquivoPreparado {
  return {
    tipo,
    mime,
    extensao,
    nomeArquivo: entrada.nome,
    conteudo: entrada.bytes,
    bytes: entrada.bytes.byteLength,
    ...extra,
  };
}

/** Reduz o lado maior, grava sem metadados (sem GPS) e já com a rotação aplicada. */
async function prepararImagem(
  imagem: Sharp,
  formato: FormatoImagem,
  nomeArquivo: string,
  limites: Limites,
): Promise<ArquivoPreparado> {
  const reduzida = imagem.resize({
    width: limites.ladoMaximoPx,
    height: limites.ladoMaximoPx,
    fit: "inside",
    withoutEnlargement: true,
  });
  const saida = await IMAGENS[formato]
    .gravar(reduzida, limites)
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw erroDeFormato(limites.tamanhoMaximoBytes);
    });
  const conteudo = new Uint8Array(saida.data);
  return {
    tipo: "imagem",
    mime: IMAGENS[formato].mime,
    extensao: formato,
    nomeArquivo,
    conteudo,
    bytes: conteudo.byteLength,
    largura: saida.info.width,
    altura: saida.info.height,
  };
}

function trocarExtensao(nome: string, extensao: string) {
  return `${nome.replace(/\.[^./\\]+$/, "")}.${extensao}`;
}
