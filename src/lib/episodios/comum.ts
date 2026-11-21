import { and, inArray, isNotNull, lte } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import type { Transacao } from "@/lib/db";
import { episodio } from "@/lib/db/schema";
import type { QuemDaEquipe } from "@/lib/permissoes";

import { rotuloDoEpisodio } from "./regras";

/**
 * No ar agora, no banco: agendado ou publicado, com `exibicao_em ≤ agora` (E61). É o mesmo que
 * `situacaoDo() === "no_ar"`, para o site e a rota da capa.
 */
export function filtroNoAr(agora: Date) {
  return and(inArray(episodio.estado, ["agendado", "publicado"]), isNotNull(episodio.exibicaoEm), lte(episodio.exibicaoEm, agora));
}

/** Grava a ação na Atividade, na transação de quem chamou. Sem `quem`, o ator é o sistema (T03). */
export async function registrar(
  tx: Transacao,
  quem: QuemDaEquipe | null,
  alvo: { id: string; numero: number; titulo: string },
  acao: string,
  detalhe: Record<string, unknown> = {},
) {
  await registrarAtividade(tx, {
    ator: quem ? { tipo: "pessoa", id: quem.id } : { tipo: "sistema" },
    acao: `episodio.${acao}`,
    area: "radio",
    alvo: { tipo: "episodio", id: alvo.id, rotulo: rotuloDoEpisodio(alvo.numero, alvo.titulo) },
    detalhe,
  });
}
