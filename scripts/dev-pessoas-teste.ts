import "./carregar-env";

import { parseArgs } from "node:util";

import { inArray } from "drizzle-orm";
import QRCode from "qrcode";

import { criarPessoaDeTeste, type PessoaDeTeste } from "@/lib/acesso/pessoas-de-teste";
import { banco, fecharBanco } from "@/lib/db";
import { pessoaEquipe } from "@/lib/db/schema";

// SÓ PARA DESENVOLVIMENTO. Cria um Administrador geral e uma pessoa da Comunicação com senha
// conhecida e as duas etapas ativas, para entrar no painel à mão antes do aceite do convite (#5).
// O primeiro ADM de verdade nasce pelo pnpm criar-admin (E33).
//
// Uso: pnpm dev:pessoas-teste [--recriar]
const SENHA = "Sintravc2026teste";
const PESSOAS = [
  { nome: "Ana Admin (teste)", email: "adm@sintravc.local", perfil: "ADM" as const },
  { nome: "Carlos Comunicação (teste)", email: "com@sintravc.local", perfil: "COM" as const },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este comando é só para desenvolvimento e não roda com NODE_ENV=production.");
  }
  const { values } = parseArgs({ options: { recriar: { type: "boolean", default: false } } });
  const emails = PESSOAS.map((p) => p.email);

  const existentes = await banco()
    .select({ email: pessoaEquipe.email })
    .from(pessoaEquipe)
    .where(inArray(pessoaEquipe.email, emails));
  if (existentes.length > 0) {
    if (!values.recriar) {
      throw new Error(
        `Já existem pessoas de teste (${existentes.map((e) => e.email).join(", ")}). Para criar de novo, com segredos novos: pnpm dev:pessoas-teste --recriar`,
      );
    }
    // Apaga a pessoa; sessões, senha e duas etapas vão junto (cascade). A Atividade fica.
    await banco().delete(pessoaEquipe).where(inArray(pessoaEquipe.email, emails));
  }

  for (const dados of PESSOAS) {
    const pessoa = await criarPessoaDeTeste({ ...dados, senha: SENHA });
    await mostrar(pessoa);
  }
  console.log("Entre em http://localhost:3000/painel/entrar com o e-mail, a senha e o código do aplicativo.");
}

async function mostrar(p: PessoaDeTeste) {
  console.log("".padEnd(60, "─"));
  console.log(`${p.nome} · perfil ${p.perfil}`);
  console.log(`  E-mail: ${p.email}`);
  console.log(`  Senha:  ${p.senha}`);
  console.log(`  Segredo das duas etapas (digite no aplicativo, se não der para ler o QR): ${p.segredoTotp}`);
  console.log(`  Códigos de recuperação: ${p.codigosRecuperacao.join(" ")}`);
  console.log("  QR code para o aplicativo autenticador:");
  console.log(await QRCode.toString(p.uriTotp, { type: "terminal", small: true }));
}

main()
  .catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => fecharBanco());
