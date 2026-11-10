/**
 * Situação da publicação (E42). Usado no editor e na prévia; nada aqui importa código de servidor.
 */
import type { EstadoConteudo } from "./listar";

/** A cópia de trabalho tem mudanças salvas que ainda não foram ao ar. */
export function temAlteracoesNaoPublicadas(conteudo: {
  estado: EstadoConteudo;
  revisao: number;
  revisaoPublicada: number | null;
}): boolean {
  return conteudo.estado === "publicado" && conteudo.revisaoPublicada !== null && conteudo.revisao > conteudo.revisaoPublicada;
}
