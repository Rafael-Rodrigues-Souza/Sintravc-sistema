import { z } from "zod";

import { banco } from "@/lib/db";
import { parametro } from "@/lib/db/schema";

/**
 * Valores das regras (regras-de-negocio.md §3; spec §11 T4). Nunca fixe estes números no código:
 * leia com lerParametro(). Os valores iniciais estão na migração drizzle/0003_parametros_iniciais.sql;
 * aqui fica só o tipo de cada chave.
 */
const inteiro = z.number().int().nonnegative();

export const CATALOGO = {
  "agendamento.prazo_cancelar_horas": inteiro,
  "agendamento.antecedencia_maxima_dias": inteiro,
  "agendamento.ativos_por_servico_por_pessoa": inteiro,
  "agendamento.faltas_para_suspensao": inteiro,
  "agendamento.suspensao_dias": inteiro,
  "agendamento.lembretes_horas_antes": z.array(inteiro),
  "equipe.tentativas_login": inteiro,
  "equipe.bloqueio_minutos": inteiro,
  "convite.validade_horas": inteiro,
  "equipe.link_senha_horas": inteiro,
  "equipe.link_senha_intervalo_segundos": inteiro,
  "equipe.senha_minimo_caracteres": inteiro,
  "equipe.senhas_anteriores_bloqueadas": inteiro,
  "equipe.codigos_recuperacao": inteiro,
  "equipe.minimo_adm_ativos": inteiro,
  "equipe.sessao_sem_uso_horas": inteiro,
  "equipe.sessao_maxima_horas": inteiro,
  "associado.senha_minimo_caracteres": inteiro,
  "associado.tentativas_login": inteiro,
  "associado.bloqueio_minutos": inteiro,
  "associado.sessao_lembrar_dias": inteiro,
  "associado.link_senha_horas": inteiro,
  "associado.link_novo_email_horas": inteiro,
  "associado.inativo_aviso_anos": inteiro,
  "associado.inativo_exclusao_dias": inteiro,
  "guarda.atendimentos_anos": inteiro,
  "guarda.atividade_anos": inteiro,
  "guarda.logs_acesso_meses": inteiro,
  "guarda.notificacoes_dias": inteiro,
  "api.ultima_consulta_valida_horas": inteiro,
  "aviso.duracao_segundos": inteiro,
  "site.atualizacao_config_segundos": inteiro,
  "alerta.vigencia_documento_dias": inteiro,
  "alerta.rascunho_parado_dias": inteiro,
  "midia.tamanho_maximo_bytes": inteiro,
  "midia.imagem_lado_maximo_px": inteiro,
  "midia.jpg_qualidade": z.number().int().min(1).max(100),
  "editor.salvamento_automatico_segundos": z.number().positive(),
  "tarefas.tentativas": inteiro,
  "tarefas.intervalo_segundos": inteiro,
  "documento.novo_dias": inteiro,
  "documento.extracao_tempo_maximo_ms": z.number().int().positive(),
  "documento.extracao_paginas_maximas": z.number().int().positive(),
} satisfies Record<string, z.ZodType>;

export type ChaveParametro = keyof typeof CATALOGO;
export type ValorParametro<C extends ChaveParametro> = z.infer<(typeof CATALOGO)[C]>;

/**
 * Tempo do cache. O ADM muda os valores direto no banco (T4); a mudança vale em até 1 minuto,
 * o mesmo prazo das Configurações (RN43).
 */
const VALIDADE_DO_CACHE_MS = 60_000;

let cache: { valores: Map<string, unknown>; lidoEm: number } | undefined;

async function valores(): Promise<Map<string, unknown>> {
  const agora = Date.now();
  if (!cache || agora - cache.lidoEm >= VALIDADE_DO_CACHE_MS) {
    const linhas = await banco().select({ chave: parametro.chave, valor: parametro.valor }).from(parametro);
    cache = { valores: new Map(linhas.map((l) => [l.chave, l.valor])), lidoEm: agora };
  }
  return cache.valores;
}

/** Lê um parâmetro, com cache de 60 s. Valor ausente ou com o tipo errado dá erro claro. */
export async function lerParametro<C extends ChaveParametro>(chave: C): Promise<ValorParametro<C>> {
  const todos = await valores();
  if (!todos.has(chave)) {
    throw new Error(`Parâmetro "${chave}" não encontrado na tabela parametro. Rode as migrações (pnpm db:migrar).`);
  }
  const resultado = CATALOGO[chave].safeParse(todos.get(chave));
  if (!resultado.success) {
    throw new Error(
      `Parâmetro "${chave}" com valor inválido no banco (${JSON.stringify(todos.get(chave))}): ${resultado.error.issues[0]?.message ?? "tipo errado"}.`,
    );
  }
  return resultado.data as ValorParametro<C>;
}

/** Esquece o cache (testes, ou depois de mudar um valor quando não dá para esperar 1 minuto). */
export function limparCacheParametros() {
  cache = undefined;
}
