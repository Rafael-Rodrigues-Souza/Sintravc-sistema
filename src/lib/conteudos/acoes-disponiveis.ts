/**
 * O que o menu de ações (⋯) oferece para cada conteúdo, conforme o estado (RN10) e quem pede
 * (pode(), RN54). Pura: a lista e o editor usam a mesma regra, e o servidor confere de novo em
 * cada ação (RNF01).
 */
import { pode, type QuemDaEquipe } from "@/lib/permissoes";

import type { EstadoConteudo } from "./listar";

export type AcaoDoMenu = "ocultar" | "mostrar" | "arquivar" | "restaurar" | "excluir";

export function acoesDisponiveis(
  item: { estado: EstadoConteudo; jaPublicado: boolean; autorId: string },
  quem: QuemDaEquipe,
): AcaoDoMenu[] {
  const recurso = { tipo: "noticia" as const, autorId: item.autorId, jaPublicado: item.jaPublicado };
  const acoes: AcaoDoMenu[] = [];
  if (item.estado === "publicado" && pode(quem, "ocultar", recurso)) acoes.push("ocultar");
  if (item.estado === "oculto" && pode(quem, "publicar", recurso)) acoes.push("mostrar");
  if (item.estado !== "arquivado" && pode(quem, "arquivar", recurso)) acoes.push("arquivar");
  if (item.estado === "arquivado" && pode(quem, "restaurar", recurso)) acoes.push("restaurar");
  if (item.estado === "rascunho" && pode(quem, "excluir", recurso)) acoes.push("excluir");
  return acoes;
}
