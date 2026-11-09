"use server";

import { revalidatePath } from "next/cache";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { convidarPessoa, ErroConvite, type CampoDoConvite, type PedidoDeConvite } from "@/lib/equipe/convite";
import { lerEnvSite } from "@/lib/env";
import { pode } from "@/lib/permissoes";

export type EstadoConvidar = {
  /** Mensagem por campo do formulário. */
  erros?: Partial<Record<CampoDoConvite, string>>;
  /** Falha que não é de um campo (sem permissão, e-mail que não saiu). */
  erro?: string;
  /** Convite enviado: o modal fecha e mostra o aviso. */
  enviadoPara?: string;
  /** O que a pessoa digitou, para não perder num erro. */
  valores?: PedidoDeConvite;
};

/** Convidar pessoa (RF51, RN46). A permissão é conferida aqui, no servidor (RNF01). */
export async function acaoConvidar(_anterior: EstadoConvidar, formulario: FormData): Promise<EstadoConvidar> {
  const valores: PedidoDeConvite = {
    nome: String(formulario.get("nome") ?? ""),
    email: String(formulario.get("email") ?? ""),
    perfil: String(formulario.get("perfil") ?? ""),
  };

  const pessoa = await sessaoDaEquipe();
  if (!pode(pessoa.quem, "convidar", { tipo: "equipe" })) {
    return { erro: "Só o administrador geral convida pessoas para a equipe.", valores };
  }

  try {
    await convidarPessoa(valores, { quem: { id: pessoa.id, nome: pessoa.nome }, urlSite: lerEnvSite().URL_SITE });
  } catch (erro) {
    if (erro instanceof ErroConvite) {
      return erro.campo === "geral" ? { erro: erro.message, valores } : { erros: { [erro.campo]: erro.message }, valores };
    }
    console.error("Falha ao enviar o convite.", erro);
    return {
      erro: "Não conseguimos enviar o e-mail do convite agora. Nada foi gravado. Tente de novo em alguns minutos.",
      valores,
    };
  }

  revalidatePath("/painel/equipe");
  return { enviadoPara: valores.email.trim() };
}
