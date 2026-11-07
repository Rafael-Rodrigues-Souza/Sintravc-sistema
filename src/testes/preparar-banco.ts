import postgres from "postgres";

import { aplicarMigracoes } from "@/lib/db/migrar";

import { urlBancoTeste } from "./banco-teste";

/** globalSetup do Vitest: recria o banco de teste do zero e aplica as migrações. */
export default async function prepararBanco() {
  const urlTeste = new URL(urlBancoTeste());
  const nome = urlTeste.pathname.slice(1);
  const urlAdmin = new URL(urlTeste);
  urlAdmin.pathname = "/postgres";

  const admin = postgres(urlAdmin.toString(), { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE "${nome}"`);
  } catch (erro) {
    throw new Error(
      `Não consegui preparar o banco de teste em ${urlAdmin.host}. O Postgres está ligado? (docker compose up -d)\n${String(erro)}`,
    );
  } finally {
    await admin.end();
  }

  await aplicarMigracoes(urlTeste.toString());
}
