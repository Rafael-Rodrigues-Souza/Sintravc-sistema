"use client";

import { Conteudo500 } from "@/components/site/conteudo-500";
import { Logo } from "@/components/marca/logo";

/**
 * Erro fora de uma página do site, inclusive quando a própria moldura falha (por exemplo, o banco fora
 * do ar ao ler a ConfigSite): a 500 só com a logo, sem dados da ConfigSite. N2, E23.
 */
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-fundo-pagina">
      <header className="border-b border-borda-padrao bg-fundo-cabecalho">
        <div className="conteudo-site py-3">
          <Logo className="h-[55px]" />
        </div>
      </header>
      <main className="flex-1">
        <Conteudo500 tentarDeNovo={reset} />
      </main>
    </div>
  );
}
