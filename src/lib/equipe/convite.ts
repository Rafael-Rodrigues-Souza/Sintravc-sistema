import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import { registrarAtividade, type Ator } from "@/lib/atividade";
import { banco, type Transacao } from "@/lib/db";
import { convite, pessoaEquipe } from "@/lib/db/schema";
import { enviarEmail, type Mensagem } from "@/lib/email";
import { mensagemConviteEquipe } from "@/lib/email/modelos";
import { dataHoraNaBahia } from "@/lib/datas";
import { lerParametro } from "@/lib/parametros";
import { FASE_ATUAL, NOME_DO_PERFIL, perfisConvidaveis, type Perfil } from "@/lib/permissoes";

/** Erro esperado do comando (e-mail inválido, já cadastrado…): a mensagem vai direto para quem rodou. */
export class ErroCriarAdmin extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroCriarAdmin";
  }
}

/** Erro esperado do convite pela tela. `campo` diz onde mostrar a mensagem no formulário. */
export class ErroConvite extends Error {
  constructor(
    readonly campo: CampoDoConvite | "geral",
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroConvite";
  }
}

const email = z.string().trim().pipe(z.email({ error: "e-mail inválido" }));

/** O token puro só aparece no link; no banco fica o hash (E35). */
export function hashDoToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Endereço da tela de aceite do convite. */
export function linkDoConvite(urlSite: string, token: string) {
  return `${urlSite.replace(/\/+$/, "")}/painel/convite/${token}`;
}

type Enviar = (mensagem: Mensagem) => Promise<{ idMensagem: string }>;

/** Quem convida pela tela: o ADM logado. */
type QuemConvida = { id: string; nome: string };

type NovoConvite = {
  tx: Transacao;
  pessoa: { id: string; nome: string; email: string; perfil: Perfil };
  quem?: QuemConvida;
  urlSite: string;
  /** Para o e-mail. false: só devolve o link (pnpm criar-admin --sem-email). */
  enviar: Enviar | false;
  acao: "convite.enviar" | "convite.reenviar";
  detalhe?: Record<string, unknown>;
};

/**
 * O núcleo de todo convite: grava o convite (48 h, valor do Parametro), registra na Atividade e
 * envia o e-mail, tudo dentro da transação de quem chamou. Se o e-mail falhar, nada fica gravado.
 */
async function gravarEEnviarConvite({ tx, pessoa, quem, urlSite, enviar, acao, detalhe }: NovoConvite) {
  const validadeHoras = await lerParametro("convite.validade_horas");
  const token = randomBytes(32).toString("base64url");
  const link = linkDoConvite(urlSite, token);
  const expiraEm = new Date(Date.now() + validadeHoras * 60 * 60 * 1000);

  await tx
    .insert(convite)
    .values({ pessoaId: pessoa.id, tokenHash: hashDoToken(token), expiraEm, criadoPor: quem?.id ?? null });

  const ator: Ator = quem ? { tipo: "pessoa", id: quem.id } : { tipo: "sistema" };
  await registrarAtividade(tx, {
    ator,
    acao,
    area: "equipe",
    alvo: { tipo: "pessoa_equipe", id: pessoa.id, rotulo: pessoa.nome },
    detalhe: {
      perfil: pessoa.perfil,
      email: pessoa.email,
      expiraEm: expiraEm.toISOString(),
      emailEnviado: enviar !== false,
      ...detalhe,
    },
  });

  if (enviar) {
    await enviar(
      await mensagemConviteEquipe(pessoa.email, {
        nome: pessoa.nome,
        convidadoPor: quem?.nome,
        perfil: NOME_DO_PERFIL[pessoa.perfil],
        link,
        valeAte: dataHoraNaBahia(expiraEm),
        urlSite,
      }),
    );
  }
  return { link, expiraEm };
}

/** Cria a pessoa pendente. A restrição única do e-mail (citext) pega até duas execuções ao mesmo tempo. */
async function criarPessoaPendente(tx: Transacao, dados: { nome: string; email: string; perfil: Perfil }) {
  const [existente] = await tx.select({ id: pessoaEquipe.id }).from(pessoaEquipe).where(eq(pessoaEquipe.email, dados.email));
  if (existente) return undefined;
  const [pessoa] = await tx
    .insert(pessoaEquipe)
    .values({ ...dados, situacao: "pendente" })
    .returning({ id: pessoaEquipe.id });
  if (!pessoa) throw new Error("O banco não devolveu a pessoa criada.");
  return { id: pessoa.id, ...dados };
}

function ehEmailRepetido(erro: unknown) {
  return codigoPostgres(erro) === "23505";
}

// --- Convite pela tela (RF51) ---------------------------------------------------

const esquemaConvite = z.object({
  nome: z.string().trim().min(1, { error: "Informe o nome da pessoa." }),
  email: z.string().trim().pipe(z.email({ error: "Informe um e-mail válido, como nome@sintravc.org.br." })),
  perfil: z.enum(["ADM", "COM", "ATD"], { error: "Escolha o perfil." }),
});

/** Os campos do formulário Convidar pessoa. */
export type CampoDoConvite = keyof typeof esquemaConvite.shape;
/** O que veio do formulário, ainda sem validar. */
export type PedidoDeConvite = Record<CampoDoConvite, string>;

