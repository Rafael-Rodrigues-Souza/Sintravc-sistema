/**
 * Motivo do ocultar (RN11, E45). Puro, sem banco: a tela, as server actions e o domínio usam o
 * mesmo limite e a mesma conferência.
 */
import { ErroConteudo } from "./erros";

/** Tamanho máximo do motivo, em caracteres, depois de tirar os espaços das pontas. */
export const MOTIVO_OCULTAR_MAXIMO = 500;

export const MENSAGEM_SEM_MOTIVO = "Escreva o motivo para ocultar.";

/** O motivo sem espaços nas pontas: obrigatório e com limite. */
export function conferirMotivo(motivo: string): string {
  const limpo = motivo.trim();
  if (!limpo) throw new ErroConteudo("invalido", MENSAGEM_SEM_MOTIVO, "motivo");
  if (limpo.length > MOTIVO_OCULTAR_MAXIMO) {
    throw new ErroConteudo("invalido", `O motivo pode ter até ${MOTIVO_OCULTAR_MAXIMO} caracteres.`, "motivo");
  }
  return limpo;
}
