import type { Transacao } from "@/lib/db";
import { atividade } from "@/lib/db/schema";

export type Ator =
  | { tipo: "pessoa"; id: string }
  | { tipo: "associado"; id: string }
  | { tipo: "sistema" };

export type NovaAtividade = {
  ator: Ator;
  /** O que aconteceu, no formato área.verbo (ex.: "noticia.ocultar", "convite.enviar"). */
  acao: string;
  /** Área do painel onde a ação aconteceu (filtro da tela Atividade). */
  area: string;
  alvo: { tipo: string; id: string; rotulo: string };
  detalhe?: Record<string, unknown>;
  motivo?: string;
};

/**
 * Registra uma ação na Atividade (RN18; spec §11 T1).
 *
 * Recebe a transação da própria ação: se a ação falhar, o registro também não é gravado.
 * Não existe versão sem transação, de propósito. A tabela é só inserção (trigger no banco).
 */
export async function registrarAtividade(tx: Transacao, nova: NovaAtividade): Promise<void> {
  await tx.insert(atividade).values({
    atorTipo: nova.ator.tipo,
    atorId: nova.ator.tipo === "sistema" ? null : nova.ator.id,
    acao: nova.acao,
    area: nova.area,
    alvoTipo: nova.alvo.tipo,
    alvoId: nova.alvo.id,
    alvoRotulo: nova.alvo.rotulo,
    detalhe: nova.detalhe ?? {},
    motivo: nova.motivo ?? null,
  });
}
