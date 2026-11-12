import { eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { documento } from "@/lib/db/schema";
import { agendarNaTransacao, conferirNoFuturo, type DepsDoAgendamento } from "@/lib/conteudos/agendar";
import { travarConteudo } from "@/lib/conteudos/tipo-do-conteudo";
import { exigir } from "@/lib/permissoes";

import { lerDocumento, type DocumentoAberto } from "./carregar";
import { conferirConfirmacaoOficial, TIPOS_DE_DOCUMENTO } from "./publicar";

export type ResultadoAgendarDocumento = { tipo: "agendado"; para: Date } | { tipo: "conflito"; servidor: DocumentoAberto };

/**
 * Agenda o documento oficial (RF41, E44, E46). Como no "Publicar", pede a confirmação de que o PDF
 * é a versão oficial e assinada (RN12); quem confirmou fica no documento e é o autor da versão que
 * vai ao ar na hora marcada. Os obrigatórios são conferidos agora e de novo na hora.
 */
export async function agendarDocumento(
  entrada: { id: string; revisaoBase: number; para: Date; confirmoOficial: boolean },
  deps: DepsDoAgendamento,
): Promise<ResultadoAgendarDocumento> {
  exigir(deps.quem, "agendar", { tipo: "documento" });
  conferirConfirmacaoOficial(entrada.confirmoOficial);
  conferirNoFuturo(entrada.para, deps.agora);
  return banco().transaction(async (tx) => {
    const atual = await travarConteudo(tx, entrada.id, TIPOS_DE_DOCUMENTO);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerDocumento(tx, entrada.id))! };
    }
    await agendarNaTransacao(tx, atual, entrada.para, deps, { confirmou_versao_oficial: true });
    await tx.update(documento).set({ confirmadoOficialPor: deps.quem.id }).where(eq(documento.conteudoId, atual.id));
    return { tipo: "agendado", para: entrada.para };
  });
}
