/**
 * Filtros da página Rádio Chofer no site (E61), lidos da URL e validados à mão (lista fechada de
 * temas, leva inteira), como os de Documentos (E60).
 */

/** Quantos episódios aparecem de cada vez (“Carregar mais episódios”, Figma 157:8305: 6). */
export const EPISODIOS_POR_LEVA = 6;
/** Tamanho máximo da busca: o resto é ignorado. */
export const BUSCA_MAXIMA = 100;
/** Teto do “Carregar mais”, para a URL não pedir uma lista sem fim. */
const LEVA_MAXIMA = 50;

export type FiltrosDoRadio = {
  busca: string;
  /** O slug do tema (`?tema=saude`), ou null para todos. */
  tema: string | null;
  /** Quantas levas mostrar (1 = a primeira). */
  leva: number;
};

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export function lerFiltrosDoRadio(params: Record<string, string | string[] | undefined>): FiltrosDoRadio {
  const tema = primeiro(params.tema).trim().toLowerCase();
  const leva = Number(primeiro(params.leva));
  return {
    busca: primeiro(params.busca).trim().slice(0, BUSCA_MAXIMA),
    tema: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(tema) ? tema : null,
    leva: Number.isInteger(leva) && leva > 1 ? Math.min(leva, LEVA_MAXIMA) : 1,
  };
}

export function temFiltroNoRadio(f: Pick<FiltrosDoRadio, "busca" | "tema">): boolean {
  return f.busca !== "" || f.tema !== null;
}

/** O endereço da página com estes filtros. Os valores padrão ficam fora. */
export function enderecoDoRadio(f: Partial<FiltrosDoRadio>, ancora = ""): string {
  const p = new URLSearchParams();
  if (f.busca) p.set("busca", f.busca);
  if (f.tema) p.set("tema", f.tema);
  if (f.leva && f.leva > 1) p.set("leva", String(f.leva));
  const q = p.toString();
  return `/radio-chofer${q ? `?${q}` : ""}${ancora}`;
}

/** “42”, “ep 42”, “Ep. 42” e “#42” procuram pelo número do episódio. */
export function numeroDaBusca(busca: string): number | null {
  const m = /^(?:ep\.?\s*|epis[oó]dio\s*|#)?(\d{1,5})$/i.exec(busca.trim());
  return m ? Number(m[1]) : null;
}
