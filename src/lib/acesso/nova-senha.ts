import { and, eq, gt, isNull } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import { quandoNaBahia } from "@/lib/datas";
import { banco } from "@/lib/db";
import { pessoaEquipe, sessao, tokenSenha } from "@/lib/db/schema";
import { enviarEmail, type Enviar } from "@/lib/email";
import { mensagemRedefinirSenha, mensagemSenhaAlterada } from "@/lib/email/modelos";
import { lerEnvAcesso } from "@/lib/env";
import { lerParametro } from "@/lib/parametros";

import { auth } from "./auth";
import { enviarSemFalhar } from "./avisos";
import { navegadorDe } from "./navegador";
import { validarSenhaDaEquipe, type RequisitoDaSenha } from "./senha";
import { gravarSenha, senhaJaUsada } from "./senha-anterior";
import { hashDoToken, novoToken } from "./token";

/**
 * "Esqueci minha senha" da equipe (RN48, RF74; US41; E38).
 *
 * 1. pedirNovaSenha: envia o link de 1 h (equipe.link_senha_horas). A tela mostra sempre a mesma
 *    resposta, exista ou não o e-mail: esta função não diz se enviou.
 * 2. abrirLinkDeSenha: o link ainda vale? (não venceu, não foi usado, pessoa ativa)
 * 3. trocarSenhaPeloLink: a nova senha (RN47), encerra as sessões e envia "senha alterada".
 *
 * Usamos a tabela token_senha, e não o reset de senha do Better Auth, porque a troca precisa
 * passar por senhaJaUsada() e gravarSenha() (RN47, E37).
 */

/** Endereço da tela de nova senha. */
export function linkDeNovaSenha(urlSite: string, token: string) {
  return `${urlSite.replace(/\/+$/, "")}/painel/nova-senha/${token}`;
}

export async function pedirNovaSenha(
  dados: { email: string },
  { urlSite, enviar = enviarEmail, agora = new Date() }: { urlSite: string; enviar?: Enviar; agora?: Date },
): Promise<void> {
  const email = dados.email.trim();
  if (!email) return;
  const [pessoa] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.email, email));
  // Pendente (ainda no convite) e desativada não recebem: a mesma resposta na tela (CA-US41.2).
  if (!pessoa || pessoa.situacao !== "ativa") return;

  // Um link por minuto (Figma 262:40761): evita encher a caixa de alguém com pedidos repetidos.
  const intervalo = await lerParametro("equipe.link_senha_intervalo_segundos");
  const [recente] = await banco()
    .select({ id: tokenSenha.id })
    .from(tokenSenha)
    .where(
      and(
        eq(tokenSenha.sujeito, "equipe"),
        eq(tokenSenha.sujeitoId, pessoa.id),
        isNull(tokenSenha.usadoEm),
        gt(tokenSenha.expiraEm, agora),
        gt(tokenSenha.criadoEm, new Date(agora.getTime() - intervalo * 1000)),
      ),
    )
    .limit(1);
  if (recente) return;

  const horas = await lerParametro("equipe.link_senha_horas");
  const token = novoToken();
  const expiraEm = new Date(agora.getTime() + horas * 60 * 60_000);

  try {
    // Se o e-mail falhar, o link não fica gravado. A tela continua com a mesma resposta.
    await banco().transaction(async (tx) => {
      // Só o link mais novo vale: os abertos vencem agora.
      await tx
        .update(tokenSenha)
        .set({ expiraEm: agora })
        .where(
          and(
            eq(tokenSenha.sujeito, "equipe"),
            eq(tokenSenha.sujeitoId, pessoa.id),
            isNull(tokenSenha.usadoEm),
            gt(tokenSenha.expiraEm, agora),
          ),
        );
      await tx
        .insert(tokenSenha)
        .values({ sujeito: "equipe", sujeitoId: pessoa.id, tokenHash: hashDoToken(token), expiraEm, criadoEm: agora });
      await registrarAtividade(tx, {
        ator: { tipo: "sistema" },
        acao: "acesso.pedir_nova_senha",
        area: "acesso",
        alvo: { tipo: "pessoa_equipe", id: pessoa.id, rotulo: pessoa.nome },
        detalhe: { expiraEm: expiraEm.toISOString() },
      });
      await enviar(
        await mensagemRedefinirSenha(pessoa.email, { email: pessoa.email, link: linkDeNovaSenha(urlSite, token), horas, urlSite }),
      );
    });
  } catch (erro) {
    console.error("Não consegui enviar o link de nova senha:", erro);
  }
}

export type LinkDeSenha =
  | { tipo: "valido"; tokenId: string; pessoa: { id: string; nome: string; email: string } }
  /** Vencido, usado, inexistente ou de quem não está ativa: a mesma resposta (CA-US41.3). */
  | { tipo: "invalido" };

