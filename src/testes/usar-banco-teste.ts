import { afterAll } from "vitest";

import { fecharBanco } from "@/lib/db";

import { urlBancoTeste } from "./banco-teste";

// Todo teste de integração fala com o banco de teste, nunca com o de desenvolvimento.
// Idempotente: o arquivo roda uma vez por arquivo de teste, no mesmo processo.
process.env.DATABASE_URL_TESTE ??= urlBancoTeste();
process.env.DATABASE_URL = process.env.DATABASE_URL_TESTE;

afterAll(async () => {
  await fecharBanco();
});
