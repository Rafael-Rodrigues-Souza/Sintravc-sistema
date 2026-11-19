"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { lerParametro } from "@/lib/parametros";

import { COOKIE_CONSENTIMENTO } from "./consentimento-comum";

/**
 * Guarda a escolha do aviso de cookies (RN45, E56). A validade vem do Parametro. Devolve se gravou:
 * a tela só fecha o aviso depois da confirmação. Ação pública, sem pode(): não grava dado do
 * sistema, só um cookie no navegador de quem escolheu (E56).
 */
export async function escolherCookies(escolha: unknown): Promise<{ ok: boolean }> {
  const valor = z.enum(["essenciais", "todos"]).safeParse(escolha);
  if (!valor.success) return { ok: false };
  try {
    const dias = await lerParametro("site.consentimento_cookies_dias");
    (await cookies()).set(COOKIE_CONSENTIMENTO, valor.data, {
      maxAge: dias * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
    return { ok: true };
  } catch (erro) {
    console.error("Aviso de cookies: não foi possível gravar a escolha.", erro);
    return { ok: false };
  }
}