export async function abrirLinkDeSenha(token: string, agora = new Date()): Promise<LinkDeSenha> {
  if (!token) return { tipo: "invalido" };
  const [linha] = await banco()
    .select({
      tokenId: tokenSenha.id,
      id: pessoaEquipe.id,
      nome: pessoaEquipe.nome,
      email: pessoaEquipe.email,
      situacao: pessoaEquipe.situacao,
    })
    .from(tokenSenha)
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, tokenSenha.sujeitoId))
    .where(
      and(
        eq(tokenSenha.sujeito, "equipe"),
        eq(tokenSenha.tokenHash, hashDoToken(token)),
        isNull(tokenSenha.usadoEm),
        gt(tokenSenha.expiraEm, agora),
      ),
    );
  if (!linha || linha.situacao !== "ativa") return { tipo: "invalido" };
  const { tokenId, id, nome, email } = linha;
  return { tipo: "valido", tokenId, pessoa: { id, nome, email } };
}

export type ResultadoTrocarSenha =
  | { tipo: "ok" }
  | { tipo: "invalido" }
  | { tipo: "senha_fraca"; faltando: RequisitoDaSenha[] }
  /** Igual a uma das últimas senhas, contando a atual (RN47, E37). */
  | { tipo: "senha_repetida" }
  | { tipo: "confirmacao_diferente" };

/**
 * A nova senha pelo link. Numa transação só: gasta o link, grava a senha e o histórico
 * (gravarSenha), encerra todas as sessões, libera a conta se estava bloqueada (E38) e registra
 * na Atividade. Depois, o e-mail de senha alterada (M03). As duas etapas não mudam (CA-US41.4).
 */
export async function trocarSenhaPeloLink(
  dados: { token: string; senha: string; confirmacao: string },
  {
    cabecalhos = new Headers(),
    enviar = enviarEmail,
    agora = new Date(),
  }: { cabecalhos?: Headers; enviar?: Enviar; agora?: Date } = {},
): Promise<ResultadoTrocarSenha> {
  const link = await abrirLinkDeSenha(dados.token, agora);
  if (link.tipo === "invalido") return link;
  const { pessoa } = link;

  const faltando = validarSenhaDaEquipe({
    senha: dados.senha,
    email: pessoa.email,
    nome: pessoa.nome,
    minimo: await lerParametro("equipe.senha_minimo_caracteres"),
  });
  if (faltando.length > 0) return { tipo: "senha_fraca", faltando };
  if (dados.senha !== dados.confirmacao) return { tipo: "confirmacao_diferente" };
  if (await senhaJaUsada(pessoa.id, dados.senha)) return { tipo: "senha_repetida" };

  const senhaHash = await (await auth().$context).password.hash(dados.senha);
  const trocou = await banco().transaction(async (tx) => {
    // Gasta o link só se ninguém o usou no meio do caminho (duas abas ao mesmo tempo).
    const [gasto] = await tx
      .update(tokenSenha)
      .set({ usadoEm: agora })
      .where(and(eq(tokenSenha.id, link.tokenId), isNull(tokenSenha.usadoEm), gt(tokenSenha.expiraEm, agora)))
      .returning({ id: tokenSenha.id });
    if (!gasto) return false;

    await gravarSenha(tx, pessoa.id, senhaHash);
    await tx.delete(sessao).where(eq(sessao.pessoaId, pessoa.id));

    const [antes] = await tx
      .select({ bloqueadaAte: pessoaEquipe.bloqueadaAte })
      .from(pessoaEquipe)
      .where(eq(pessoaEquipe.id, pessoa.id))
      .for("update");
    await tx.update(pessoaEquipe).set({ tentativasErradas: 0, bloqueadaAte: null }).where(eq(pessoaEquipe.id, pessoa.id));
    const alvo = { tipo: "pessoa_equipe", id: pessoa.id, rotulo: pessoa.nome };
    if (antes?.bloqueadaAte && antes.bloqueadaAte > agora) {
      await registrarAtividade(tx, {
        ator: { tipo: "pessoa", id: pessoa.id },
        acao: "acesso.desbloquear",
        area: "acesso",
        alvo,
        detalhe: { motivo: "nova senha", bloqueadaAte: antes.bloqueadaAte.toISOString() },
      });
    }
    await registrarAtividade(tx, {
      ator: { tipo: "pessoa", id: pessoa.id },
      acao: "acesso.trocar_senha",
      area: "acesso",
      alvo,
      detalhe: { origem: "link de nova senha", navegador: cabecalhos.get("user-agent") ?? undefined },
    });
    return true;
  });
  if (!trocou) return { tipo: "invalido" };

  // Fora da transação: a senha já foi trocada, mesmo que o e-mail falhe.
  try {
    const mensagem = await mensagemSenhaAlterada(pessoa.email, {
      email: pessoa.email,
      quando: quandoNaBahia(agora),
      onde: navegadorDe(cabecalhos.get("user-agent")),
      urlSite: lerEnvAcesso().URL_SITE,
    });
    await enviarSemFalhar(enviar, [mensagem], "senha alterada");
  } catch (erro) {
    console.error("Não consegui preparar o e-mail de senha alterada:", erro);
  }
  return { tipo: "ok" };
}
