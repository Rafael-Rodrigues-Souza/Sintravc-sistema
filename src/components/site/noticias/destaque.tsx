import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { SeloCategoria } from "@/components/selo-categoria";
import { NOTICIAS_PAGINA } from "@/conteudo/site";
import { dataCurtaNaBahia } from "@/lib/datas";
import type { Destaque } from "@/lib/noticias-do-site/consultas";
import { cn } from "@/lib/utils";

/**
 * Bloco DESTAQUE da página Notícias (Figma 80:754; RN58): a notícia fixada até a data ou, sem ela,
 * a mais recente. A capa ocupa o cartão, com o degradê do Figma por baixo do texto; sem capa, o
 * fundo marinho-profundo. A manchete é o link; o botão amarelo é visual (um ponto de parada só).
 */
export function BlocoDestaque({ noticia }: { noticia: Destaque }) {
  const n = noticia;
  return (
    <article
      aria-labelledby="destaque-titulo"
      data-testid="destaque"
      className={cn(
        "group relative isolate flex min-h-[420px] flex-col justify-end gap-3.5 overflow-hidden rounded-[24px] p-6 focus-within:ring-[3px] focus-within:ring-destaque-amarelo lg:min-h-[460px] lg:rounded-[28px] lg:p-10",
        !n.capa && "bg-fundo-marinho-profundo",
      )}
    >
      {n.capa ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- capa da Mídia; é a maior imagem da página (LCP, RNF07) */}
          <img src={n.capa.url} alt={n.capa.alt} fetchPriority="high" className="absolute inset-0 -z-10 size-full object-cover" />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(1_22_51/0)_0%,rgb(1_22_51/0.2)_45%,rgb(1_22_51/0.95)_100%)]"
          />
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destaque-amarelo px-2.5 py-1 texto-etiqueta text-destaque-marinho-fixo uppercase">
          <IconeFigma src="/site/icone-estrela.svg" tamanho={13} />
          {NOTICIAS_PAGINA.destaque}
        </span>
        {n.categoria ? <SeloCategoria nome={n.categoria.nome} cor={n.categoria.cor} /> : null}
      </div>
      <h2 id="destaque-titulo" className="texto-titulo-destaque-mobile break-words text-texto-invertido lg:texto-titulo-secao">
        <Link href={n.href} className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
          {n.titulo}
        </Link>
      </h2>
      {n.resumo ? <p className="line-clamp-3 texto-corpo text-white/80 lg:texto-corpo-grande">{n.resumo}</p> : null}
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:gap-6">
        <span
          aria-hidden
          className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-destaque-amarelo pr-6 pl-5 texto-botao text-destaque-amarelo-texto group-hover:brightness-95"
        >
          <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
          Ler notícia completa
        </span>
        <p className="texto-pequeno text-white/70">
          Por {n.assinatura} · <time dateTime={n.publicadoEm.toISOString()}>{dataCurtaNaBahia(n.publicadoEm)}</time> · {n.minutosDeLeitura} min de
          leitura
        </p>
      </div>
    </article>
  );
}
