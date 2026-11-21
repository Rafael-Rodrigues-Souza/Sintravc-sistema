import type { OrdemDaLista } from "./consultas";

/**
 * Os filtros da página Notícias vivem na URL (E59): `?categoria=<nome em slug>&busca=&ordem=&pagina=`.
 * Assim o endereço pode ser compartilhado e o botão Voltar do navegador funciona. Pura: serve ao
 * servidor e ao navegador.
 */
export type FiltrosDaUrl = { categoria: string | null; busca: string; ordem: OrdemDaLista; pagina: number };

/** Tamanho máximo da busca: o resto é ignorado. */
const BUSCA_MAXIMA = 100;

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export function lerFiltros(params: Record<string, string | string[] | undefined>): FiltrosDaUrl {
  const pagina = Number.parseInt(primeiro(params.pagina), 10);
  const categoria = primeiro(params.categoria).trim().toLowerCase();
  return {
    categoria: /^[a-z0-9-]{1,80}$/.test(categoria) ? categoria : null,
    busca: primeiro(params.busca).trim().slice(0, BUSCA_MAXIMA),
    ordem: primeiro(params.ordem) === "antigas" ? "antigas" : "recentes",
    pagina: Number.isInteger(pagina) && pagina > 1 ? pagina : 1,
  };
}

/** Há filtro ou busca: a grade mostra tudo o que combina, inclusive a notícia do Destaque. */
export function temFiltro(f: Pick<FiltrosDaUrl, "categoria" | "busca">): boolean {
  return f.categoria !== null || f.busca !== "";
}

/**
 * O endereço da lista com estes filtros. Mudar categoria, busca ou ordem volta para a página 1;
 * os valores padrão (recentes, página 1) ficam fora do endereço.
 */
export function enderecoDaLista(f: Partial<FiltrosDaUrl>): string {
  const p = new URLSearchParams();
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.busca) p.set("busca", f.busca);
  if (f.ordem === "antigas") p.set("ordem", "antigas");
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  const q = p.toString();
  return q ? `/noticias?${q}` : "/noticias";
}

/** Números da paginação (Figma 80:973): 1 2 3 … 8. Sempre a primeira, a última e as vizinhas da atual. */
export function faixaDePaginas(atual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const perto = new Set([1, total, atual - 1, atual, atual + 1]);
  if (atual <= 3) [2, 3, 4].forEach((n) => perto.add(n));
  if (atual >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => perto.add(n));
  const numeros = [...perto].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const faixa: (number | "…")[] = [];
  numeros.forEach((n, i) => {
    if (i > 0 && n - numeros[i - 1]! > 1) faixa.push("…");
    faixa.push(n);
  });
  return faixa;
}
