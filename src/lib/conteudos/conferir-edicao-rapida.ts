/**
 * O que a Edição rápida confere na tela antes de salvar ou de abrir a confirmação de ocultar e
 * mostrar no site (E23: o erro fica no campo, não num aviso). O servidor confere de novo (RNF01).
 * Puro, sem banco.
 */
import { LIMITE_MANCHETE } from "./dados";
import type { EstadoConteudo } from "./listar";
import { jaFoiAoAr } from "./publicacao";

export type ErroDoCampo = { campo: "titulo" | "categoriaId"; mensagem: string };

export function conferirEdicaoRapida(entrada: {
  titulo: string;
  categoriaId: string;
  /** Situação escolhida na tela. */
  situacao: "rascunho" | "agendado" | "publicado" | "oculto";
  /** Estado em que a notícia está. */
  estado: EstadoConteudo;
}): ErroDoCampo | null {
  if (entrada.titulo.length > LIMITE_MANCHETE) {
    return { campo: "titulo", mensagem: `A manchete pode ter até ${LIMITE_MANCHETE} caracteres.` };
  }
  if ((entrada.situacao !== "rascunho" || jaFoiAoAr(entrada.estado)) && !entrada.categoriaId) {
    return { campo: "categoriaId", mensagem: "Escolha a categoria." };
  }
  return null;
}
