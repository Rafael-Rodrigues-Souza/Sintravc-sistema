import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { lerEnvBanco } from "@/lib/env";
import * as schema from "./schema";

function criarBanco() {
  const { DATABASE_URL } = lerEnvBanco();
  const conexao = postgres(DATABASE_URL, { max: 10 });
  return drizzle(conexao, { schema, casing: "snake_case" });
}

type Banco = ReturnType<typeof criarBanco>;

// Reaproveita a conexão entre recargas do `next dev`.
const global = globalThis as unknown as { banco?: Banco };

/** Conexão com o Postgres, criada no primeiro uso. */
export function banco(): Banco {
  global.banco ??= criarBanco();
  return global.banco;
}
