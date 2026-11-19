"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { lerParametro } from "@/lib/parametros";

import { COOKIE_CONSENTIMENTO } from "./consentimento-comum";

/** Guarda a escolha do aviso de cookies (RN45, E56). A validade vem do Parametro. */
export async function escolherCookies(escolha: unknown) {
  const valor = z.enum(["essenciais", "todos"]).parse(escolha);
  const dias = await lerParametro("site.consentimento_cookies_dias");
  (await cookies()).set(COOKIE_CONSENTIMENTO, valor, {
    maxAge: dias * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
}
