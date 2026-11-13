import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { banco } from "@/lib/db";
import { parametro } from "@/lib/db/schema";

import { CATALOGO, limparCacheParametros, lerParametro } from ".";

beforeEach(() => {
  limparCacheParametros();
});

afterEach(() => {
  vi.useRealTimers();
});

async function gravar(chave: string, valor: unknown) {
  await banco()
    .update(parametro)
    .set({ valor: sql`${JSON.stringify(valor)}::jsonb` })
    .where(eq(parametro.chave, chave));
}

describe("Parametro: valores iniciais do regras-de-negocio.md §3", () => {
  // Valores copiados à mão da tabela do §3.
  it.each([
    ["agendamento.prazo_cancelar_horas", 2], // RN27: 2 horas antes
    ["agendamento.antecedencia_maxima_dias", 30], // RN24
    ["agendamento.ativos_por_servico_por_pessoa", 1], // RN25
    ["agendamento.faltas_para_suspensao", 2], // RN31
    ["agendamento.suspensao_dias", 15], // RN31
    ["agendamento.lembretes_horas_antes", [24, 2]], // RN29: 1 dia e 2 horas antes
    ["equipe.tentativas_login", 5], // RN05
    ["equipe.bloqueio_minutos", 15], // RN05
    ["convite.validade_horas", 48], // RN46
    ["equipe.link_senha_horas", 1], // RN48
    ["equipe.senha_minimo_caracteres", 10], // RN47
    ["equipe.senhas_anteriores_bloqueadas", 3], // RN47
    ["equipe.codigos_recuperacao", 8], // RN49
    ["equipe.minimo_adm_ativos", 2], // RN50
    ["associado.senha_minimo_caracteres", 8], // RN51
    ["associado.tentativas_login", 5], // RN51
    ["associado.bloqueio_minutos", 15], // RN51
    ["associado.sessao_lembrar_dias", 30], // RN51
    ["associado.link_senha_horas", 1], // RN52
    ["associado.link_novo_email_horas", 24], // RN53
    ["equipe.sessao_sem_uso_horas", 2], // RNF02
    ["equipe.sessao_maxima_horas", 12], // RNF02
    ["guarda.atendimentos_anos", 5], // E25
    ["guarda.atividade_anos", 5], // E25
    ["guarda.logs_acesso_meses", 6], // E25
    ["guarda.notificacoes_dias", 90], // E25
    ["associado.inativo_aviso_anos", 2], // E25
    ["associado.inativo_exclusao_dias", 30], // E25
    ["api.ultima_consulta_valida_horas", 24], // E22
    ["aviso.duracao_segundos", 6], // RN42
    ["site.atualizacao_config_segundos", 60], // RN43: até 1 minuto
    ["alerta.vigencia_documento_dias", 2], // RN44
    ["alerta.rascunho_parado_dias", 7], // RN44
    ["editor.salvamento_automatico_segundos", 2], // RF38, E40
    ["tarefas.tentativas", 3], // RNF13, E44
    ["tarefas.intervalo_segundos", 60], // RNF13, E44
    ["documento.novo_dias", 7], // E46: selo “Novo” na página Documentos (#16)
    ["documento.extracao_tempo_maximo_ms", 20000], // P3, E46
    ["documento.extracao_paginas_maximas", 200], // P3, E46
  ])("%s = %j", async (chave, valor) => {
    expect(await lerParametro(chave as keyof typeof CATALOGO)).toEqual(valor);
  });

  it("toda chave do catálogo tem valor no banco", async () => {
    const linhas = await banco().select({ chave: parametro.chave }).from(parametro);
    expect(linhas.map((l) => l.chave).sort()).toEqual(Object.keys(CATALOGO).sort());
  });
});

describe("lerParametro: cache", () => {
  it("guarda o valor por 60 s; depois disso, lê de novo do banco", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
    expect(await lerParametro("alerta.rascunho_parado_dias")).toBe(7);

    await gravar("alerta.rascunho_parado_dias", 10);
    vi.setSystemTime(new Date("2026-11-07T12:00:59Z"));
    expect(await lerParametro("alerta.rascunho_parado_dias")).toBe(7);

    vi.setSystemTime(new Date("2026-11-07T12:01:01Z"));
    expect(await lerParametro("alerta.rascunho_parado_dias")).toBe(10);

    await gravar("alerta.rascunho_parado_dias", 7);
  });

  it("valor com o tipo errado no banco dá erro claro", async () => {
    await gravar("alerta.vigencia_documento_dias", "dois");
    try {
      await expect(lerParametro("alerta.vigencia_documento_dias")).rejects.toThrow(
        /alerta\.vigencia_documento_dias/,
      );
    } finally {
      await gravar("alerta.vigencia_documento_dias", 2);
    }
  });
});
