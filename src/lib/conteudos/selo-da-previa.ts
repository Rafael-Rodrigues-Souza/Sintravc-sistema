/**
 * O selo no topo da prévia (RF39; E42, E45). Usa as mesmas regras das outras telas: jaFoiAoAr para
 * saber se a notícia tem versão no ar, e as marcas da versão do Histórico (no site agora, volta ao
 * site com "Mostrar no site"). Puro.
 */
import { quandoNaBahia } from "@/lib/datas";

import type { EstadoConteudo } from "./listar";
import { jaFoiAoAr } from "./publicacao";

export type VersaoNaPrevia = { versao: number; noAr: boolean; voltaAoSite: boolean; criadoEm: Date };

export function seloDaPrevia(entrada: { estado: EstadoConteudo; comAlteracoes: boolean; versao?: VersaoNaPrevia }): string {
  const { estado, comAlteracoes, versao } = entrada;
  if (versao) {
    if (versao.noAr) return `Versão ${versao.versao} · no site agora`;
    if (versao.voltaAoSite) return `Versão ${versao.versao} · volta ao site com “Mostrar no site”`;
    return `Versão ${versao.versao} · publicada em ${quandoNaBahia(versao.criadoEm)}`;
  }
  if (!jaFoiAoAr(estado)) return "Prévia · ainda não publicada";
  if (estado === "oculto") return comAlteracoes ? "Prévia · oculta, com alterações não publicadas" : "Prévia · oculta, fora do site";
  return comAlteracoes ? "Prévia · alterações não publicadas" : "Prévia · igual ao site";
}
