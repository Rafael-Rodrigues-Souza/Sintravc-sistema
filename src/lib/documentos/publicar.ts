import { eq } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { documento } from "@/lib/db/schema";
import { copiaDeTrabalho } from "@/lib/conteudos/copia-de-trabalho";
import { ErroConteudo } from "@/lib/conteudos/erros";
import { irAoAr } from "@/lib/conteudos/publicar";
import { palavrasDo, registrarAtividadeConteudo, travarConteudo, type LinhaDoConteudo } from "@/lib/conteudos/tipo-do-conteudo";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { lerDocumento, retratoDoDocumento, type DocumentoAberto } from "./carregar";

export type DepsDaPublicacaoDocumento = { quem: QuemDaEquipe; sessaoEdicao?: string };

export type ResultadoPublicarDocumento =
  | { tipo: "publicado"; versao: number; revisaoPublicada: number; publicadoEm: Date; slug: string }
  /** Alguém salvou depois da `revisaoBase`: nada foi publicado; a pessoa escolhe a versão (N4). */
  | { tipo: "conflito"; servidor: DocumentoAberto };

export const TIPOS_DE_DOCUMENTO = ["edital", "acordo"] as const;

/** A caixa "Confirmo que o PDF é a versão oficial e assinada" (RN12, CA-US23.1), conferida no servidor. */
export function conferirConfirmacaoOficial(confirmoOficial: boolean) {
  if (confirmoOficial !== true) {
    throw new ErroConteudo("invalido", "Confirme que o PDF é a versão oficial e assinada.", "confirmoOficial");
  }
}

/**
 * Publica agora o documento oficial (RF41, RN12, E46). Só o ADM. A cada ida ao ar, inclusive
 * "Publicar alterações" e a troca do PDF ("substituir"), a pessoa confirma que o PDF é o oficial e
 * assinado; quem confirmou fica no documento e na Atividade. Gera a versão na mesma transação.
 */
export async function publicarDocumento(
  entrada: { id: string; revisaoBase: number; confirmoOficial: boolean },
  deps: DepsDaPublicacaoDocumento,
): Promise<ResultadoPublicarDocumento> {
  exigir(deps.quem, "publicar", { tipo: "documento" });
  conferirConfirmacaoOficial(entrada.confirmoOficial);
  return banco().transaction(async (tx) => {
    const atual = await travarConteudo(tx, entrada.id, TIPOS_DE_DOCUMENTO);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerDocumento(tx, entrada.id))! };
    }
    if (atual.estado !== "rascunho" && atual.estado !== "agendado" && atual.estado !== "publicado") {
      const p = palavrasDo(atual.tipo);
      throw new ErroConteudo("invalido", `${p.este} não pode ser ${p.o("publicad")} no estado em que está. Atualize a página.`);
    }
    if (atual.estado === "publicado" && atual.revisaoPublicada === atual.revisao) return publicado(atual);
    return publicarDocumentoNaTransacao(tx, atual, deps.quem, { quem: deps.quem, sessaoEdicao: deps.sessaoEdicao });
  });
}

/**
 * Põe no ar a cópia de trabalho do documento travado, já com a confirmação conferida. Também usada
 * pela publicação agendada, com quem agendou (e confirmou) como autor da versão.
 */
export async function publicarDocumentoNaTransacao(
  tx: Transacao,
  atual: LinhaDoConteudo,
  confirmou: { id: string },
  deps: DepsDaPublicacaoDocumento,
) {
  const anterior = atual.jaPublicado ? await retratoDoDocumento(tx, atual.id) : null;
  const copia = await copiaDeTrabalho(tx, atual);
  const trocouPdf = !!anterior && anterior.dados.pdfMidiaId !== copia.pdfMidiaId;
  if (trocouPdf) exigir(deps.quem, "substituir", { tipo: "documento" });

  const { gravado, versao, primeira } = await irAoAr(tx, atual, copia, { criadoPor: confirmou.id, agora: new Date() });
  await tx.update(documento).set({ confirmadoOficialPor: confirmou.id }).where(eq(documento.conteudoId, atual.id));

  const verbo = primeira ? "publicar" : trocouPdf ? "substituir_pdf" : "publicar_alteracoes";
  await registrarAtividadeConteudo(tx, { id: atual.id, tipo: atual.tipo, titulo: copia.titulo }, verbo, deps, {
    versao,
    pdf_midia_id: copia.pdfMidiaId,
    ...(trocouPdf ? { pdf_anterior_id: anterior!.dados.pdfMidiaId } : {}),
    confirmou_versao_oficial: true,
  });
  return publicado(gravado);
}

function publicado(linha: LinhaDoConteudo): Extract<ResultadoPublicarDocumento, { tipo: "publicado" }> {
  return {
    tipo: "publicado",
    versao: linha.versao,
    revisaoPublicada: linha.revisaoPublicada!,
    publicadoEm: linha.publicadoEm!,
    slug: linha.slug!,
  };
}
