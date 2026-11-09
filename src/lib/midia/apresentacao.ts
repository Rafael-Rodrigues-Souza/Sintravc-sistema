/** Textos da tela Mídia (Figma 116:2727). Funções puras, testadas. */

const FORMATOS: Record<string, { sigla: string; nome: string }> = {
  "image/jpeg": { sigla: "JPG", nome: "Imagem JPG" },
  "image/png": { sigla: "PNG", nome: "Imagem PNG" },
  "image/webp": { sigla: "WEBP", nome: "Imagem WebP" },
  "application/pdf": { sigla: "PDF", nome: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { sigla: "DOCX", nome: "Documento Word" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { sigla: "XLSX", nome: "Planilha Excel" },
  "application/vnd.oasis.opendocument.text": { sigla: "ODT", nome: "Documento LibreOffice" },
  "application/vnd.oasis.opendocument.spreadsheet": { sigla: "ODS", nome: "Planilha LibreOffice" },
};

export function siglaDoFormato(mime: string): string {
  return FORMATOS[mime]?.sigla ?? "ARQUIVO";
}

export function tipoLegivel(mime: string): string {
  return FORMATOS[mime]?.nome ?? "Arquivo";
}

/** "420 KB", "2,4 MB": base 1024, uma casa decimal só quando ajuda. */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const [valor, unidade] = bytes < 1024 * 1024 ? [bytes / 1024, "KB"] : [bytes / (1024 * 1024), "MB"];
  const arredondado = valor >= 10 ? Math.round(valor) : Math.round(valor * 10) / 10;
  return `${String(arredondado).replace(".", ",")} ${unidade}`;
}

type DadosDoCartao = {
  tipo: "imagem" | "pdf" | "documento";
  mime: string;
  largura: number | null;
  altura: number | null;
  paginas: number | null;
  bytes: number;
};

/** "JPG · 1600 × 900 · 420 KB", "PDF · 6 páginas · 2,4 MB", "XLSX · 35 KB". */
export function linhaDoCartao(item: DadosDoCartao): string {
  const partes = [siglaDoFormato(item.mime)];
  if (item.largura && item.altura) partes.push(`${item.largura} × ${item.altura}`);
  if (item.paginas) partes.push(item.paginas === 1 ? "1 página" : `${item.paginas} páginas`);
  partes.push(tamanhoLegivel(item.bytes));
  return partes.join(" · ");
}
