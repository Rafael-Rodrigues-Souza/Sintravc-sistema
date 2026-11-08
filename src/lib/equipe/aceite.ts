import { and, eq, gt, isNull } from "drizzle-orm";

import { banco } from "@/lib/db";
import { convite, pessoaEquipe } from "@/lib/db/schema";
import type { Perfil } from "@/lib/permissoes";

import { hashDoToken } from "./convite";

/**
 * Aceite do convite da equipe (RN46, RF72; US40). O token do link é a credencial do fluxo
 * inteiro: cada passo confere de novo se o convite existe, não venceu, não foi usado e a pessoa
 * ainda está pendente. O convite só é marcado como usado no fim, em concluirConvite() (E37).
 */

export type PessoaConvidada = { id: string; nome: string; email: string; perfil: Perfil };
export type ConviteAberto = { tipo: "valido"; conviteId: string; pessoa: PessoaConvidada } | { tipo: "invalido" };

/** Vencido, usado, inexistente ou de quem não está mais pendente: a mesma resposta (CA-US40.4). */
export async function abrirConvite(token: string, agora = new Date()): Promise<ConviteAberto> {
  if (!token) return { tipo: "invalido" };
  const [linha] = await banco()
    .select({
      conviteId: convite.id,
      id: pessoaEquipe.id,
      nome: pessoaEquipe.nome,
      email: pessoaEquipe.email,
      perfil: pessoaEquipe.perfil,
      situacao: pessoaEquipe.situacao,
    })
    .from(convite)
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, convite.pessoaId))
    .where(and(eq(convite.tokenHash, hashDoToken(token)), isNull(convite.usadoEm), gt(convite.expiraEm, agora)));
  if (!linha || linha.situacao !== "pendente") return { tipo: "invalido" };

  const { conviteId, situacao: _situacao, ...pessoa } = linha;
  return { tipo: "valido", conviteId, pessoa };
}
