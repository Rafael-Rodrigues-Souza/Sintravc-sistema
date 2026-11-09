"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/acesso/auth";
import { normalizarCodigoRecuperacao } from "@/lib/acesso/codigo-digitado";
import { confirmarCodigo, entrar, type Resultado } from "@/lib/acesso/entrar";
import { pedirNovaSenha } from "@/lib/acesso/nova-senha";
import { DIGITOS_TOTP } from "@/lib/acesso/opcoes-totp";
import { voltarSeguro } from "@/lib/acesso/sessao";
import { FUSO } from "@/lib/datas";
import { lerEnvAcesso } from "@/lib/env";

export type EstadoDoFormulario = {
  erro?: string;
  /** Hora do fim do bloqueio, já no horário da Bahia (RNF06). */
  bloqueadaAte?: string;
  email?: string;
};

const ERRO_LOGIN = "E-mail ou senha incorretos. Confira e tente de novo.";
const ERRO_CODIGO = "Código incorreto. Confira o código no aplicativo autenticador e tente de novo.";

function horaDaBahia(data: Date) {
  return data.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
}

function comVoltar(caminho: string, voltar: string) {
  const destino = voltarSeguro(voltar);
  return destino === "/painel" ? caminho : `${caminho}?voltar=${encodeURIComponent(destino)}`;
}

export async function acaoEntrar(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const email = String(formulario.get("email") ?? "").trim();
  const senha = String(formulario.get("senha") ?? "");
  const voltar = String(formulario.get("voltar") ?? "");
  if (!email || !senha) return { erro: "Informe o e-mail de trabalho e a senha.", email };

  const resultado = await entrar({ email, senha }, { cabecalhos: await headers() });
  switch (resultado.tipo) {
    case "precisa_codigo":
      redirect(comVoltar("/painel/entrar/codigo", voltar));
    case "bloqueada":
      return { bloqueadaAte: horaDaBahia(resultado.ate), email };
    default:
      return { erro: ERRO_LOGIN, email };
  }
}

export async function acaoConfirmarCodigo(
  _anterior: EstadoDoFormulario,
  formulario: FormData,
): Promise<EstadoDoFormulario> {
  const codigo = String(formulario.get("codigo") ?? "").replace(/\D/g, "");
  const voltar = String(formulario.get("voltar") ?? "");
  if (codigo.length !== DIGITOS_TOTP) return { erro: `Digite os ${DIGITOS_TOTP} números do aplicativo autenticador.` };

  const resultado = await confirmarCodigo({ codigo }, { cabecalhos: await headers() });
  return depoisDoCodigo(resultado, voltar, ERRO_CODIGO);
}

const ERRO_RECUPERACAO = "Código inválido ou já usado. Confira o código no papel e tente de novo.";

/** Entrar com um código de recuperação no lugar do código do aplicativo (US42, RN49). */
export async function acaoConfirmarRecuperacao(
  _anterior: EstadoDoFormulario,
  formulario: FormData,
): Promise<EstadoDoFormulario> {
  // Maiúsculas, sem espaços, com o hífen: o formato guardado (E37).
  const codigo = normalizarCodigoRecuperacao(String(formulario.get("codigo") ?? ""));
  const voltar = String(formulario.get("voltar") ?? "");
  if (!codigo) return { erro: "Digite o código como está no papel: 10 letras e números, como ABCDE-23456." };

  const resultado = await confirmarCodigo({ codigo, tipo: "recuperacao" }, { cabecalhos: await headers() });
  return depoisDoCodigo(resultado, voltar, ERRO_RECUPERACAO);
}

function depoisDoCodigo(resultado: Resultado, voltar: string, erro: string): EstadoDoFormulario {
  switch (resultado.tipo) {
    case "entrou":
      redirect(voltarSeguro(voltar));
    case "bloqueada":
      return { bloqueadaAte: horaDaBahia(resultado.ate) };
    case "desafio_vencido": {
      const destino = voltarSeguro(voltar);
      const parametros = new URLSearchParams({ motivo: "codigo" });
      if (destino !== "/painel") parametros.set("voltar", destino);
      redirect(`/painel/entrar?${parametros}`);
    }
    default:
      return { erro };
  }
}

export type EstadoEsqueci = { erro?: string; email?: string; enviadoPara?: string; enviadoEm?: number };

const emailValido = z.string().trim().pipe(z.email());

/**
 * "Esqueci minha senha" (RN48, CA-US41.1 e 41.2). A resposta é sempre "Confira seu e-mail".
 * O envio roda depois da resposta (after): o tempo de resposta não revela se o e-mail tem acesso.
 */
export async function acaoPedirNovaSenha(_anterior: EstadoEsqueci, formulario: FormData): Promise<EstadoEsqueci> {
  const email = String(formulario.get("email") ?? "").trim();
  if (!email) return { erro: "Informe o seu e-mail de trabalho.", email };
  if (!emailValido.safeParse(email).success) return { erro: "Informe um e-mail válido, como nome@sintravc.org.br.", email };

  const { URL_SITE } = lerEnvAcesso();
  after(() => pedirNovaSenha({ email }, { urlSite: URL_SITE }));
  return { enviadoPara: email, enviadoEm: Date.now() };
}

export async function acaoSair() {
  await auth().api.signOut({ headers: await headers() });
  redirect("/painel/entrar");
}
