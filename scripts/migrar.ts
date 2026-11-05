import "./carregar-env";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { lerEnvBanco } from "@/lib/env";

async function main() {
  const { DATABASE_URL } = lerEnvBanco();
  const conexao = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(conexao), { migrationsFolder: "./drizzle" });
    console.log("Migrações aplicadas.");
  } finally {
    await conexao.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao aplicar as migrações:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
