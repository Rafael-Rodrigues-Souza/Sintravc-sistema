/**
 * O que o menu de ações (⋯) oferece para cada conteúdo, conforme o estado (RN10) e quem pede
 * (pode(), RN54). Pura: a lista e o editor usam a mesma regra, e o servidor confere de novo em
 * cada ação (RNF01).
 */
import type { QuemDaEquipe } from "@/lib/permissoes";

import type { EstadoConteudo, TipoConteudo } from "./listar";
import { podeNoConteudo } from "./permissao-do-conteudo";

export type AcaoDoMenu = "ocultar" | "mostrar" | "arquivar" | "restaurar" | "excluir";

export function acoesDisponiveis(
  item: { tipo?: TipoConteudo; estado: EstadoConteudo; jaPublicado: boolean; autorId: string },
  quem: QuemDaEquipe,
): AcaoDoMenu[] {
  // Edital e acordo: a mesma regra, mas só o ADM (RN08).
  const linha = { tipo: item.tipo ?? "noticia", autorId: item.autorId, jaPublicado: item.jaPublicado };
  const pode = (acao: Parameters<typeof podeNoConteudo>[1]) => podeNoConteudo(quem, acao, linha);
  const acoes: AcaoDoMenu[] = [];
  if (item.estado === "publicado" && pode("ocultar")) acoes.push("ocultar");
  if (item.estado === "oculto" && pode("publicar")) acoes.push("mostrar");
  if (item.estado !== "arquivado" && pode("arquivar")) acoes.push("arquivar");
  if (item.estado === "arquivado" && pode("restaurar")) acoes.push("restaurar");
  if (item.estado === "rascunho" && pode("excluir")) acoes.push("excluir");
  return acoes;
}
