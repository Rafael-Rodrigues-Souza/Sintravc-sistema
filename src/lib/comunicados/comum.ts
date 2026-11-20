import { and, gt, inArray, lte } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import type { Transacao } from "@/lib/db";
import { comunicado } from "@/lib/db/schema";
import type { QuemDaEquipe } from "@/lib/permissoes";

import { rotuloDoComunicado } from "./regras";

/**
 * No ar agora, no banco: agendado ou publicado, com `inicio ≤ agora < fim` (E58). É o mesmo que
 * `situacaoDo() === "no_ar"`, para a faixa do site, a aba No ar e a fila.
 */
export function filtroNoAr(agora: Date) {
  return and(inArray(comunicado.estado, ["agendado", "publicado"]), lte(comunicado.inicio, agora), gt(comunicado.fim, agora));
}

/** Grava a ação na Atividade, na transação de quem chamou. Sem `quem`, o ator é o sistema (T02). */
export async function registrar(
  tx: Transacao,
  quem: QuemDaEquipe | null,
  alvo: { id: string; mensagem: string },
  acao: string,
  detalhe: Record<string, unknown> = {},
) {
  await registrarAtividade(tx, {
    ator: quem ? { tipo: "pessoa", id: quem.id } : { tipo: "sistema" },
    acao: `comunicado.${acao}`,
    area: "comunicados",
    alvo: { tipo: "comunicado", id: alvo.id, rotulo: rotuloDoComunicado(alvo.mensagem) },
    detalhe,
  });
}
