import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

import { banco } from "@/lib/db";
import { pessoaEquipe, sessao } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";
import { areasDoPainel, type AreaDoPainel, type Perfil, type QuemDaEquipe } from "@/lib/permissoes";

import { auth } from "./auth";
import { estadoDaSessao, urlDoLogin } from "./sessao";

/** Cabeçalho que o proxy (src/proxy.ts) preenche com o endereço pedido. */
export const CABECALHO_CAMINHO = "x-sintravc-caminho";
const COOKIE_DA_SESSAO = ["sintravc.session_token", "__Secure-sintravc.session_token"];
/** Grava o último uso no máximo uma vez por minuto. */
const INTERVALO_ULTIMO_USO_MS = 60_000;

export type PessoaLogada = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  /** Para pode(), exigir() e o menu. Sempre uma pessoa da equipe. */
  quem: QuemDaEquipe;
};

export type SessaoRecusada = { motivo: "sem_sessao" | "expirou" | "inativa"; tinhaCookie: boolean };

/**
 * Confere a sessão da equipe a partir dos cabeçalhos da requisição, sem redirecionar. É o miolo do
 * sessaoDaEquipe() e também serve às rotas (ex.: POST /api/midia), que respondem 401.
 *
 * Confere as regras do E05 com os valores do Parametro: 2 h sem uso ou 12 h após o login.
 * A sessão vencida, ou de pessoa que não está mais ativa, é apagada (spec §2.1).
 */
export async function conferirSessaoDaEquipe(
  cabecalhos: Headers,
  agora: Date = new Date(),
): Promise<PessoaLogada | SessaoRecusada> {
  const resultado = await auth().api.getSession({ headers: cabecalhos });
  if (!resultado) {
    const cookies = cabecalhos.get("cookie") ?? "";
    return { motivo: "sem_sessao", tinhaCookie: COOKIE_DA_SESSAO.some((nome) => cookies.includes(`${nome}=`)) };
  }

  const [linha] = await banco()
    .select({ criadoEm: sessao.criadoEm, ultimoUso: sessao.ultimoUso })
    .from(sessao)
    .where(eq(sessao.id, resultado.session.id));
  const [pessoa] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.id, resultado.user.id));

  if (!linha) {
    // A sessão sumiu entre a leitura do Better Auth e esta: outra requisição ao mesmo tempo (ex.: a
    // pré-busca dos links do menu) viu que ela venceu e a apagou. Para a pessoa, a sessão expirou.
    return { motivo: "expirou", tinhaCookie: true };
  }
  if (!pessoa || pessoa.situacao !== "ativa") {
    await banco().delete(sessao).where(eq(sessao.id, resultado.session.id));
    return { motivo: "inativa", tinhaCookie: true };
  }

  const estado = estadoDaSessao({
    criadaEm: linha.criadoEm,
    ultimoUso: linha.ultimoUso,
    agora,
    limites: {
      semUsoHoras: await lerParametro("equipe.sessao_sem_uso_horas"),
      maximaHoras: await lerParametro("equipe.sessao_maxima_horas"),
    },
  });
  if (estado !== "valida") {
    await banco().delete(sessao).where(eq(sessao.id, resultado.session.id));
    return { motivo: "expirou", tinhaCookie: true };
  }

  if (agora.getTime() - linha.ultimoUso.getTime() >= INTERVALO_ULTIMO_USO_MS) {
    await banco().update(sessao).set({ ultimoUso: agora }).where(eq(sessao.id, resultado.session.id));
  }

  return {
    id: pessoa.id,
    nome: pessoa.nome,
    email: pessoa.email,
    perfil: pessoa.perfil,
    quem: { tipo: "equipe", id: pessoa.id, perfil: pessoa.perfil },
  };
}

export function sessaoRecusada(resultado: PessoaLogada | SessaoRecusada): resultado is SessaoRecusada {
  return "motivo" in resultado;
}

/** O login deve dizer "Sua sessão expirou"? Sim se venceu, ou se havia cookie de uma sessão que já não existe. */
export function mostrarComoExpirada(recusa: SessaoRecusada): boolean {
  return recusa.motivo === "expirou" || (recusa.motivo === "sem_sessao" && recusa.tinhaCookie);
}

/**
 * A pessoa da equipe desta requisição. Roda em todo layout, página e server action do painel
 * (uma vez por requisição, pelo cache do React). Sem sessão válida, manda para o login, que
 * mostra "Sua sessão expirou" quando for o caso e volta para a mesma página.
 */
export const sessaoDaEquipe = cache(async (): Promise<PessoaLogada> => {
  const cabecalhos = await headers();
  const caminho = cabecalhos.get(CABECALHO_CAMINHO) ?? "/painel";
  const resultado = await conferirSessaoDaEquipe(cabecalhos);
  if (sessaoRecusada(resultado)) {
    redirect(urlDoLogin({ voltar: caminho, expirou: mostrarComoExpirada(resultado) }));
  }
  return resultado;
});

/**
 * Para as páginas de cada área: exige sessão e permissão. Sem permissão, responde 403 com a
 * tela N1 (forbidden.tsx), mesmo para quem digita o endereço direto (CA-US19.3).
 */
export async function exigirArea(area: AreaDoPainel): Promise<PessoaLogada> {
  const pessoa = await sessaoDaEquipe();
  if (!areasDoPainel(pessoa.quem).includes(area)) forbidden();
  return pessoa;
}
