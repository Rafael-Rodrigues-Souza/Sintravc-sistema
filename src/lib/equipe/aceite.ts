import { and, eq, gt, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { auth } from "@/lib/acesso/auth";
import { cookiesDe } from "@/lib/acesso/cookies";
import { gerarCodigosRecuperacao } from "@/lib/acesso/codigos-recuperacao";
import { ativarDuasEtapas, conferirCodigoDoApp, dadosDoQr } from "@/lib/acesso/duas-etapas";
import { validarSenhaDaEquipe, type RequisitoDaSenha } from "@/lib/acesso/senha";
import { apagarSenhasAnteriores, gravarSenha } from "@/lib/acesso/senha-anterior";
import { registrarAtividade } from "@/lib/atividade";
import { banco } from "@/lib/db";
import { convite, duasEtapas, pessoaEquipe, sessao } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";
import type { Perfil } from "@/lib/permissoes";

import { hashDoToken } from "./convite";

/**
 * Aceite do convite da equipe (RN46, RF72; US40). O token do link é a credencial do fluxo
 * inteiro: cada passo confere de novo se o convite existe, não venceu, não foi usado e a pessoa
 * ainda está pendente. O convite só é marcado como usado no fim, em concluirConvite() (E37).
 *
 * 1. criarSenhaDoConvite: senha (RN47) e sessão provisória; o plugin gera o segredo TOTP.
 * 2. confirmarDuasEtapas: o primeiro código do aplicativo; gera os códigos de recuperação (RN49).
 * 3. concluirConvite: "Guardei meus códigos"; a pessoa fica ativa e entra no painel.
 *
 * A pessoa pendente não passa em sessaoDaEquipe() nem em entrar(): antes do passo 3, nada de painel.
 */

export type PessoaConvidada = { id: string; nome: string; email: string; perfil: Perfil };
export type ConviteAberto =
  | {
      tipo: "valido";
      conviteId: string;
      pessoa: PessoaConvidada;
      expiraEm: Date;
      /** Nome de quem convidou; vazio quando veio do pnpm criar-admin. */
      convidadoPor?: string;
    }
  | { tipo: "invalido" };

const quemConvidou = alias(pessoaEquipe, "quem_convidou");

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
      expiraEm: convite.expiraEm,
      convidadoPor: quemConvidou.nome,
    })
    .from(convite)
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, convite.pessoaId))
    .leftJoin(quemConvidou, eq(quemConvidou.id, convite.criadoPor))
    .where(and(eq(convite.tokenHash, hashDoToken(token)), isNull(convite.usadoEm), gt(convite.expiraEm, agora)));
  if (!linha || linha.situacao !== "pendente") return { tipo: "invalido" };

  const { conviteId, id, nome, email, perfil, expiraEm, convidadoPor } = linha;
  return { tipo: "valido", conviteId, pessoa: { id, nome, email, perfil }, expiraEm, convidadoPor: convidadoPor ?? undefined };
}

/** De quem é a sessão destes cabeçalhos (a provisória do aceite, ou nenhuma). */
async function pessoaDaSessao(cabecalhos: Headers): Promise<string | undefined> {
  const resultado = await auth().api.getSession({ headers: cabecalhos });
  return resultado?.user.id;
}

export type EtapaDoConvite =
  | { tipo: "invalido" }
  | { tipo: "criar_senha"; convite: Extract<ConviteAberto, { tipo: "valido" }> }
  | { tipo: "duas_etapas"; convite: Extract<ConviteAberto, { tipo: "valido" }>; uri: string; chave: string };

/**
 * Em que passo a tela do link deve abrir. Só segue para as duas etapas quem tem a sessão
 * provisória desta pessoa (o mesmo navegador que criou a senha); os outros recomeçam.
 */
export async function etapaDoConvite(token: string, cabecalhos: Headers): Promise<EtapaDoConvite> {
  const aberto = await abrirConvite(token);
  if (aberto.tipo === "invalido") return aberto;
  const { pessoa } = aberto;

  if ((await pessoaDaSessao(cabecalhos)) !== pessoa.id) return { tipo: "criar_senha", convite: aberto };
  const qr = await dadosDoQr(pessoa.id, pessoa.email);
  if (!qr) return { tipo: "criar_senha", convite: aberto };
  return { tipo: "duas_etapas", convite: aberto, ...qr };
}

export type ResultadoCriarSenha =
  | { tipo: "ok"; cabecalhos: Headers }
  | { tipo: "invalido" }
  | { tipo: "senha_fraca"; faltando: RequisitoDaSenha[] }
  | { tipo: "confirmacao_diferente" };

/**
 * Passo 1. Se a pessoa já tinha começado (outra senha, outro navegador), recomeça do zero:
 * apaga a conta, as duas etapas, as sessões e o histórico de senhas dela, que ainda não entrou.
 */
