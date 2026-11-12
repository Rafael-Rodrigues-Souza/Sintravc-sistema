export type CodigoErroConteudo = "nao_encontrada" | "invalido";

/** Erro esperado de Conteúdos. A mensagem vai direto para a tela, em linguagem simples. */
export class ErroConteudo extends Error {
  constructor(
    readonly codigo: CodigoErroConteudo,
    mensagem: string,
    /** Com "invalido": o campo do formulário onde mostrar a mensagem. */
    readonly campo?: string,
  ) {
    super(mensagem);
    this.name = "ErroConteudo";
  }
}

/** A notícia arquivada não se edita (RN10, E45): primeiro, restaurar como rascunho. */
export const noticiaArquivada = () =>
  new ErroConteudo("invalido", "Esta notícia está arquivada. Restaure como rascunho para editar.");

export const noticiaNaoEncontrada = () =>
  new ErroConteudo("nao_encontrada", "Esta notícia não existe mais. Volte para Conteúdos e atualize a lista.");