/**
 * O Administrador geral convida uma pessoa (RF51, RN46). A permissão (equipe.convidar) é conferida
 * na server action, antes de chamar esta função. O perfil Atendimento só existe na Fase 2 (CA-US29.3).
 */
export async function convidarPessoa(
  pedido: PedidoDeConvite,
  deps: { quem: QuemConvida; urlSite: string; enviar?: Enviar; fase?: number },
): Promise<{ pessoaId: string; expiraEm: Date }> {
  const validado = esquemaConvite.safeParse(pedido);
  if (!validado.success) {
    const problema = validado.error.issues[0]!;
    const campo = esquemaConvite.keyof().safeParse(problema.path[0]);
    throw new ErroConvite(campo.success ? campo.data : "geral", problema.message);
  }
  const dados = validado.data;
  if (!perfisConvidaveis(deps.fase ?? FASE_ATUAL).includes(dados.perfil)) {
    throw new ErroConvite("perfil", "O perfil Atendimento só fica disponível com a Fase 2.");
  }

  const repetido = new ErroConvite("email", "Já existe uma pessoa da equipe com este e-mail.");
  try {
    return await banco().transaction(async (tx) => {
      const pessoa = await criarPessoaPendente(tx, dados);
      if (!pessoa) throw repetido;
      const { expiraEm } = await gravarEEnviarConvite({
        tx,
        pessoa,
        quem: deps.quem,
        urlSite: deps.urlSite,
        enviar: deps.enviar ?? enviarEmail,
        acao: "convite.enviar",
      });
      return { pessoaId: pessoa.id, expiraEm };
    });
  } catch (erro) {
    if (ehEmailRepetido(erro)) throw repetido;
    throw erro;
  }
}

/**
 * Reenvia o convite de uma pessoa pendente (RN46): os convites abertos dela deixam de valer na hora
 * (expira_em = agora) e sai um novo link. O botão fica no ticket #21 (P11).
 */
export async function reenviarConvite(
  pessoaId: string,
  deps: { quem: QuemConvida; urlSite: string; enviar?: Enviar },
): Promise<{ expiraEm: Date }> {
  return banco().transaction(async (tx) => {
    const [pessoa] = await tx.select().from(pessoaEquipe).where(eq(pessoaEquipe.id, pessoaId)).for("update");
    if (!pessoa || pessoa.situacao !== "pendente") {
      throw new ErroConvite("geral", "Só dá para reenviar o convite de quem ainda não entrou.");
    }
    const agora = new Date();
    await tx
      .update(convite)
      .set({ expiraEm: agora })
      .where(and(eq(convite.pessoaId, pessoaId), isNull(convite.usadoEm), gt(convite.expiraEm, agora)));

    const { expiraEm } = await gravarEEnviarConvite({
      tx,
      pessoa,
      quem: deps.quem,
      urlSite: deps.urlSite,
      enviar: deps.enviar ?? enviarEmail,
      acao: "convite.reenviar",
    });
    return { expiraEm };
  });
}

// --- Primeiro Administrador geral (E33) -----------------------------------------

const esquemaPedidoAdmin = z.object({
  email,
  nome: z.string().trim().min(1, { error: "informe o nome (--nome)" }),
});

/**
 * Cria o convite de um Administrador geral pelo pnpm criar-admin (E33), o caminho do primeiro ADM
 * em todos os ambientes. Com `enviarEmail: false` (--sem-email), só devolve o link.
 */
export async function criarConviteAdmin(
  pedido: { email: string; nome: string; enviarEmail: boolean },
  { urlSite, enviar = enviarEmail }: { urlSite: string; enviar?: Enviar },
) {
  const validado = esquemaPedidoAdmin.safeParse(pedido);
  if (!validado.success) {
    throw new ErroCriarAdmin(
      `Não criei o convite: ${validado.error.issues.map((i) => i.message).join("; ")} (${JSON.stringify(pedido.email)}).`,
    );
  }
  const { email: emailValido, nome } = validado.data;

  try {
    return await banco().transaction(async (tx) => {
      const pessoa = await criarPessoaPendente(tx, { nome, email: emailValido, perfil: "ADM" });
      if (!pessoa) throw emailJaCadastrado(emailValido);
      const { link, expiraEm } = await gravarEEnviarConvite({
        tx,
        pessoa,
        urlSite,
        enviar: pedido.enviarEmail ? enviar : false,
        acao: "convite.enviar",
        detalhe: { origem: "criar-admin" },
      });
      return { pessoaId: pessoa.id, link, expiraEm, emailEnviado: pedido.enviarEmail };
    });
  } catch (erro) {
    if (ehEmailRepetido(erro)) throw emailJaCadastrado(emailValido);
    throw erro;
  }
}

function emailJaCadastrado(email: string) {
  return new ErroCriarAdmin(`Não criei o convite: já existe uma pessoa da equipe com o e-mail ${email}.`);
}

function codigoPostgres(erro: unknown): string | undefined {
  const causa = erro instanceof Error && erro.cause ? erro.cause : erro;
  return typeof causa === "object" && causa !== null && "code" in causa ? String(causa.code) : undefined;
}
