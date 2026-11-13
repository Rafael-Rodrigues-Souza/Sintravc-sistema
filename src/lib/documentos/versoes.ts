import { desc, eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { conteudo, conteudoVersao, pessoaEquipe } from "@/lib/db/schema";
import { ErroConteudo } from "@/lib/conteudos/erros";
import { jaFoiAoAr } from "@/lib/conteudos/publicacao";
import { conteudoArquivado, registrarAtividadeConteudo, travarConteudo } from "@/lib/conteudos/tipo-do-conteudo";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { lerDocumento, retratoDoDocumento, type DocumentoAberto, type RetratoDoDocumento } from "./carregar";
import type { DadosDocumento, TipoDocumento } from "./dados";
import { partesDiferentes } from "./diferencas";
import { TIPOS_DE_DOCUMENTO } from "./publicar";
import { gravarDocumentoPorCima, type DepsDoSalvamentoDocumento, type ResultadoSalvarDocumento } from "./salvar";
import { validarDocumento } from "./validar";

type Deps = { quem: QuemDaEquipe; sessaoEdicao?: string };

export function resumirMudancasDoDocumento(anterior: DadosDocumento | null, atual: DadosDocumento): string {
  if (!anterior) return "Primeira publicação.";
  const lista = partesDiferentes(anterior, atual);
  return lista === "nada" ? "Sem mudanças." : `Mudou: ${lista}.`;
}

export type VersaoDoDocumento = {
  versao: number;
  criadoPorNome: string;
  criadoEm: Date;
  noAr: boolean;
  voltaAoSite: boolean;
  resumo: string;
  dados: DadosDocumento;
};

/** Versões publicadas do documento, da mais nova para a mais antiga (E31, N14). Só o ADM. */
export async function versoesDoDocumento(id: string, deps: { quem: QuemDaEquipe }): Promise<VersaoDoDocumento[]> {
  exigir(deps.quem, "ver_versoes", { tipo: "documento" });
  const [linhas, [atual]] = await Promise.all([
    banco()
      .select({ v: conteudoVersao, nome: pessoaEquipe.nome })
      .from(conteudoVersao)
      .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudoVersao.criadoPor))
      .where(eq(conteudoVersao.conteudoId, id))
      .orderBy(desc(conteudoVersao.versao)),
    banco().select({ estado: conteudo.estado, versao: conteudo.versao }).from(conteudo).where(eq(conteudo.id, id)),
  ]);
  return linhas.map(({ v, nome }, i) => {
    const dados = (v.snapshot as RetratoDoDocumento).dados;
    const anterior = linhas[i + 1];
    return {
      versao: v.versao,
      criadoPorNome: nome,
      criadoEm: v.criadoEm,
      noAr: atual?.estado === "publicado" && atual.versao === v.versao,
      voltaAoSite: atual?.estado === "oculto" && atual.versao === v.versao,
      resumo: resumirMudancasDoDocumento(anterior ? (anterior.v.snapshot as RetratoDoDocumento).dados : null, dados),
      dados,
    };
  });
}

export type ResultadoComDocumento<T extends string> = { tipo: T; documento: DocumentoAberto } | { tipo: "conflito"; servidor: DocumentoAberto };

/**
 * "Restaurar como rascunho" no Histórico (E31, E42): a versão escolhida vira a cópia de trabalho.
 * Não publica nada; para ir ao ar, a pessoa publica e confirma o PDF de novo (RN12).
 */
