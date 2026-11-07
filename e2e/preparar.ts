import { execSync } from "node:child_process";

import postgres from "postgres";

import { ambienteE2E } from "../playwright.config";

/**
 * Recria o banco sintravc_e2e, aplica as migrações e cria as pessoas de teste (pelas funções
 * do Better Auth). Os dados ficam em e2e/.dados/pessoas.json para os testes.
 */
export default async function preparar() {
  const url = new URL(ambienteE2E.DATABASE_URL);
  const nome = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const conexao = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    await conexao.unsafe(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
    await conexao.unsafe(`CREATE DATABASE "${nome}"`);
  } finally {
    await conexao.end();
  }

  const env = { ...process.env, ...ambienteE2E };
  execSync("pnpm -s db:migrar", { env, stdio: "inherit" });
  execSync("pnpm -s tsx scripts/e2e-pessoas.ts", { env, stdio: "inherit" });
}
