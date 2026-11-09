import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { lerEnvEmail, type EnvEmail } from "@/lib/env";

/** Opções do transporte SMTP a partir das variáveis de ambiente. Função pura, testada. */
export function opcoesSmtp(env: EnvEmail): SMTPTransport.Options {
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USUARIO ? { user: env.SMTP_USUARIO, pass: env.SMTP_SENHA ?? "" } : undefined,
  };
}

let transporte: Transporter<SMTPTransport.SentMessageInfo> | undefined;

function obterTransporte() {
  transporte ??= nodemailer.createTransport(opcoesSmtp(lerEnvEmail()));
  return transporte;
}

export type Mensagem = {
  para: string | string[];
  assunto: string;
  texto: string;
  html?: string;
};

/** Quem envia um e-mail: enviarEmail() de verdade, ou uma caixa de saída nos testes. */
export type Enviar = (mensagem: Mensagem) => Promise<{ idMensagem: string }>;

/** Envia um e-mail pelo SMTP configurado (Mailpit no desenvolvimento). */
export const enviarEmail: Enviar = async (mensagem) => {
  const { EMAIL_REMETENTE } = lerEnvEmail();
  const info = await obterTransporte().sendMail({
    from: EMAIL_REMETENTE,
    to: mensagem.para,
    subject: mensagem.assunto,
    text: mensagem.texto,
    html: mensagem.html,
  });
  return { idMensagem: info.messageId };
};