export async function criarSenhaDoConvite(
  dados: { token: string; senha: string; confirmacao: string },
  { cabecalhos = new Headers() }: { cabecalhos?: Headers } = {},
): Promise<ResultadoCriarSenha> {
  const aberto = await abrirConvite(dados.token);
  if (aberto.tipo === "invalido") return aberto;
  const { pessoa } = aberto;

  const faltando = validarSenhaDaEquipe({
    senha: dados.senha,
    email: pessoa.email,
    nome: pessoa.nome,
    minimo: await lerParametro("equipe.senha_minimo_caracteres"),
  });
  if (faltando.length > 0) return { tipo: "senha_fraca", faltando };
  if (dados.senha !== dados.confirmacao) return { tipo: "confirmacao_diferente" };

  // Recomeço e senha nova numa transação só: se algo falhar, a pessoa fica como estava.
  const senhaHash = await (await auth().$context).password.hash(dados.senha);
  await banco().transaction(async (tx) => {
    await tx.delete(sessao).where(eq(sessao.pessoaId, pessoa.id));
    await tx.delete(duasEtapas).where(eq(duasEtapas.pessoaId, pessoa.id));
    await tx.update(pessoaEquipe).set({ duasEtapasAtivas: false }).where(eq(pessoaEquipe.id, pessoa.id));
    await apagarSenhasAnteriores(tx, pessoa.id);
    await gravarSenha(tx, pessoa.id, senhaHash);
  });

  // Sessão provisória: a pessoa ainda não tem as duas etapas, então o Better Auth cria a sessão
  // direto. Ela só serve para este fluxo (pendente não entra no painel).
  const login = await auth().api.signInEmail({
    body: { email: pessoa.email, password: dados.senha },
    headers: cabecalhos,
    returnHeaders: true,
  });
  await auth().api.enableTwoFactor({
    body: { password: dados.senha, method: "totp" },
    headers: new Headers({ cookie: cookiesDe(login.headers) }),
  });
  return { tipo: "ok", cabecalhos: login.headers };
}

export type ResultadoDuasEtapas =
  | { tipo: "ok"; codigos: string[] }
  | { tipo: "codigo_errado" }
  | { tipo: "sem_sessao" }
  | { tipo: "invalido" };

/**
 * Passo 2. Confere o primeiro código do aplicativo, ativa as duas etapas e gera os códigos de
 * recuperação (RN49). Os códigos só existem no retorno: a tela mostra uma vez. Confirmar de novo
 * (a pessoa recarregou antes de guardar) gera outros e invalida os anteriores.
 */
export async function confirmarDuasEtapas(
  dados: { token: string; codigo: string },
  { cabecalhos }: { cabecalhos: Headers },
): Promise<ResultadoDuasEtapas> {
  const aberto = await abrirConvite(dados.token);
  if (aberto.tipo === "invalido") return aberto;
  const { pessoa } = aberto;
  if ((await pessoaDaSessao(cabecalhos)) !== pessoa.id) return { tipo: "sem_sessao" };

  if (!(await conferirCodigoDoApp(pessoa.id, dados.codigo))) return { tipo: "codigo_errado" };
  await ativarDuasEtapas(pessoa.id);
  return { tipo: "ok", codigos: await gerarCodigosRecuperacao(pessoa.id) };
}

export type ResultadoConcluir =
  | { tipo: "ok"; pessoaId: string }
  | { tipo: "sem_duas_etapas" }
  | { tipo: "sem_sessao" }
  | { tipo: "invalido" };

/**
 * Passo 3. "Guardei meus códigos": numa transação, gasta o convite, deixa a pessoa ativa com o
 * e-mail confirmado e registra o aceite na Atividade. A sessão provisória passa a valer no painel.
 */
export async function concluirConvite(
  dados: { token: string },
  { cabecalhos, agora = new Date() }: { cabecalhos: Headers; agora?: Date },
): Promise<ResultadoConcluir> {
  const aberto = await abrirConvite(dados.token, agora);
  if (aberto.tipo === "invalido") return aberto;
  const { pessoa } = aberto;
  if ((await pessoaDaSessao(cabecalhos)) !== pessoa.id) return { tipo: "sem_sessao" };

  const [atual] = await banco()
    .select({ duasEtapasAtivas: pessoaEquipe.duasEtapasAtivas })
    .from(pessoaEquipe)
    .where(eq(pessoaEquipe.id, pessoa.id));
  if (!atual?.duasEtapasAtivas) return { tipo: "sem_duas_etapas" };

  try {
    return await banco().transaction(async (tx) => {
      // Gasta o convite primeiro: duas abas ao mesmo tempo, só uma passa.
      const [gasto] = await tx
        .update(convite)
        .set({ usadoEm: agora })
        .where(and(eq(convite.id, aberto.conviteId), isNull(convite.usadoEm), gt(convite.expiraEm, agora)))
        .returning({ id: convite.id });
      if (!gasto) throw new Desfazer({ tipo: "invalido" });

      const [ativada] = await tx
        .update(pessoaEquipe)
        .set({ situacao: "ativa", emailVerificado: true, ultimoAcesso: agora })
        .where(
          and(
            eq(pessoaEquipe.id, pessoa.id),
            eq(pessoaEquipe.situacao, "pendente"),
            eq(pessoaEquipe.duasEtapasAtivas, true),
          ),
        )
        .returning({ id: pessoaEquipe.id });
      if (!ativada) throw new Desfazer({ tipo: "invalido" });

      await registrarAtividade(tx, {
        ator: { tipo: "pessoa", id: pessoa.id },
        acao: "convite.aceitar",
        area: "equipe",
        alvo: { tipo: "pessoa_equipe", id: pessoa.id, rotulo: pessoa.nome },
        detalhe: { perfil: pessoa.perfil, navegador: cabecalhos.get("user-agent") ?? undefined },
      });
      return { tipo: "ok", pessoaId: pessoa.id } as const;
    });
  } catch (erro) {
    if (erro instanceof Desfazer) return erro.resultado;
    throw erro;
  }
}

/** Desfaz a transação do aceite e devolve este resultado. */
class Desfazer extends Error {
  constructor(readonly resultado: ResultadoConcluir) {
    super("Aceite desfeito");
  }
}
