/**
 * Texto pesquisável do documento oficial, lido do PDF no envio (P3, T08, E46). Nunca impede o
 * envio: PDF escaneado, corrompido, grande demais ou lento volta sem texto, e a tela pede para a
 * pessoa digitar as palavras principais. Os limites vêm do Parametro (T4).
 */
import { getDocumentProxy } from "unpdf";

import { LIMITE_TEXTO_PESQUISAVEL } from "./dados";

export type TextoExtraido =
  | { texto: string; temTexto: true }
  | { texto: ""; temTexto: false; motivo: "sem_texto" | "tempo" | "erro" };

/** Lê o texto das primeiras `paginasMaximas` páginas. Trocável no teste. */
export type LeitorDePdf = (bytes: Uint8Array, paginasMaximas: number, cancelado: () => boolean) => Promise<string>;

const lerComPdfJs: LeitorDePdf = async (bytes, paginasMaximas, cancelado) => {
  // O pdf.js toma posse do buffer: passa uma cópia para não estragar os bytes do envio.
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  try {
    const partes: string[] = [];
    const total = Math.min(doc.numPages, paginasMaximas);
    for (let numero = 1; numero <= total && !cancelado(); numero++) {
      const pagina = await doc.getPage(numero);
      const conteudo = await pagina.getTextContent();
      partes.push(conteudo.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      pagina.cleanup();
    }
    return partes.join("\n\n");
  } finally {
    await doc.loadingTask.destroy();
  }
};

/** Junta espaços e linhas em branco que o pdf.js deixa sobrando. */
function arrumar(texto: string): string {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, LIMITE_TEXTO_PESQUISAVEL);
}

export async function extrairTextoDoPdf(
  bytes: Uint8Array,
  opcoes: { tempoMaximoMs: number; paginasMaximas: number; leitor?: LeitorDePdf },
): Promise<TextoExtraido> {
  const leitor = opcoes.leitor ?? lerComPdfJs;
  let cancelado = false;
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const tempo = new Promise<"tempo">((resolver) => {
    relogio = setTimeout(() => resolver("tempo"), opcoes.tempoMaximoMs);
  });
  try {
    const lido = await Promise.race([leitor(bytes, opcoes.paginasMaximas, () => cancelado), tempo]);
    if (lido === "tempo") {
      cancelado = true;
      return { texto: "", temTexto: false, motivo: "tempo" };
    }
    const texto = arrumar(lido);
    return texto === "" ? { texto: "", temTexto: false, motivo: "sem_texto" } : { texto, temTexto: true };
  } catch {
    return { texto: "", temTexto: false, motivo: "erro" };
  } finally {
    clearTimeout(relogio);
  }
}
