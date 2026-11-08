import { desc, eq, inArray } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { senhaAnterior } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";

import { auth } from "./auth";

/**
 * Histórico de senhas da equipe (RN47). Cada senha nova da pessoa (convite, nova senha) passa por
 * registrarSenha(), na transação da própria troca. A quantidade vem do Parametro
 * equipe.senhas_anteriores_bloqueadas; o Better Auth não tem essa regra (E36).
 */

const maisRecentes = [desc(senhaAnterior.criadaEm), desc(senhaAnterior.id)];

/** Guarda o hash da senha nova e apaga as que passaram das N mais recentes. */
export async function registrarSenha(tx: Transacao, pessoaId: string, senhaHash: string): Promise<void> {
  const manter = await lerParametro("equipe.senhas_anteriores_bloqueadas");
  await tx.insert(senhaAnterior).values({ pessoaId, senhaHash });

  const sobrando = await tx
    .select({ id: senhaAnterior.id })
    .from(senhaAnterior)
    .where(eq(senhaAnterior.pessoaId, pessoaId))
    .orderBy(...maisRecentes)
    .offset(manter);
  if (sobrando.length > 0) {
    await tx.delete(senhaAnterior).where(
      inArray(
        senhaAnterior.id,
        sobrando.map((s) => s.id),
      ),
    );
  }
}

/** A senha é igual a uma das N últimas da pessoa? */
export async function senhaJaUsada(pessoaId: string, senha: string): Promise<boolean> {
  const quantas = await lerParametro("equipe.senhas_anteriores_bloqueadas");
  if (quantas === 0) return false;

  const linhas = await banco()
    .select({ senhaHash: senhaAnterior.senhaHash })
    .from(senhaAnterior)
    .where(eq(senhaAnterior.pessoaId, pessoaId))
    .orderBy(...maisRecentes)
    .limit(quantas);

  const { password } = await auth().$context;
  for (const { senhaHash } of linhas) {
    if (await password.verify({ hash: senhaHash, password: senha })) return true;
  }
  return false;
}

/** Apaga o histórico (recomeço do aceite do convite: a pessoa pendente ainda não usou senha nenhuma). */
export async function apagarSenhasAnteriores(tx: Transacao, pessoaId: string): Promise<void> {
  await tx.delete(senhaAnterior).where(eq(senhaAnterior.pessoaId, pessoaId));
}
