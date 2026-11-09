import { APIError } from "better-auth/api";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import { banco } from "@/lib/db";
import { pessoaEquipe, verificacao } from "@/lib/db/schema";
import { enviarEmail, type Enviar } from "@/lib/email";
import { lerParametro } from "@/lib/parametros";

import { auth } from "./auth";
import { avisarContaBloqueada } from "./avisos";
import { quantosCodigosRestam } from "./codigos-recuperacao";
import { COOKIES_DO_DESAFIO } from "./cookies";

/**
 * Login da equipe (RN04, RN05; CA-US19.1 e 19.2). É o único caminho de entrada: as rotas HTTP
 * de login do Better Auth estão desligadas (auth.ts).
 *
 * 1. entrar(): e-mail e senha. Se estiverem certos, o Better Auth abre o desafio das duas etapas.
 * 2. confirmarCodigo(): o código do aplicativo autenticador ou um código de recuperação (RN49).
 *    Se estiver certo, cria a sessão.
 *
 * Senha errada e código errado contam juntos. Na 5ª tentativa errada, a conta fica bloqueada
 * por 15 minutos (valores do Parametro). Entrar, bloquear e desbloquear ficam na Atividade.
 */
export type Resultado =
  | { tipo: "precisa_codigo"; cabecalhos: Headers }
  | { tipo: "entrou"; pessoaId: string; cabecalhos: Headers }
  /** Resposta única para e-mail inexistente, senha errada, pessoa inativa ou código errado. */
  | { tipo: "invalido" }
  | { tipo: "bloqueada"; ate: Date }
  /** O desafio das duas etapas venceu (10 min) ou não existe: volte para o e-mail e a senha. */
  | { tipo: "desafio_vencido" };

type Opcoes = {
  /** Cabeçalhos da requisição (cookies, IP, navegador). Nas server actions: await headers(). */
  cabecalhos?: Headers;
  /** Relógio das regras de bloqueio. Só os testes mudam. */
  agora?: Date;
  /** Envio do e-mail de conta bloqueada (M04). Só os testes mudam. */
  enviar?: Enviar;
};

type Pessoa = typeof pessoaEquipe.$inferSelect;

export async function entrar(
  dados: { email: string; senha: string },
  { cabecalhos = new Headers(), agora = new Date(), enviar = enviarEmail }: Opcoes = {},
): Promise<Resultado> {
  const email = dados.email.trim();
  const [encontrada] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.email, email));
  if (!encontrada) return { tipo: "invalido" };

  const pessoa = await liberarSeOBloqueioVenceu(encontrada, agora);
  if (pessoa.bloqueadaAte && pessoa.bloqueadaAte > agora) return { tipo: "bloqueada", ate: pessoa.bloqueadaAte };

  // Duas etapas obrigatórias (RNF02). Pendente e desativada não entram.
  if (pessoa.situacao !== "ativa" || !pessoa.duasEtapasAtivas) return { tipo: "invalido" };

  try {
    const resposta = await auth().api.signInEmail({
      body: { email: pessoa.email, password: dados.senha },
      headers: cabecalhos,
      returnHeaders: true,
    });
    if (!("twoFactorRedirect" in resposta.response)) {
      throw new Error("O Better Auth criou a sessão sem pedir as duas etapas. Confira o plugin twoFactor.");
    }
    return { tipo: "precisa_codigo", cabecalhos: resposta.headers };
  } catch (erro) {
    if (codigoDoErro(erro) === "INVALID_EMAIL_OR_PASSWORD") return registrarErro(pessoa.id, { agora, cabecalhos, enviar });
    throw erro;
  }
}

