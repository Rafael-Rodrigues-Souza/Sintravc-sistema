import { randomInt } from "node:crypto";

import { symmetricEncrypt } from "better-auth/crypto";

import { lerParametro } from "@/lib/parametros";

import { auth } from "./auth";

/**
 * Gera os códigos de recuperação da pessoa (RN49) e troca os que ela tinha: os antigos deixam de valer.
 *
 * O plugin twoFactor gera os códigos com uma quantidade fixa na configuração, e a função de
 * geração dele não pode ler o banco. Por isso geramos aqui, com a quantidade do Parametro
 * equipe.codigos_recuperacao, com a mesma criptografia do plugin (E36, E37).
 * O plugin continua conferindo os códigos no login (verifyBackupCode).
 *
 * Os códigos em claro só existem no retorno desta função: mostre uma vez e esqueça.
 *
 * Formato XXXXX-XXXXX, só com maiúsculas e algarismos que não se confundem (sem 0/O, 1/I/L):
 * a pessoa vai ler no papel e digitar no celular. São 10 caracteres de 31 possíveis (~49 bits).
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function novoCodigo() {
  const bruto = Array.from({ length: 10 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${bruto.slice(0, 5)}-${bruto.slice(5)}`;
}

export async function gerarCodigosRecuperacao(pessoaId: string): Promise<string[]> {
  const quantidade = await lerParametro("equipe.codigos_recuperacao");
  const contexto = await auth().$context;

  const registro = await contexto.adapter.findOne<{ id: string }>({
    model: "twoFactor",
    where: [{ field: "userId", value: pessoaId }],
  });
  if (!registro) throw new Error("A pessoa ainda não configurou as duas etapas: não há onde guardar os códigos.");

  const codigos = new Set<string>();
  while (codigos.size < quantidade) codigos.add(novoCodigo());
  const lista = [...codigos];

  await contexto.adapter.update({
    model: "twoFactor",
    where: [{ field: "id", value: registro.id }],
    update: {
      backupCodes: await symmetricEncrypt({ key: contexto.secretConfig, data: JSON.stringify(lista) }),
    },
  });
  return lista;
}
