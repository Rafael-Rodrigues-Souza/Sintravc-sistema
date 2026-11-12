/**
 * Situação da publicação (E42). Usado no editor e na prévia; nada aqui importa código de servidor.
 */
import type { EstadoConteudo } from "./listar";

/** Publicada ou oculta: já foi ao ar e tem uma versão para voltar ao site (E45). */
export function jaFoiAoAr(estado: EstadoConteudo): boolean {
  return estado === "publicado" || estado === "oculto";
}

/**
 * A cópia de trabalho tem mudanças salvas que ainda não foram ao ar. Vale para a publicada e para a
 * oculta: "Mostrar no site" volta a versão que estava no ar, sem essas mudanças (E45).
 */
export function temAlteracoesNaoPublicadas(conteudo: {
  estado: EstadoConteudo;
  revisao: number;
  revisaoPublicada: number | null;
}): boolean {
  return (
    jaFoiAoAr(conteudo.estado) &&
    conteudo.revisaoPublicada !== null &&
    conteudo.revisao > conteudo.revisaoPublicada
  );
}