export async function restaurarVersaoDocumento(
  entrada: { id: string; versao: number; revisaoBase: number },
  deps: Deps,
): Promise<ResultadoComDocumento<"restaurada">> {
  exigir(deps.quem, "restaurar_versao", { tipo: "documento" });
  return banco().transaction(async (tx) => {
    const atual = await travarConteudo(tx, entrada.id, TIPOS_DE_DOCUMENTO);
    const tipo = atual.tipo as TipoDocumento;
    if (atual.revisao !== entrada.revisaoBase) return { tipo: "conflito", servidor: (await lerDocumento(tx, entrada.id))! };
    if (atual.estado === "arquivado") throw conteudoArquivado(tipo);
    const retrato = await retratoDoDocumento(tx, entrada.id, entrada.versao);
    if (!retrato) throw new ErroConteudo("nao_encontrada", "Esta versão não existe. Feche o Histórico e abra de novo.");
    const dados = await validarDocumento(tx, tipo, retrato.dados, entrada.id).catch((erro) => {
      if (erro instanceof ErroConteudo && erro.campo === "pdfMidiaId") {
        throw new ErroConteudo("invalido", "Esta versão usa um PDF que já foi excluído da Mídia. Não dá para restaurá-la.");
      }
      throw erro;
    });
    await gravarDocumentoPorCima(tx, entrada.id, tipo, dados, deps.quem);
    await registrarAtividadeConteudo(tx, { id: atual.id, tipo, titulo: dados.titulo }, "restaurar_versao", deps, { versao: entrada.versao });
    return { tipo: "restaurada", documento: (await lerDocumento(tx, entrada.id))! };
  });
}

/** "Descartar alterações" (E42): a cópia de trabalho volta a ser igual à versão no ar, sem gerar versão. */
export async function descartarAlteracoesDocumento(
  entrada: { id: string; revisaoBase: number },
  deps: Deps,
): Promise<ResultadoComDocumento<"descartada">> {
  exigir(deps.quem, "editar", { tipo: "documento" });
  return banco().transaction(async (tx) => {
    const atual = await travarConteudo(tx, entrada.id, TIPOS_DE_DOCUMENTO);
    const tipo = atual.tipo as TipoDocumento;
    if (atual.revisao !== entrada.revisaoBase) return { tipo: "conflito", servidor: (await lerDocumento(tx, entrada.id))! };
    const noAr = jaFoiAoAr(atual.estado) ? await retratoDoDocumento(tx, entrada.id) : null;
    if (!noAr) throw new ErroConteudo("invalido", "Este documento não está no ar, então não há alterações para descartar.");
    const { revisao } = await gravarDocumentoPorCima(tx, entrada.id, tipo, noAr.dados, deps.quem);
    await tx.update(conteudo).set({ revisaoPublicada: revisao }).where(eq(conteudo.id, entrada.id));
    await registrarAtividadeConteudo(tx, { id: atual.id, tipo, titulo: noAr.dados.titulo }, "descartar_alteracoes", deps, { versao: atual.versao });
    return { tipo: "descartada", documento: (await lerDocumento(tx, entrada.id))! };
  });
}

/** Escolha no modal "Há duas versões do rascunho" (N4, E02), como na notícia. */
export async function resolverConflitoDocumento(
  entrada: { id: string; tipo: TipoDocumento; escolha: "minha" | "servidor"; revisaoServidor: number; dados: DadosDocumento },
  deps: DepsDoSalvamentoDocumento,
): Promise<ResultadoSalvarDocumento> {
  exigir(deps.quem, "editar", { tipo: "documento" });
  const { id, tipo, escolha } = entrada;
  return banco().transaction(async (tx) => {
    const atual = await travarConteudo(tx, id, [tipo]);
    if (atual.revisao !== entrada.revisaoServidor) return { tipo: "conflito", servidor: (await lerDocumento(tx, id))! };
    if (escolha === "servidor") {
      await registrarAtividadeConteudo(tx, { id, tipo, titulo: atual.titulo }, "resolver_conflito", deps, { escolha });
      return { tipo: "salvo", id, revisao: atual.revisao, salvoEm: atual.atualizadoEm, revisaoPublicada: atual.revisaoPublicada };
    }
    const dados = await validarDocumento(tx, tipo, entrada.dados, id);
    const salvo = await gravarDocumentoPorCima(tx, id, tipo, dados, deps.quem);
    await registrarAtividadeConteudo(tx, { id, tipo, titulo: dados.titulo }, "resolver_conflito", deps, { escolha });
    return salvo;
  });
}
