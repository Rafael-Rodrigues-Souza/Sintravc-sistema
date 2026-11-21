import Link from "next/link";

import { NOTICIAS_PAGINA } from "@/conteudo/site";
import type { CategoriaDoSite } from "@/lib/noticias-do-site/consultas";
import { enderecoDaLista, type FiltrosDaUrl } from "@/lib/noticias-do-site/filtros";
import { cn } from "@/lib/utils";

/**
 * Assuntos (Figma 80:820; CA-US02.1): um chip por categoria com notícia no ar, com a contagem. São
 * links (o endereço muda e pode ser compartilhado); o escolhido tem `aria-current`. No celular, a
 * fileira rola para o lado, sem rolar a página (81:995).
 */
export function ChipsDeCategoria({
  categorias,
  total,
  filtros,
}: {
  categorias: (CategoriaDoSite & { total: number })[];
  total: number;
  filtros: FiltrosDaUrl;
}) {
  const itens = [{ slug: null, nome: NOTICIAS_PAGINA.todas, total }, ...categorias.map((c) => ({ slug: c.slug, nome: c.nome, total: c.total }))];
  return (
    <nav aria-label={NOTICIAS_PAGINA.categoriasRotulo} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2 py-1 sm:w-auto sm:flex-wrap">
        {itens.map((item) => {
          const ativo = item.slug === filtros.categoria;
          return (
            <li key={item.slug ?? "todas"}>
              <Link
                href={enderecoDaLista({ categoria: item.slug, busca: filtros.busca, ordem: filtros.ordem })}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full px-[18px] texto-navegacao whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  ativo
                    ? "bg-destaque-amarelo text-destaque-marinho-fixo"
                    : "border border-borda-padrao bg-fundo-superficie text-texto-primario hover:bg-fundo-superficie-alt",
                )}
              >
                {item.nome}
                <span className={cn("texto-etiqueta", ativo ? "opacity-80" : "text-texto-terciario")}>
                  <span className="sr-only">(</span>
                  {item.total}
                  <span className="sr-only"> notícias)</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
