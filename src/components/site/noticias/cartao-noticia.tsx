import Link from "next/link";
import type { Ref } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { SeloCategoria } from "@/components/selo-categoria";
import { dataCurtaNaBahia } from "@/lib/datas";
import type { NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import { cn } from "@/lib/utils";

/**
 * Cartão de notícia da grade (Figma 79:1481). O cartão inteiro abre a notícia, mas só a manchete é
 * link (um ponto de parada no Tab e um nome claro para o leitor de tela); o “Ler notícia” é visual.
 * Sem capa, o cartão começa direto pelo texto. Serve ao servidor e ao “Carregar mais” (navegador).
 */
export function CartaoNoticia({
  noticia,
  tituloComo: Titulo = "h3",
  refDoLink,
  className,
}: {
  noticia: NoticiaDoSite;
  tituloComo?: "h2" | "h3";
  refDoLink?: Ref<HTMLAnchorElement>;
  className?: string;
}) {
  const n = noticia;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[24px] border border-borda-padrao bg-fundo-superficie transition-shadow focus-within:ring-[3px] focus-within:ring-ring hover:shadow-[0_8px_24px_rgb(2_31_75/0.08)]",
        className,
      )}
    >
      {n.capa ? (
        // eslint-disable-next-line @next/next/no-img-element -- capa da Mídia, servida pelo armazenamento
        <img src={n.capa.url} alt={n.capa.alt} loading="lazy" className="aspect-[16/9] w-full bg-fundo-superficie-alt object-cover sm:aspect-auto sm:h-[216px]" />
      ) : null}
      <div className="flex flex-1 flex-col gap-3 px-6 py-[22px]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {n.categoria ? <SeloCategoria nome={n.categoria.nome} cor={n.categoria.cor} /> : null}
          <time dateTime={n.publicadoEm.toISOString()} className="texto-pequeno text-texto-terciario">
            {dataCurtaNaBahia(n.publicadoEm)}
          </time>
        </div>
        <Titulo className="texto-titulo-card break-words text-texto-primario">
          <Link
            ref={refDoLink}
            href={n.href}
            className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-2"
          >
            {n.titulo}
          </Link>
        </Titulo>
        {n.resumo ? <p className="line-clamp-3 texto-corpo text-texto-secundario">{n.resumo}</p> : null}
        <div className="mt-auto flex flex-col gap-3 pt-1">
          <span aria-hidden className="h-px w-full bg-borda-padrao" />
          <div className="flex items-center gap-2">
            <span className="flex flex-1 items-center gap-1.5 texto-pequeno text-texto-terciario">
              <IconeFigma src="/site/icone-relogio.svg" tamanho={15} />
              {n.minutosDeLeitura} min de leitura
            </span>
            <span aria-hidden className="flex items-center gap-1.5 texto-botao text-destaque-azul">
              Ler notícia
              <IconeFigma src="/site/icone-seta-direita.svg" tamanho={16} />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
