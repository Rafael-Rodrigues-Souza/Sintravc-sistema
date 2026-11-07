"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/acesso/auth";
import { confirmarCodigo, entrar } from "@/lib/acesso/entrar";
import { voltarSeguro } from "@/lib/acesso/sessao";

export type EstadoDoFormulario = {
  erro?: string;
  /** Hora do fim do bloqueio, já no horário da Bahia (RNF06). */
  bloqueadaAte?: string;
  email?: string;
};

const ERRO_LOGIN = "E-mail ou senha incorretos. Confira e tente de novo.";
const ERRO_CODIGO = "Código incorreto. Confira o código no aplicativo autenticador e tente de novo.";

function horaDaBahia(data: Date) {
  return data.toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" });
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
  if (codigo.length !== 6) return { erro: "Digite os 6 números do aplicativo autenticador." };

  const resultado = await confirmarCodigo({ codigo }, { cabecalhos: await headers() });
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
      return { erro: ERRO_CODIGO };
  }
}

export async function acaoSair() {
  await auth().api.signOut({ headers: await headers() });
  redirect("/painel/entrar");
}
