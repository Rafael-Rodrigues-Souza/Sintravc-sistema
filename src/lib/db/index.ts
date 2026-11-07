import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { lerEnvBanco } from "@/lib/env";
import * as schema from "./schema";

function criarBanco() {
  const { DATABASE_URL } = lerEnvBanco();
  const conexao = postgres(DATABASE_URL, { max: 10, onnotice: () => {} });
  return drizzle(conexao, { schema, casing: "snake_case" });
}

export type Banco = ReturnType<typeof criarBanco>;

/** Transação aberta com `banco().transaction(async (tx) => …)`. */
export type Transacao = Parameters<Parameters<Banco["transaction"]>[0]>[0];

// Reaproveita a conexão entre recargas do `next dev`.
const global = globalThis as unknown as { banco?: Banco };

/** Conexão com o Postgres, criada no primeiro uso. */
export function banco(): Banco {
  global.banco ??= criarBanco();
  return global.banco;
}

/** Fecha a conexão (scripts de linha de comando e testes). */
export async function fecharBanco() {
  const atual = global.banco;
  global.banco = undefined;
  await atual?.$client.end();
}
