import { ehUuid } from "@/lib/uuid";

/**
 * Comunicados que o visitante fechou na faixa (E58). Arquivo sem "use client": o servidor (moldura do
 * site) e o navegador (faixa) usam o mesmo nome e o mesmo formato.
 */
export const COOKIE_COMUNICADOS_FECHADOS = "sintravc_comunicados_fechados";

/**
 * Quantos ids o cookie guarda, no máximo (os mais novos). Limite técnico, não regra: cada id ocupa 37
 * caracteres, e 20 ficam em ~740 bytes, longe dos 4 KB que o navegador aceita por cookie. Por isso fica
 * fixo aqui, e não na tabela Parametro.
 */
const MAXIMO_NO_COOKIE = 20;

/** Lê o valor do cookie: ids separados por ponto. O que não é id é ignorado. */
export function lerFechados(valor: string | undefined): string[] {
  return (valor ?? "").split(".").filter(ehUuid);
}

/** O valor novo do cookie: os fechados antes somados aos de agora, sem repetir. */
export function juntarFechados(anteriores: string[], novos: string[]): string {
  return [...new Set([...anteriores, ...novos])].filter(ehUuid).slice(-MAXIMO_NO_COOKIE).join(".");
}
