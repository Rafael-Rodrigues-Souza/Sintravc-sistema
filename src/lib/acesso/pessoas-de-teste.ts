import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { pessoaEquipe, sessao } from "@/lib/db/schema";
import type { Perfil } from "@/lib/permissoes";

import { auth } from "./auth";

/**
 * Pessoas da equipe para testes e para o desenvolvimento (pnpm dev:pessoas-teste).
 * Nunca em produção: o primeiro ADM real nasce pelo pnpm criar-admin (E33).
 *
 * Faz o mesmo caminho do aceite do convite (#5), pelas funções do Better Auth: cria a senha,
 * ativa as duas etapas e confirma o primeiro código. Nada de SQL à mão nas tabelas de acesso.
 */
export type PessoaDeTeste = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  senha: string;
  /** Segredo TOTP em Base32, o formato que os aplicativos autenticadores aceitam. */
  segredoTotp: string;
  /** Endereço otpauth:// (o conteúdo do QR code). */
  uriTotp: string;
  codigosRecuperacao: string[];
};

export async function criarPessoaDeTeste(dados: {
  nome: string;
  email: string;
  perfil: Perfil;
  senha: string;
}): Promise<PessoaDeTeste> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Pessoas de teste não podem ser criadas em produção. Use pnpm criar-admin (E33).");
  }

  const contexto = await auth().$context;
  const [pessoa] = await banco()
    .insert(pessoaEquipe)
    .values({
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
      situacao: "ativa",
      emailVerificado: true,
    })
    .returning({ id: pessoaEquipe.id });
  if (!pessoa) throw new Error("O banco não devolveu a pessoa criada.");

  await contexto.internalAdapter.linkAccount({
    userId: pessoa.id,
    providerId: "credential",
    accountId: pessoa.id,
    password: await contexto.password.hash(dados.senha),
  });

  // Uma sessão provisória, só para ativar as duas etapas (como no aceite do convite).
  const login = await auth().api.signInEmail({
    body: { email: dados.email, password: dados.senha },
    returnHeaders: true,
  });
  const cabecalhos = new Headers({ cookie: cookiesDe(login.headers) });

  const ativacao = await auth().api.enableTwoFactor({
    body: { password: dados.senha, method: "totp" },
    headers: cabecalhos,
  });
  if (ativacao.method !== "totp") throw new Error("O Better Auth não ativou o TOTP.");
  const segredoTotp = new URL(ativacao.totpURI).searchParams.get("secret");
  if (!segredoTotp) throw new Error("O Better Auth não devolveu o segredo TOTP.");

  await auth().api.verifyTOTP({
    body: { code: await codigoTotp(segredoTotp) },
    headers: cabecalhos,
  });

  // Encerra a sessão provisória: a pessoa entra pelo login normal.
  await banco().delete(sessao).where(eq(sessao.pessoaId, pessoa.id));

  return {
    id: pessoa.id,
    ...dados,
    segredoTotp,
    uriTotp: ativacao.totpURI,
    codigosRecuperacao: ativacao.backupCodes,
  };
}

/** O código de 6 números do momento, como o aplicativo autenticador mostraria. */
export async function codigoTotp(segredoBase32: string): Promise<string> {
  return createOTP(base32.decode(segredoBase32), { digits: 6, period: 30 }).totp();
}

/** Junta os Set-Cookie de uma resposta num cabeçalho Cookie para a próxima chamada. */
export function cookiesDe(cabecalhos: Headers): string {
  return cabecalhos
    .getSetCookie()
    .map((linha) => linha.split(";")[0])
    .filter((par): par is string => Boolean(par) && !par!.endsWith("="))
    .join("; ");
}
