import Link from "next/link";

import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import type { SubtipoDocumento } from "@/lib/documentos/dados";
import { enderecoDaAba, type AbaDocumentos, type FiltrosDeDocumentos } from "@/lib/documentos-do-site/filtros";
import { cn } from "@/lib/utils";

/**
 * Tipos de documento (Figma 73:841 / 75:1629; RF04): “Todos” e um chip por tipo com documento no
 * ar, com a contagem. São links, como os assuntos de Notícias: o endereço muda e pode ser
 * compartilhado; o escolhido tem `aria-current`. No celular, a fileira rola para o lado.
 */
export function ChipsDeTipo({
  aba,
  filtros,
  total,
  subtipos,
}: {
  aba: AbaDocumentos;
  filtros: FiltrosDeDocumentos;
  total: number;
  subtipos: { subtipo: SubtipoDocumento; total: number }[];
}) {
  const t = DOCUMENTOS_PAGINA;
  const rotulos: Partial<Record<SubtipoDocumento, string>> = aba === "editais" ? t.editais.chips : t.acordos.chips;
  const unidade = (aba === "editais" ? t.editais.unidade : t.acordos.unidade)[1];
  const itens = [{ subtipo: null, rotulo: t.todos, total }, ...subtipos.map((s) => ({ subtipo: s.subtipo, rotulo: rotulos[s.subtipo] ?? s.subtipo, total: s.total }))];
  return (
    <nav aria-label={t.tiposRotulo} className="-mr-4 overflow-x-auto pr-4 [scrollbar-width:none] sm:mr-0 sm:pr-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2 py-1 sm:w-auto sm:flex-wrap">
        {itens.map((item) => {
          const ativo = item.subtipo === filtros.subtipo;
          return (
            <li key={item.subtipo ?? "todos"}>
              <Link
                href={enderecoDaAba(aba, { busca: filtros.busca, ano: filtros.ano, subtipo: item.subtipo })}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center gap-2 rounded-full px-[18px] texto-navegacao whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  ativo
                    ? "bg-destaque-amarelo text-destaque-marinho-fixo"
                    : "border border-borda-padrao bg-fundo-superficie text-texto-primario hover:bg-fundo-superficie-alt",
                )}
              >
                {item.rotulo}
                <span className={cn("texto-etiqueta", ativo ? "opacity-80" : "text-texto-terciario")}>
                  <span className="sr-only">(</span>
                  {item.total}
                  <span className="sr-only"> {unidade})</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
