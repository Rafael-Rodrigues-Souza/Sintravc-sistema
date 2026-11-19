/** Aviso de cookies (RN45, E56): nome do cookie e leitura da escolha. */
export const COOKIE_CONSENTIMENTO = "sintravc_cookies";

export type EscolhaCookies = "essenciais" | "todos";

export function lerEscolha(valor: string | undefined): EscolhaCookies | null {
  return valor === "essenciais" || valor === "todos" ? valor : null;
}
