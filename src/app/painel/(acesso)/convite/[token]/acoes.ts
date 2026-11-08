"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { RequisitoDaSenha } from "@/lib/acesso/senha";
import { concluirConvite, confirmarDuasEtapas, criarSenhaDoConvite } from "@/lib/equipe/aceite";

/** Aceite do convite (US40). Cada ação confere de novo o token e a sessão provisória no servidor. */

export type EstadoCriarSenha = { erro?: string; faltando?: RequisitoDaSenha[] };

export async function acaoCriarSenha(_anterior: EstadoCriarSenha, formulario: FormData): Promise<EstadoCriarSenha> {
  const token = String(formulario.get("token") ?? "");
  const senha = String(formulario.get("senha") ?? "");
  const confirmacao = String(formulario.get("confirmacao") ?? "");

  const resultado = await criarSenhaDoConvite({ token, senha, confirmacao }, { cabecalhos: await headers() });
  switch (resultado.tipo) {
    case "ok":
    case "invalido":
      // A página decide: segue para as duas etapas, ou mostra "Este convite não vale mais".
      redirect(`/painel/convite/${encodeURIComponent(token)}`);
    case "senha_fraca":
      return { erro: "A senha ainda não atende a todos os requisitos.", faltando: resultado.faltando };
    case "confirmacao_diferente":
      return { erro: "As duas senhas não são iguais. Digite a mesma senha nos dois campos." };
  }
}

export type EstadoDuasEtapas = { erro?: string; codigos?: string[] };

export async function acaoConfirmarDuasEtapas(
  _anterior: EstadoDuasEtapas,
  formulario: FormData,
): Promise<EstadoDuasEtapas> {
  const token = String(formulario.get("token") ?? "");
  const codigo = String(formulario.get("codigo") ?? "").replace(/\D/g, "");
  if (codigo.length !== 6) return { erro: "Digite os 6 números que aparecem no aplicativo." };

  const resultado = await confirmarDuasEtapas({ token, codigo }, { cabecalhos: await headers() });
  switch (resultado.tipo) {
    case "ok":
      // Os códigos só existem aqui: a tela mostra uma vez (RN49, CA-US40.3).
      return { codigos: resultado.codigos };
    case "codigo_errado":
      return {
        erro: "Código incorreto. Confira se o relógio do celular está certo e digite o código que aparece agora.",
      };
    case "sem_sessao":
    case "invalido":
      redirect(`/painel/convite/${encodeURIComponent(token)}`);
  }
}

export type EstadoConcluir = { erro?: string };

export async function acaoConcluirConvite(_anterior: EstadoConcluir, formulario: FormData): Promise<EstadoConcluir> {
  const token = String(formulario.get("token") ?? "");
  if (formulario.get("guardei") !== "on") return { erro: "Confirme que guardou os códigos antes de entrar." };

  const resultado = await concluirConvite({ token }, { cabecalhos: await headers() });
  switch (resultado.tipo) {
    case "ok":
      redirect("/painel");
    case "sem_duas_etapas":
      return { erro: "Ative as duas etapas antes de entrar no painel." };
    case "sem_sessao":
    case "invalido":
      redirect(`/painel/convite/${encodeURIComponent(token)}`);
  }
}
