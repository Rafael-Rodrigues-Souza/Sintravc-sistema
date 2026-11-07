// O banco dos testes de integração. Fica separado do banco de desenvolvimento porque
// a Atividade é só inserção (RN18): o que um teste grava lá não sai mais.
// O Vitest roda com NODE_ENV=test, e nesse modo o .env.local não é lido;
// por isso o padrão aponta para o Postgres do docker compose.
const PADRAO = "postgres://sintravc:sintravc@localhost:5432/sintravc";

/** URL do banco de teste: DATABASE_URL_TESTE ou o banco de DATABASE_URL com o sufixo _teste. */
export function urlBancoTeste(fonte: Record<string, string | undefined> = process.env): string {
  if (fonte.DATABASE_URL_TESTE) return fonte.DATABASE_URL_TESTE;
  const url = new URL(fonte.DATABASE_URL ?? PADRAO);
  url.pathname = `${url.pathname.replace(/^\//, "")}_teste`;
  return url.toString();
}
