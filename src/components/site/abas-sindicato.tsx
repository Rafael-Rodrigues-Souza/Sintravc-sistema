import Link from "next/link";

import { cn } from "@/lib/utils";

import { SINDICATO } from "./navegacao";

/**
 * Abas da página Sindicato (Figma: Instituição | Diretoria | Benefícios; RF03). São links: cada aba é
 * uma página. No celular, a fileira rola para o lado dentro dela, se precisar (E50, item 3).
 */
export function AbasSindicato({ atual }: { atual: string }) {
  return (
    <nav aria-label="Sindicato" className="border-b border-borda-padrao bg-fundo-superficie print:hidden">
      <ul className="conteudo-site flex gap-6 overflow-x-auto">
        {SINDICATO.itens.map((item) => {
          const ativo = item.href === atual;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "texto-navegacao flex min-h-14 items-center border-b-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                  ativo ? "border-destaque-amarelo text-texto-primario" : "border-transparent text-texto-secundario hover:text-texto-primario",
                )}
              >
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
