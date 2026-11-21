/**
 * Os filtros da página Documentos vivem na URL (E60): `?busca=&tipo=&ano=&mais=`. O endereço pode
 * ser compartilhado e o Voltar do navegador funciona. Pura: serve ao servidor e ao navegador.
 */
import { SUBTIPOS, type SubtipoDocumento, type TipoDocumento } from "@/lib/documentos/dados";

export type AbaDocumentos = "editais" | "acordos-coletivos";

export const ABA_DO_TIPO: Record<TipoDocumento, AbaDocumentos> = { edital: "editais", acordo: "acordos-coletivos" };
export const TIPO_DA_ABA: Record<AbaDocumentos, TipoDocumento> = { editais: "edital", "acordos-coletivos": "acordo" };

/** Quantos documentos aparecem de cada vez (“Carregar mais publicações”). */
export const DOCUMENTOS_POR_VEZ = 10;
/** Tamanho máximo da busca: o resto é ignorado. */
export const BUSCA_MAXIMA = 100;
/** Teto do “Carregar mais”, para a URL não pedir uma lista sem fim. */
const MAIS_MAXIMO = 50;

/** O subtipo na URL, sem sublinhado: `?tipo=prestacao-de-contas`. */
const SUBTIPO_NA_URL: Record<SubtipoDocumento, string> = {
  convocacao: "convocacao",
  eleicao: "eleicao",
  prestacao_contas: "prestacao-de-contas",
  outros: "outros",
  act: "act",
  cct: "cct",
};

/** O valor de `?tipo=` de um subtipo. */
export function subtipoNaUrl(subtipo: SubtipoDocumento): string {
  return SUBTIPO_NA_URL[subtipo];
}

export type FiltrosDeDocumentos = {
  busca: string;
  subtipo: SubtipoDocumento | null;
  ano: number | null;
  /** Quantas levas de `DOCUMENTOS_POR_VEZ` mostrar (1 = a primeira). */
  mais: number;
};

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export function lerFiltros(aba: AbaDocumentos, params: Record<string, string | string[] | undefined>): FiltrosDeDocumentos {
  const tipo = TIPO_DA_ABA[aba];
  const subtipoNaUrl = primeiro(params.tipo).trim().toLowerCase();
  const subtipo = (SUBTIPOS[tipo] as readonly SubtipoDocumento[]).find((s) => SUBTIPO_NA_URL[s] === subtipoNaUrl) ?? null;
  const ano = Number(primeiro(params.ano));
  const mais = Number(primeiro(params.mais));
  return {
    busca: primeiro(params.busca).trim().slice(0, BUSCA_MAXIMA),
    subtipo,
    ano: Number.isInteger(ano) && ano >= 1900 && ano <= 2999 ? ano : null,
    mais: Number.isInteger(mais) && mais > 1 ? Math.min(mais, MAIS_MAXIMO) : 1,
  };
}

export function temFiltro(f: Pick<FiltrosDeDocumentos, "busca" | "subtipo" | "ano">): boolean {
  return f.busca !== "" || f.subtipo !== null || f.ano !== null;
}

/** O endereço da aba com estes filtros. Os valores padrão ficam fora; mudar um filtro volta para a 1ª leva. */
export function enderecoDaAba(aba: AbaDocumentos, f: Partial<FiltrosDeDocumentos>): string {
  const p = new URLSearchParams();
  if (f.busca) p.set("busca", f.busca);
  if (f.subtipo) p.set("tipo", SUBTIPO_NA_URL[f.subtipo]);
  if (f.ano) p.set("ano", String(f.ano));
  if (f.mais && f.mais > 1) p.set("mais", String(f.mais));
  const q = p.toString();
  return q ? `/documentos/${aba}?${q}` : `/documentos/${aba}`;
}

/** A aba de um segmento da URL (`/documentos/[aba]/…`); nulo para qualquer outro. */
export function abaDoSegmento(segmento: string): AbaDocumentos | null {
  return segmento === "editais" || segmento === "acordos-coletivos" ? segmento : null;
}
