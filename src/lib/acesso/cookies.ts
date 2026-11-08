/** Junta os Set-Cookie de uma resposta num cabeçalho Cookie para a próxima chamada. */
export function cookiesDe(cabecalhos: Headers): string {
  return cabecalhos
    .getSetCookie()
    .map((linha) => linha.split(";")[0])
    .filter((par): par is string => Boolean(par) && !par!.endsWith("="))
    .join("; ");
}
