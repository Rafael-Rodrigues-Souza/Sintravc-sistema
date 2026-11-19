"use client";

import { Conteudo500 } from "@/components/site/conteudo-500";

/** Erro numa página do site: a 500 dentro da moldura (cabeçalho e rodapé continuam). N2, E23. */
export default function ErroDoSite({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Conteudo500 tentarDeNovo={reset} />;
}
