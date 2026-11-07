import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Aplica as migrações pendentes da pasta drizzle/ no banco indicado. */
export async function aplicarMigracoes(url: string) {
  const conexao = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(conexao), { migrationsFolder: "./drizzle" });
  } finally {
    await conexao.end();
  }
}