export async function confirmarCodigo(
  dados: {
    codigo: string;
    /**
     * "app": os 6 números do aplicativo autenticador (padrão).
     * "recuperacao": um código de recuperação de uso único, já no formato XXXXX-XXXXX
     * (normalizarCodigoRecuperacao). Conta na mesma contagem de tentativas (RN05, E36).
     */
    tipo?: "app" | "recuperacao";
  },
  { cabecalhos = new Headers(), agora = new Date(), enviar = enviarEmail }: Opcoes = {},
): Promise<Resultado> {
  const pessoaId = await pessoaDoDesafio(cabecalhos);
  if (!pessoaId) return { tipo: "desafio_vencido" };

  const [encontrada] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.id, pessoaId));
  if (!encontrada) return { tipo: "desafio_vencido" };
  const pessoa = await liberarSeOBloqueioVenceu(encontrada, agora);
  if (pessoa.bloqueadaAte && pessoa.bloqueadaAte > agora) return { tipo: "bloqueada", ate: pessoa.bloqueadaAte };
  if (pessoa.situacao !== "ativa") return { tipo: "invalido" };

  const recuperacao = dados.tipo === "recuperacao";
  let resposta;
  try {
    resposta = recuperacao
      ? await auth().api.verifyBackupCode({
          body: { code: dados.codigo },
          headers: cabecalhos,
          returnHeaders: true,
        })
      : await auth().api.verifyTOTP({
          body: { code: dados.codigo.replace(/\D/g, "") },
          headers: cabecalhos,
          returnHeaders: true,
        });
  } catch (erro) {
    const codigo = codigoDoErro(erro);
    if (codigo === "INVALID_CODE" || codigo === "INVALID_BACKUP_CODE") {
      return registrarErro(pessoa.id, { agora, cabecalhos, enviar });
    }
    if (codigo === "INVALID_TWO_FACTOR_COOKIE" || codigo === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE") {
      return { tipo: "desafio_vencido" };
    }
    throw erro;
  }

  // O uso de código de recuperação fica na Atividade, com quantos ainda restam (US42).
  const metodo = recuperacao
    ? { metodo: "codigo_recuperacao", codigosRestantes: await contarCodigosSemFalhar(pessoa.id) }
    : { metodo: "aplicativo" };
  await banco().transaction(async (tx) => {
    await tx
      .update(pessoaEquipe)
      .set({ tentativasErradas: 0, ultimoAcesso: agora })
      .where(eq(pessoaEquipe.id, pessoa.id));
    await registrarAtividade(tx, {
      ator: { tipo: "pessoa", id: pessoa.id },
      acao: "acesso.entrar",
      area: "acesso",
      alvo: { tipo: "pessoa_equipe", id: pessoa.id, rotulo: pessoa.nome },
      detalhe: { ...metodo, navegador: cabecalhos.get("user-agent") ?? undefined },
    });
  });

  return { tipo: "entrou", pessoaId: pessoa.id, cabecalhos: resposta.headers };
}

/**
 * Uma tentativa errada a mais. Na última permitida, bloqueia (RN05) e, depois de gravar, avisa por
 * e-mail a pessoa e os administradores gerais (M04, CA-US19.4).
 */
async function registrarErro(
  pessoaId: string,
  { agora, cabecalhos, enviar }: Required<Opcoes>,
): Promise<Resultado> {
  const limite = await lerParametro("equipe.tentativas_login");
  const minutos = await lerParametro("equipe.bloqueio_minutos");

  const resultado = await banco().transaction(async (tx) => {
    const [pessoa] = await tx
      .update(pessoaEquipe)
      .set({ tentativasErradas: sql`${pessoaEquipe.tentativasErradas} + 1` })
      .where(eq(pessoaEquipe.id, pessoaId))
      .returning();
    if (!pessoa || pessoa.tentativasErradas < limite) return { tipo: "invalido" } as const;

    const ate = new Date(agora.getTime() + minutos * 60_000);
    await tx.update(pessoaEquipe).set({ bloqueadaAte: ate }).where(eq(pessoaEquipe.id, pessoaId));
    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao: "acesso.bloquear",
      area: "acesso",
      alvo: { tipo: "pessoa_equipe", id: pessoa.id, rotulo: pessoa.nome },
      detalhe: { tentativas: pessoa.tentativasErradas, ate: ate.toISOString() },
    });
    return { tipo: "bloqueada", ate, pessoa } as const;
  });
  if (resultado.tipo !== "bloqueada") return resultado;

  // Fora da transação: o bloqueio já vale, mesmo que o e-mail falhe.
  await avisarContaBloqueada(resultado.pessoa, {
    tentativas: resultado.pessoa.tentativasErradas,
    minutos,
    agora,
    navegador: cabecalhos.get("user-agent"),
    enviar,
  });
  return { tipo: "bloqueada", ate: resultado.ate };
}

