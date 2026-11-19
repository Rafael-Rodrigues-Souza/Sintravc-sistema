/** Aviso de cookies (RN45, E56): nome do cookie e as escolhas possíveis, num lugar só. */
export const COOKIE_CONSENTIMENTO = "sintravc_cookies";

export const ESCOLHAS_COOKIES = ["essenciais", "todos"] as const;

export type EscolhaCookies = (typeof ESCOLHAS_COOKIES)[number];

export function lerEscolha(valor: string | undefined): EscolhaCookies | null {
  return ESCOLHAS_COOKIES.find((escolha) => escolha === valor) ?? null;
}
