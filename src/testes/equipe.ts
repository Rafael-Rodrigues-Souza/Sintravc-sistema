import { randomUUID } from "node:crypto";

import { banco } from "@/lib/db";
import { pessoaEquipe } from "@/lib/db/schema";
import type { Perfil, QuemDaEquipe } from "@/lib/permissoes";

/** Uma pessoa ativa da equipe, gravada no banco de teste, pronta para pode() e exigir(). */
export async function pessoaDaEquipe(perfil: Perfil = "COM", nome = `Pessoa ${randomUUID().slice(0, 6)}`): Promise<QuemDaEquipe> {
  const [linha] = await banco()
    .insert(pessoaEquipe)
    .values({ nome, email: `${randomUUID()}@sintravc.local`, perfil, situacao: "ativa" })
    .returning({ id: pessoaEquipe.id });
  return { tipo: "equipe", id: linha!.id, perfil };
}

/** Endereço público falso dos arquivos da Mídia (sem precisar das variáveis do S3 nos testes). */
export const urlDeTeste = (chaveR2: string) => `https://arquivos.teste/${chaveR2}`;

/** Dependências do salvamento de notícia: uma sessão nova do editor a cada chamada. */
export function edicaoDe(quem: QuemDaEquipe, sessaoEdicao: string = randomUUID()) {
  return { quem, sessaoEdicao, urlDoArquivo: urlDeTeste };
}
