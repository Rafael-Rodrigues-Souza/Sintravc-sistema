"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { RADIO_PAGINA } from "@/conteudo/site";
import { cn } from "@/lib/utils";

/**
 * “Carregar mais episódios” (Figma 157:8516): um link para a mesma página com mais uma leva na URL
 * (`?leva=`), que funciona até sem JavaScript. Com JavaScript, a página não rola: o foco vai para o
 * título do primeiro episódio novo, e a região viva diz quantos chegaram.
 */
export function CarregarMaisEpisodios({
  href,
  jaMostrados,
  temMais,
  className,
}: {
  href: string;
  jaMostrados: number;
  /** Sem mais episódios, o link some, mas o componente fica: é ele que leva o foco à última leva. */
  temMais: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [carregando, iniciar] = React.useTransition();
  const pedido = React.useRef<number | null>(null);
  const [aviso, setAviso] = React.useState("");

  React.useEffect(() => {
    if (pedido.current === null || jaMostrados <= pedido.current) return;
    const titulos = document.querySelectorAll<HTMLElement>('[data-testid="cartao-episodio"] h3');
    titulos[pedido.current]?.focus();
    const novos = jaMostrados - pedido.current;
    setAviso(novos === 1 ? "Mais 1 episódio carregado." : `Mais ${novos} episódios carregados.`);
    pedido.current = null;
  }, [jaMostrados]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <p role="status" className="sr-only">
        {aviso}
      </p>
      {temMais ? (
        <Link
          href={href}
          scroll={false}
          aria-disabled={carregando || undefined}
          onClick={(evento) => {
            if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;
            evento.preventDefault();
            pedido.current = jaMostrados;
            iniciar(() => router.push(href, { scroll: false }));
          }}
          className="alvo-toque inline-flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-borda-forte px-6 texto-botao text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring aria-disabled:opacity-60 sm:w-auto"
        >
          {carregando ? "Carregando…" : RADIO_PAGINA.carregarMais}
        </Link>
      ) : null}
    </div>
  );
}
