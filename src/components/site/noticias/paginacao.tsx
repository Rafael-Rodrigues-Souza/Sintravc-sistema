import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { enderecoDaLista, faixaDePaginas, type FiltrosDaUrl } from "@/lib/noticias-do-site/filtros";
import { cn } from "@/lib/utils";

const QUADRADO =
  "flex size-11 items-center justify-center rounded-[12px] texto-botao outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * Paginação numerada (Figma 80:973), no computador e no tablet deitado. No celular e no tablet em
 * pé, o “Carregar mais notícias” faz o papel dela (81:995; E59). Cada número é um link.
 */
export function Paginacao({ filtros, pagina, paginas, className }: { filtros: FiltrosDaUrl; pagina: number; paginas: number; className?: string }) {
  if (paginas <= 1) return null;
  const href = (n: number) => enderecoDaLista({ ...filtros, pagina: n });
  return (
    <nav aria-label="Paginação" className={cn("justify-center pt-3", className)}>
      <ul className="flex items-center gap-2">
        <li>
          {pagina > 1 ? (
            <Link href={href(pagina - 1)} aria-label="Página anterior" className={cn(QUADRADO, "border border-borda-padrao bg-fundo-superficie hover:bg-fundo-superficie-alt")}>
              <IconeFigma src="/site/icone-seta-esquerda.svg" tamanho={18} />
            </Link>
          ) : (
            <span aria-hidden className={cn(QUADRADO, "border border-borda-padrao bg-fundo-superficie opacity-40")}>
              <IconeFigma src="/site/icone-seta-esquerda.svg" tamanho={18} />
            </span>
          )}
        </li>
        {faixaDePaginas(pagina, paginas).map((n, i) =>
          n === "…" ? (
            <li key={`reticencias-${i}`} aria-hidden className={cn(QUADRADO, "text-texto-primario")}>
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={`Página ${n}`}
                aria-current={n === pagina ? "page" : undefined}
                className={cn(
                  QUADRADO,
                  n === pagina
                    ? "bg-destaque-amarelo text-destaque-marinho-fixo"
                    : "border border-borda-padrao bg-fundo-superficie text-texto-primario hover:bg-fundo-superficie-alt",
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        <li>
          {pagina < paginas ? (
            <Link href={href(pagina + 1)} aria-label="Próxima página" className={cn(QUADRADO, "border border-borda-padrao bg-fundo-superficie hover:bg-fundo-superficie-alt")}>
              <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
            </Link>
          ) : (
            <span aria-hidden className={cn(QUADRADO, "border border-borda-padrao bg-fundo-superficie opacity-40")}>
              <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
