/**
 * Situação da publicação (E42). Usado no editor e na prévia; nada aqui importa código de servidor.
 */
import type { EstadoConteudo } from "./listar";

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
    (conteudo.estado === "publicado" || conteudo.estado === "oculto") &&
    conteudo.revisaoPublicada !== null &&
    conteudo.revisao > conteudo.revisaoPublicada
  );
}
