import { lerEnvBanco } from "@/lib/env";
import { enviarEmail } from "@/lib/email";
import { limparCacheParametros } from "@/lib/parametros";

import type { Fila } from "./fila";
import { criarTrabalhador, type Trabalhador } from "./trabalhador";

// Um trabalhador por processo, mesmo com as recargas do `next dev` (E44).
const global = globalThis as unknown as { trabalhador?: Promise<Trabalhador>; desligando?: boolean };

/** Espera entre uma tentativa de ligar a fila e outra (banco ainda subindo, migração pendente). */
const ESPERA_PARA_LIGAR_DE_NOVO_MS = 10_000;

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

/**
 * Liga a fila sem segurar o servidor (E44): se o banco ainda não está pronto, o site continua no ar
 * e a fila tenta de novo a cada 10 s. As ações que agendam também ligam a fila, se precisarem.
 */
export function ligarEmSegundoPlano(): void {
  if (global.desligando) return;
  trabalhadorDoSistema().catch((erro) => {
    console.error("Não consegui ligar a fila de tarefas; tento de novo em 10 s.", erro);
    // A migração pode ter acabado de criar os parâmetros: a próxima tentativa lê de novo do banco.
    limparCacheParametros();
    setTimeout(ligarEmSegundoPlano, ESPERA_PARA_LIGAR_DE_NOVO_MS).unref();
  });
}

/** Desliga com calma o trabalhador deste processo, se estiver ligado. */
export async function pararTrabalhador(): Promise<void> {
  global.desligando = true;
  const atual = global.trabalhador;
  global.trabalhador = undefined;
  if (atual) await (await atual.catch(() => null))?.parar();
}
