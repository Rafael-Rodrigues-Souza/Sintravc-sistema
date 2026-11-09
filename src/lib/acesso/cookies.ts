/** Junta os Set-Cookie de uma resposta num cabeçalho Cookie para a próxima chamada. */
export function cookiesDe(cabecalhos: Headers): string {
  return cabecalhos
    .getSetCookie()
    .map((linha) => linha.split(";")[0])
    .filter((par): par is string => Boolean(par) && !par!.endsWith("="))
    .join("; ");
}

/** Prefixo dos cookies do Better Auth no painel (auth.ts). */
export const PREFIXO_COOKIE = "sintravc";

/**
 * Cookie do desafio das duas etapas, aberto quando a senha está certa. Em HTTPS o Better Auth
 * acrescenta "__Secure-" ao nome, por isso são dois.
 */
export const COOKIES_DO_DESAFIO = [`${PREFIXO_COOKIE}.two_factor`, `__Secure-${PREFIXO_COOKIE}.two_factor`] as const;
