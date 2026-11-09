"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { trocarSenhaPeloLink } from "@/lib/acesso/nova-senha";
import { lerParametro } from "@/lib/parametros";

export type EstadoNovaSenha = { erro?: string };

/** Nova senha pelo link (RN47, RN48; CA-US41.4). O servidor confere o link e as regras de novo. */
export async function acaoTrocarSenha(_anterior: EstadoNovaSenha, formulario: FormData): Promise<EstadoNovaSenha> {
  const token = String(formulario.get("token") ?? "");
  const senha = String(formulario.get("senha") ?? "");
  const confirmacao = String(formulario.get("confirmacao") ?? "");

  const resultado = await trocarSenhaPeloLink({ token, senha, confirmacao }, { cabecalhos: await headers() });
  switch (resultado.tipo) {
    case "ok":
      redirect("/painel/entrar?motivo=senha_alterada");
    case "invalido":
      // A página mostra "Este link não vale mais".
      redirect(`/painel/nova-senha/${encodeURIComponent(token)}`);
    case "senha_fraca":
      return { erro: "A senha ainda não atende a todos os requisitos." };
    case "confirmacao_diferente":
      return { erro: "As duas senhas não são iguais. Digite a mesma senha nos dois campos." };
    case "senha_repetida": {
      const quantas = await lerParametro("equipe.senhas_anteriores_bloqueadas");
      return { erro: `Esta senha já foi usada. Escolha uma diferente das ${quantas} últimas.` };
    }
  }
}
