import { mkdirSync, writeFileSync } from "node:fs";

import { criarPessoaDeTeste } from "@/lib/acesso/pessoas-de-teste";
import { fecharBanco } from "@/lib/db";

// Chamado por e2e/preparar.ts (com o ambiente do e2e): cria as pessoas de teste do Playwright.
async function main() {
  const senha = "SenhaDeTeste2026";
  const pessoas = {
    adm: await criarPessoaDeTeste({ nome: "Mariana Souza", email: "mariana@sintravc.local", perfil: "ADM", senha }),
    com: await criarPessoaDeTeste({ nome: "Carlos Ribeiro", email: "carlos@sintravc.local", perfil: "COM", senha }),
    bloqueio: await criarPessoaDeTeste({ nome: "Bruna Bloqueio", email: "bruna@sintravc.local", perfil: "COM", senha }),
    expira: await criarPessoaDeTeste({ nome: "Eduardo Expira", email: "eduardo@sintravc.local", perfil: "ADM", senha }),
  };
  mkdirSync("e2e/.dados", { recursive: true });
  writeFileSync("e2e/.dados/pessoas.json", JSON.stringify(pessoas, null, 2));
}

main()
  .catch((erro: unknown) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => fecharBanco());
