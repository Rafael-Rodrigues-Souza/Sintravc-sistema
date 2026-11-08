import { and, desc, eq, inArray } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { contaLogin, senhaAnterior } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";

import { auth } from "./auth";

/**
 * Histórico de senhas da equipe (RN47). Cada senha nova da pessoa (convite, nova senha) passa por
 * gravarSenha(), que troca a senha do login e registra no histórico na mesma transação. A quantidade
 * vem do Parametro equipe.senhas_anteriores_bloqueadas, contando a senha atual (E37); o Better Auth
 * não tem essa regra (E36).
 */

const maisRecentes = [desc(senhaAnterior.criadaEm), desc(senhaAnterior.id)];

/**
 * A senha nova da pessoa: troca a senha do login (conta "credential" do Better Auth, em conta_login)
 * e guarda no histórico, na transação de quem chama. Se algo falhar depois, nada fica gravado.
 * Quem chama confere antes as regras da senha (validarSenhaDaEquipe, senhaJaUsada).
 */
export async function gravarSenha(tx: Transacao, pessoaId: string, senhaHash: string): Promise<void> {
  const [trocada] = await tx
    .update(contaLogin)
    .set({ senhaHash })
    .where(and(eq(contaLogin.pessoaId, pessoaId), eq(contaLogin.provedor, "credential")))
    .returning({ id: contaLogin.id });
  if (!trocada) {
    await tx.insert(contaLogin).values({ pessoaId, provedor: "credential", idNoProvedor: pessoaId, senhaHash });
  }
  await registrarSenha(tx, pessoaId, senhaHash);
}

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
        sobrando.map((linha) => linha.id),
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
