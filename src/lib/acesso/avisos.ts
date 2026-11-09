import { and, eq, ne } from "drizzle-orm";

import { banco } from "@/lib/db";
import { pessoaEquipe } from "@/lib/db/schema";
import { quandoNaBahia } from "@/lib/datas";
import type { Enviar, Mensagem } from "@/lib/email";
import { mensagemContaBloqueadaAdm, mensagemContaBloqueadaPessoa } from "@/lib/email/modelos";
import { lerEnvAcesso } from "@/lib/env";
import { NOME_DO_PERFIL, type Perfil } from "@/lib/permissoes";

import { navegadorDe } from "./navegador";

/**
 * E-mails de segurança da equipe (E21, RN59). São enviados depois que a ação foi gravada:
 * se o SMTP falhar, a ação continua valendo e o erro vai para o log do servidor (E38).
 */
/** Envia cada mensagem; a falha de uma não impede as outras. */
export async function enviarSemFalhar(enviar: Enviar, mensagens: Mensagem[], motivo: string): Promise<void> {
  const resultados = await Promise.allSettled(mensagens.map((m) => enviar(m)));
  for (const r of resultados) {
    if (r.status === "rejected") console.error(`Não consegui enviar o e-mail (${motivo}):`, r.reason);
  }
}

/**
 * M04 · Conta bloqueada por tentativas (CA-US19.4): um e-mail para a pessoa e um para cada
 * administrador geral ativo. Se a pessoa for ADM, recebe só o da própria conta.
 */
export async function avisarContaBloqueada(
  pessoa: { id: string; nome: string; email: string; perfil: Perfil },
  dados: { tentativas: number; minutos: number; agora: Date; navegador: string | null; enviar: Enviar },
): Promise<void> {
  try {
    const admins = await banco()
      .select({ email: pessoaEquipe.email })
      .from(pessoaEquipe)
      .where(and(eq(pessoaEquipe.perfil, "ADM"), eq(pessoaEquipe.situacao, "ativa"), ne(pessoaEquipe.id, pessoa.id)));

    const conteudo = {
      nome: pessoa.nome,
      email: pessoa.email,
      perfil: NOME_DO_PERFIL[pessoa.perfil],
      tentativas: dados.tentativas,
      minutos: dados.minutos,
      quando: quandoNaBahia(dados.agora),
      onde: navegadorDe(dados.navegador),
      urlSite: lerEnvAcesso().URL_SITE,
    };
    const mensagens = await Promise.all([
      mensagemContaBloqueadaPessoa(conteudo),
      ...admins.map((adm) => mensagemContaBloqueadaAdm(adm.email, conteudo)),
    ]);
    await enviarSemFalhar(dados.enviar, mensagens, "conta bloqueada");
  } catch (erro) {
    console.error("Não consegui preparar o e-mail de conta bloqueada:", erro);
  }
}
