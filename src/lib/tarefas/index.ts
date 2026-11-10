import { lerEnvBanco } from "@/lib/env";
import { enviarEmail } from "@/lib/email";

import type { Fila } from "./fila";
import { criarTrabalhador, type Trabalhador } from "./trabalhador";

// Um trabalhador por processo, mesmo com as recargas do `next dev` (E44).
const global = globalThis as unknown as { trabalhador?: Promise<Trabalhador> };

/** O trabalhador da fila deste servidor, ligado na primeira vez que alguém pede. */
export function trabalhadorDoSistema(): Promise<Trabalhador> {
  global.trabalhador ??= criarTrabalhador({ url: lerEnvBanco().DATABASE_URL, enviar: enviarEmail }).catch((erro) => {
    global.trabalhador = undefined;
    throw erro;
  });
  return global.trabalhador;
}

/** A fila para as ações que agendam (as server actions). */
export async function filaDoSistema(): Promise<Fila> {
  return (await trabalhadorDoSistema()).fila;
}

/** Desliga com calma o trabalhador deste processo, se estiver ligado. */
export async function pararTrabalhador(): Promise<void> {
  const atual = global.trabalhador;
  global.trabalhador = undefined;
  if (atual) await (await atual).parar();
}
