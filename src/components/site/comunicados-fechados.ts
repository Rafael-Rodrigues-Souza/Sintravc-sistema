/**
 * Comunicados que o visitante fechou na faixa (E58). Arquivo sem "use client": o servidor (moldura do
 * site) e o navegador (faixa) usam o mesmo nome e o mesmo formato.
 */
export const COOKIE_COMUNICADOS_FECHADOS = "sintravc_comunicados_fechados";

/** Quantos ids o cookie guarda, no máximo (os mais novos). */
const MAXIMO_NO_COOKIE = 20;

/** Lê o valor do cookie: ids separados por ponto. O que não é id é ignorado. */
export function lerFechados(valor: string | undefined): string[] {
  return (valor ?? "").split(".").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
}

/** O valor novo do cookie: os fechados antes somados aos de agora, sem repetir. */
export function juntarFechados(anteriores: string[], novos: string[]): string {
  return [...new Set([...anteriores, ...novos])].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(-MAXIMO_NO_COOKIE).join(".");
}
