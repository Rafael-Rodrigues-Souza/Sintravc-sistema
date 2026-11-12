/**
 * Permissão por tipo de conteúdo (spec §4, RN08, E46): edital e acordo são o recurso "documento",
 * só do ADM. Puro (sem banco): a tela também usa, e o servidor confere de novo em cada ação (RNF01).
 */
import { pode, SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";

/** Ações que notícia e documento têm em comum (spec §4). */
export type AcaoDoConteudo =
  | "ver"
  | "editar"
  | "publicar"
  | "agendar"
  | "ocultar"
  | "arquivar"
  | "restaurar"
  | "excluir"
  | "ver_versoes"
  | "restaurar_versao";

type DadosDaPermissao = { tipo: "noticia" | "edital" | "acordo"; autorId: string; jaPublicado: boolean };

/** pode() com o recurso de cada tipo: edital e acordo são "documento", só do ADM (RN08). */
export function podeNoConteudo(quem: QuemDaEquipe, acao: AcaoDoConteudo, linha: DadosDaPermissao): boolean {
  return linha.tipo === "noticia"
    ? pode(quem, acao, { tipo: "noticia", autorId: linha.autorId, jaPublicado: linha.jaPublicado })
    : pode(quem, acao, { tipo: "documento", jaPublicado: linha.jaPublicado });
}

export function exigirNoConteudo(quem: QuemDaEquipe, acao: AcaoDoConteudo, linha: DadosDaPermissao): void {
  if (!podeNoConteudo(quem, acao, linha)) throw new SemPermissao(acao, linha.tipo === "noticia" ? "noticia" : "documento");
}

/** Nega se a pessoa não pode fazer a ação em nenhum tipo (antes de saber quais itens vêm). */
export function exigirEmAlgumTipo(quem: QuemDaEquipe, acao: Exclude<AcaoDoConteudo, "excluir">): void {
  if (!pode(quem, acao, { tipo: "noticia" }) && !pode(quem, acao, { tipo: "documento" })) throw new SemPermissao(acao, "noticia");
}

