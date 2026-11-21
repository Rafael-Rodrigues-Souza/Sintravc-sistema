import Link from "next/link";

import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import type { AbaDocumentos } from "@/lib/documentos-do-site/filtros";
import { cn } from "@/lib/utils";

import { LINKS } from "../navegacao";

/** Na ordem do Figma (73:809): Editais | Acordos coletivos. */
const ABAS: { aba: AbaDocumentos; rotulo: string; href: string }[] = [
  { aba: "editais", ...LINKS.editais },
  { aba: "acordos-coletivos", ...LINKS.acordos },
];

/** Abas da página Documentos (Figma 73:809; RF04). São links: cada aba é uma página. */
export function AbasDocumentos({ atual }: { atual: AbaDocumentos }) {
  return (
    <nav aria-label={DOCUMENTOS_PAGINA.abasRotulo} className="border-b border-borda-padrao bg-fundo-superficie print:hidden">
      <ul className="conteudo-site flex gap-6 overflow-x-auto">
        {ABAS.map((item) => {
          const ativo = item.aba === atual;
          return (
            <li key={item.aba} className="shrink-0">
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
