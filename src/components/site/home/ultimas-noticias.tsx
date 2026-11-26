import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { SeloCategoria } from "@/components/selo-categoria";
import { LINKS } from "@/components/site/navegacao";
import { CartaoNoticia } from "@/components/site/noticias/cartao-noticia";
import { Eyebrow } from "@/components/site/partes-da-pagina";
import { Button } from "@/components/ui/button";
import { HOME_PAGINA } from "@/conteudo/site";
import { dataCurtaNaBahia } from "@/lib/datas";
import type { NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import { cn } from "@/lib/utils";

import { SeletorDeCategoria } from "./seletor-de-categoria";

const t = HOME_PAGINA;

/** Quantas notícias a seção mostra: a grande e mais quatro (no celular, três). Tamanho de tela, não regra (E62). */
export const NOTICIAS_NA_HOME = 5;

/**
 * Últimas notícias (Figma 33:671 / 35:864; RF01, E62): o seletor de categoria, a mais recente em
 * cartão grande e as seguintes em itens compactos. “Ver todas” leva a Notícias, com a categoria.
 */
export function UltimasNoticias({
  noticias,
  categorias,
  categoriaAtual,
  total,
}: {
  noticias: NoticiaDoSite[];
  categorias: { slug: string; nome: string; total: number }[];
  categoriaAtual: string | null;
  total: number;
}) {
  const [primeira, ...outras] = noticias;
  const verTodas = categoriaAtual ? `${LINKS.noticias.href}?categoria=${encodeURIComponent(categoriaAtual)}` : LINKS.noticias.href;
  return (
    <section id="ultimas-noticias" aria-labelledby="titulo-ultimas" className="conteudo-site flex scroll-mt-24 flex-col gap-6 pt-6 pb-12 lg:gap-8 lg:pt-14 lg:pb-24">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="flex flex-col gap-3">
          <Eyebrow>{t.noticiasEyebrow}</Eyebrow>
          <h2 id="titulo-ultimas" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
            {t.noticiasTitulo}
          </h2>
        </div>
        <Link
          href={verTodas}
          className="alvo-toque hidden items-center gap-2 rounded-[8px] texto-botao text-destaque-azul outline-none hover:underline hover:underline-offset-2 focus-visible:ring-[3px] focus-visible:ring-ring lg:inline-flex"
        >
          {t.verTodas}
          <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
        </Link>
      </div>

      {total > 0 ? <SeletorDeCategoria categorias={categorias} atual={categoriaAtual} total={total} /> : null}

      {primeira ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-6" data-testid="ultimas-noticias">
          <CartaoNoticia noticia={primeira} />
          {outras.length > 0 ? (
            <ul className="flex flex-col divide-y divide-borda-padrao rounded-[24px] border border-borda-padrao bg-fundo-superficie px-4 lg:px-7">
              {outras.map((n, i) => (
                <li key={n.id} className={cn(i === 3 && "hidden lg:block")}>
                  <ItemCompacto noticia={n} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
          <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
            <IconeFigma src="/site/icone-documento.svg" tamanho={28} />
          </span>
          <h3 className="texto-titulo-card text-texto-primario">{categoriaAtual ? t.semNoticiasNaCategoria : t.semNoticiasTitulo}</h3>
          {categoriaAtual ? (
            <Button asChild variant="secundario">
              <Link href="/#ultimas-noticias" scroll={false}>
                {t.verTodasAsCategorias}
              </Link>
            </Button>
          ) : (
            <p className="max-w-[420px] texto-pequeno text-texto-secundario">{t.semNoticiasTexto}</p>
          )}
        </div>
      )}

      {primeira ? (
        <Button asChild variant="secundario" className="w-full lg:hidden">
          <Link href={verTodas}>{t.verTodas}</Link>
        </Button>
      ) : null}
    </section>
  );
}

/** Item compacto (Figma 33:712): miniatura, categoria, manchete e data. A manchete é o link. */
function ItemCompacto({ noticia: n }: { noticia: NoticiaDoSite }) {
  return (
    <article className="group relative flex items-center gap-4 py-4 focus-within:rounded-[12px] focus-within:ring-[3px] focus-within:ring-ring lg:gap-5 lg:py-5">
      {n.capa ? (
        // eslint-disable-next-line @next/next/no-img-element -- capa da Mídia
        <img src={n.capa.url} alt="" loading="lazy" className="h-[72px] w-24 shrink-0 rounded-[12px] object-cover lg:h-[96px] lg:w-[132px]" />
      ) : (
        <span aria-hidden className="h-[72px] w-24 shrink-0 rounded-[12px] bg-fundo-superficie-alt lg:h-[96px] lg:w-[132px]" />
      )}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        {n.categoria ? <SeloCategoria nome={n.categoria.nome} cor={n.categoria.cor} /> : null}
        <h3 className="line-clamp-3 texto-titulo-card-pequeno break-words text-texto-primario">
          <Link href={n.href} className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-2">
            {n.titulo}
          </Link>
        </h3>
        <p className="texto-pequeno text-texto-terciario">
          <time dateTime={n.publicadoEm.toISOString()}>{dataCurtaNaBahia(n.publicadoEm)}</time>
          <span aria-hidden> · </span>
          {n.minutosDeLeitura} min de leitura
        </p>
      </div>
    </article>
  );
}
