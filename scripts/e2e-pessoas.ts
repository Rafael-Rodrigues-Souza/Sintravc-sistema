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
    // Recuperar acesso (issue #6).
    esqueceu: await criarPessoaDeTeste({ nome: "Sandra Esqueceu", email: "sandra@sintravc.local", perfil: "COM", senha }),
    semCelular: await criarPessoaDeTeste({ nome: "Paulo Sem Celular", email: "paulo@sintravc.local", perfil: "COM", senha }),
    bloqueioAviso: await criarPessoaDeTeste({ nome: "Rita Aviso", email: "rita@sintravc.local", perfil: "COM", senha }),
    // Mídia (issue #7): o Atendimento não entra na Mídia.
    atd: await criarPessoaDeTeste({ nome: "Ana Atendimento", email: "ana@sintravc.local", perfil: "ATD", senha }),
    // Conteúdos (issue #8): outra pessoa da Comunicação edita a notícia do Carlos (RN55).
    com2: await criarPessoaDeTeste({ nome: "Joana Lima", email: "joana@sintravc.local", perfil: "COM", senha }),
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