/** Se o bloqueio já venceu, libera a conta, zera a contagem e registra o desbloqueio. */
async function liberarSeOBloqueioVenceu(pessoa: Pessoa, agora: Date): Promise<Pessoa> {
  if (!pessoa.bloqueadaAte || pessoa.bloqueadaAte > agora) return pessoa;

  return banco().transaction(async (tx) => {
    const [liberada] = await tx
      .update(pessoaEquipe)
      .set({ bloqueadaAte: null, tentativasErradas: 0 })
      // Só quem ainda está bloqueada: duas requisições ao mesmo tempo registram um desbloqueio só.
      .where(
        and(
          eq(pessoaEquipe.id, pessoa.id),
          isNotNull(pessoaEquipe.bloqueadaAte),
          lte(pessoaEquipe.bloqueadaAte, agora),
        ),
      )
      .returning();
    if (!liberada) return pessoa;

    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao: "acesso.desbloquear",
      area: "acesso",
      alvo: { tipo: "pessoa_equipe", id: pessoa.id, rotulo: pessoa.nome },
      detalhe: { motivo: "fim do prazo de bloqueio", bloqueadaAte: pessoa.bloqueadaAte?.toISOString() },
    });
    return liberada;
  });
}

/**
 * Quantos códigos de recuperação restam, só para a Atividade. O código já foi gasto e o login
 * já foi aceito: se a contagem falhar, a pessoa entra mesmo assim, a Atividade fica com null e
 * o erro vai para o log.
 */
async function contarCodigosSemFalhar(pessoaId: string): Promise<number | null> {
  try {
    return await quantosCodigosRestam(pessoaId);
  } catch (erro) {
    console.error("Não consegui contar os códigos de recuperação restantes:", erro);
    return null;
  }
}

/**
 * De quem é o desafio das duas etapas em andamento. O cookie assinado do Better Auth guarda o
 * identificador de uma linha da tabela verificacao, cujo valor é o id da pessoa.
 *
 * A assinatura não é conferida aqui: o Better Auth confere em verifyTOTP, e só contamos o erro
 * quando ele responde "código inválido", o que exige um cookie válido.
 */
async function pessoaDoDesafio(cabecalhos: Headers): Promise<string | undefined> {
  const cookie = COOKIES_DO_DESAFIO.map((nome) => lerCookie(cabecalhos, nome)).find(Boolean);
  if (!cookie) return undefined;
  const ponto = cookie.lastIndexOf(".");
  const identificador = ponto > 0 ? cookie.slice(0, ponto) : cookie;

  const [linha] = await banco()
    .select({ valor: verificacao.valor, expiraEm: verificacao.expiraEm })
    .from(verificacao)
    .where(eq(verificacao.identificador, identificador));
  if (!linha || linha.expiraEm <= new Date()) return undefined;
  return linha.valor;
}

function lerCookie(cabecalhos: Headers, nome: string): string | undefined {
  for (const par of (cabecalhos.get("cookie") ?? "").split(";")) {
    const [chave, ...resto] = par.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return undefined;
}

function codigoDoErro(erro: unknown): string | undefined {
  if (erro instanceof APIError) {
    const corpo = erro.body as { code?: string } | undefined;
    return corpo?.code;
  }
  return undefined;
}
