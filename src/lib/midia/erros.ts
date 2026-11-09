/** Um lugar onde o arquivo está em uso (notícia, documento, parceiro…), para a tela "Usado em". */
export type UsoDaMidia = { donoTipo: string; donoId: string; rotulo: string; href?: string };

export type CodigoErroMidia = "formato" | "tamanho" | "em_uso" | "nao_encontrada" | "invalido";

/** Erro esperado da Mídia. A mensagem vai direto para a tela, em linguagem simples. */
export class ErroMidia extends Error {
  constructor(
    readonly codigo: CodigoErroMidia,
    mensagem: string,
    readonly usos: UsoDaMidia[] = [],
    /** Com "invalido": o campo do formulário onde mostrar a mensagem. */
    readonly campo?: string,
  ) {
    super(mensagem);
    this.name = "ErroMidia";
  }
}

/** "10 MB" a partir do limite em bytes do Parametro. */
export function megabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1).replace(".", ",")} MB`;
}

export function erroDeFormato(tamanhoMaximoBytes: number) {
  return new ErroMidia(
    "formato",
    `Formato não aceito. Envie imagem (JPG, PNG, WebP ou HEIC), PDF ou documento (Word, Excel, LibreOffice) até ${megabytes(tamanhoMaximoBytes)}.`,
  );
}

export function erroDeTamanho(tamanhoMaximoBytes: number) {
  return new ErroMidia(
    "tamanho",
    `Arquivo maior que ${megabytes(tamanhoMaximoBytes)}. Reduza o arquivo ou envie outro de até ${megabytes(tamanhoMaximoBytes)}.`,
  );
}
