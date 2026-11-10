import postgres from "postgres";

import { ambienteE2E } from "../playwright.config";

/**
 * Apaga o banco dos testes antes de o servidor subir. Assim a fila de tarefas (E44) não liga no
 * banco da rodada anterior, que o e2e/preparar.ts recria logo depois: ela tenta de novo a cada
 * 10 s e liga quando as migrações terminam.
 */
export async function apagarBancoE2E() {
  const url = new URL(ambienteE2E.DATABASE_URL);
  const nome = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const conexao = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    await conexao.unsafe(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
  } finally {
    await conexao.end();
  }
}

if (process.argv[1]?.endsWith("apagar-banco.ts")) {
  apagarBancoE2E().catch((erro) => {
    console.error("Não consegui apagar o banco dos testes. O Postgres está ligado? (docker compose up -d)", erro);
    process.exit(1);
  });
}
