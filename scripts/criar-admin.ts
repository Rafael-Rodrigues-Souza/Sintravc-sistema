import "./carregar-env";

import { parseArgs } from "node:util";

import { fecharBanco } from "@/lib/db";
import { criarConviteAdmin, ErroCriarAdmin } from "@/lib/equipe/convite";
import { lerEnvSite } from "@/lib/env";

// Cria o convite de um Administrador geral (E33). É o caminho do primeiro ADM em
// desenvolvimento, homologação e produção: nada de SQL manual.
//
// Uso: pnpm criar-admin --email ana@sintravc.org.br --nome "Ana Souza" [--sem-email]
const USO = 'Uso: pnpm criar-admin --email <e-mail> --nome "<nome>" [--sem-email]';

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      nome: { type: "string" },
      "sem-email": { type: "boolean", default: false },
    },
  });

  if (values.email === undefined || values.nome === undefined) {
    throw new ErroCriarAdmin(`Faltou ${values.email === undefined ? "--email" : "--nome"}.\n${USO}`);
  }

  const enviarEmail = !values["sem-email"];
  const { URL_SITE } = lerEnvSite();
  const resultado = await criarConviteAdmin(
    { email: values.email, nome: values.nome, enviarEmail },
    { urlSite: URL_SITE },
  );

  const vence = resultado.expiraEm.toLocaleString("pt-BR", { timeZone: "America/Bahia" });
  console.log(`Convite de Administrador geral criado para ${values.email.trim()}.`);
  console.log(`Link (vale até ${vence}, horário da Bahia, e só pode ser usado uma vez):`);
  console.log(`  ${resultado.link}`);
  console.log(
    resultado.emailEnviado
      ? "O mesmo link foi enviado por e-mail."
      : "Nenhum e-mail foi enviado (--sem-email). Entregue o link à pessoa por um canal seguro.",
  );
}

main()
  .catch((erro: unknown) => {
    if (erro instanceof ErroCriarAdmin) {
      console.error(erro.message);
    } else {
      console.error("Falha ao criar o convite. Nada foi gravado.", erro instanceof Error ? erro.message : erro);
    }
    process.exitCode = 1;
  })
  .finally(() => fecharBanco());
