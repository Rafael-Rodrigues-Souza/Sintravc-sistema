import { asc, sql } from "drizzle-orm";

import { banco } from "@/lib/db";
import { pessoaEquipe } from "@/lib/db/schema";

/**
 * A equipe para a tela Equipe e perfis (RF51): quem está ativo primeiro, por perfil
 * (Administrador geral, Comunicação, Atendimento) e nome; convites pendentes e pessoas
 * desativadas no fim. A permissão (equipe.ver) é conferida pela página.
 */
export async function listarEquipe() {
  return banco()
    .select({
      id: pessoaEquipe.id,
      nome: pessoaEquipe.nome,
      email: pessoaEquipe.email,
      perfil: pessoaEquipe.perfil,
      situacao: pessoaEquipe.situacao,
      duasEtapasAtivas: pessoaEquipe.duasEtapasAtivas,
      ultimoAcesso: pessoaEquipe.ultimoAcesso,
    })
    .from(pessoaEquipe)
    .orderBy(
      sql`case ${pessoaEquipe.situacao} when 'ativa' then 0 when 'pendente' then 1 else 2 end`,
      asc(pessoaEquipe.perfil),
      asc(pessoaEquipe.nome),
    );
}

export type PessoaDaLista = Awaited<ReturnType<typeof listarEquipe>>[number];
