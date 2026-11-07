import { createHash, randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { registrarAtividade } from "@/lib/atividade";
import { banco } from "@/lib/db";
import { convite, pessoaEquipe } from "@/lib/db/schema";
import { enviarEmail, type Mensagem } from "@/lib/email";
import { lerParametro } from "@/lib/parametros";

/** Erro esperado do comando (e-mail inválido, já cadastrado…): a mensagem vai direto para quem rodou. */
export class ErroCriarAdmin extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroCriarAdmin";
  }
}

const esquemaPedido = z.object({
  email: z.string().trim().pipe(z.email({ error: "e-mail inválido" })),
  nome: z.string().trim().min(1, { error: "informe o nome (--nome)" }),
});

/** O token puro só aparece no link; no banco fica o hash (E35). */
export function hashDoToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Endereço da tela de aceite do convite (ticket #5). */
export function linkDoConvite(urlSite: string, token: string) {
  return `${urlSite.replace(/\/+$/, "")}/painel/convite/${token}`;
}

type Pedido = { email: string; nome: string; enviarEmail: boolean };
type Dependencias = {
  urlSite: string;
  enviar?: (mensagem: Mensagem) => Promise<{ idMensagem: string }>;
};

/**
 * Cria o convite de um Administrador geral (E33), o caminho do primeiro ADM em todos os ambientes.
 *
 * Tudo numa transação: a pessoa (pendente), o convite e a Atividade. O e-mail sai no fim, ainda
 * dentro da transação: se o envio falhar, nada fica gravado e o comando pode ser rodado de novo.
 * Com `enviarEmail: false` (--sem-email), só devolve o link.
 */
export async function criarConviteAdmin(pedido: Pedido, { urlSite, enviar = enviarEmail }: Dependencias) {
  const validado = esquemaPedido.safeParse(pedido);
  if (!validado.success) {
    throw new ErroCriarAdmin(
      `Não criei o convite: ${validado.error.issues.map((i) => i.message).join("; ")} (${JSON.stringify(pedido.email)}).`,
    );
  }
  const { email, nome } = validado.data;

  const validadeHoras = await lerParametro("convite.validade_horas");
  const token = randomBytes(32).toString("base64url");
  const link = linkDoConvite(urlSite, token);
  const expiraEm = new Date(Date.now() + validadeHoras * 60 * 60 * 1000);

  try {
    return await banco().transaction(async (tx) => {
      const [existente] = await tx
        .select({ id: pessoaEquipe.id })
        .from(pessoaEquipe)
        .where(eq(pessoaEquipe.email, email));
      if (existente) throw emailJaCadastrado(email);

      const [pessoa] = await tx
        .insert(pessoaEquipe)
        .values({ nome, email, perfil: "ADM", situacao: "pendente" })
        .returning({ id: pessoaEquipe.id });
      if (!pessoa) throw new Error("O banco não devolveu a pessoa criada.");

      await tx.insert(convite).values({ pessoaId: pessoa.id, tokenHash: hashDoToken(token), expiraEm });

      await registrarAtividade(tx, {
        ator: { tipo: "sistema" },
        acao: "convite.enviar",
        area: "equipe",
        alvo: { tipo: "pessoa_equipe", id: pessoa.id, rotulo: nome },
        detalhe: {
          origem: "criar-admin",
          perfil: "ADM",
          email,
          expiraEm: expiraEm.toISOString(),
          emailEnviado: pedido.enviarEmail,
        },
      });

      if (pedido.enviarEmail) {
        await enviar(mensagemDoConvite({ para: email, nome, link, validadeHoras }));
      }

      return { pessoaId: pessoa.id, link, expiraEm, emailEnviado: pedido.enviarEmail };
    });
  } catch (erro) {
    // Duas execuções ao mesmo tempo: a restrição única do banco pega a segunda.
    if (codigoPostgres(erro) === "23505") throw emailJaCadastrado(email);
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

/** Texto provisório. O modelo do Figma (M01, 265:40803) em React Email vem no ticket #5. */
function mensagemDoConvite(dados: { para: string; nome: string; link: string; validadeHoras: number }): Mensagem {
  const { para, nome, link, validadeHoras } = dados;
  return {
    para,
    assunto: "Convite para o painel do SINTRAVC",
    texto: [
      `Olá, ${nome}.`,
      "",
      "Você recebeu um convite para entrar no painel do SINTRAVC como Administrador geral.",
      "",
      `Abra o link abaixo para criar sua senha e ativar a verificação em duas etapas. O link vale por ${validadeHoras} horas e só pode ser usado uma vez:`,
      link,
      "",
      "Se você não esperava este convite, ignore este e-mail.",
    ].join("\n"),
    html: [
      `<p>Olá, ${escaparHtml(nome)}.</p>`,
      "<p>Você recebeu um convite para entrar no painel do SINTRAVC como <strong>Administrador geral</strong>.</p>",
      `<p>Abra o link abaixo para criar sua senha e ativar a verificação em duas etapas. O link vale por ${validadeHoras} horas e só pode ser usado uma vez:</p>`,
      `<p><a href="${escaparHtml(link)}">${escaparHtml(link)}</a></p>`,
      "<p>Se você não esperava este convite, ignore este e-mail.</p>",
    ].join("\n"),
  };
}

function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
