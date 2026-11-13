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

/**
 * Os dados da cópia de trabalho são os mesmos da versão no ar (E47)? Compara o conteúdo, não o
 * número de gravações: mudar e desfazer não deixa aviso. A ordem das chaves não conta (o jsonb do
 * retrato reordena); a das listas, sim. Campo ausente num retrato antigo vale como nulo.
 */
export function mesmoConteudoNoSite(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || a === null || b === undefined || b === null) return (a ?? null) === (b ?? null);
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => mesmoConteudoNoSite(item, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const x = a as Record<string, unknown>;
    const y = b as Record<string, unknown>;
    const chaves = new Set([...Object.keys(x), ...Object.keys(y)]);
    return [...chaves].every((chave) => mesmoConteudoNoSite(x[chave], y[chave]));
  }
  return false;
}
