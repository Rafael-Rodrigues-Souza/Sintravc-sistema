import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { ListaComunicados } from "@/components/site/lista-comunicados";
import { LINKS } from "@/components/site/navegacao";
import { Eyebrow, Migalhas } from "@/components/site/partes-da-pagina";
import { Button } from "@/components/ui/button";
import { COMUNICADOS_PAGINA } from "@/conteudo/site";
import { comunicadosNoAr } from "@/lib/comunicados/faixa";
import { noticiasRecentes, type NoticiaRecente } from "@/lib/conteudos/recentes";
import { dataHoraNaBahia, dataNaBahia } from "@/lib/datas";

export const metadata: Metadata = {
  title: "Comunicados",
  description: "Os avisos do SINTRAVC que estão no ar agora: horários, assembleias e outros recados do sindicato.",
};

/** Quantas notícias a coluna “Notícias recentes” mostra. */
const NOTICIAS_NA_COLUNA = 4;

/**
 * Comunicados (E58; sem frame no Figma). Todos os comunicados no ar agora, na ordem da fila,
 * inclusive os que a pessoa fechou pelo X da faixa: o X só esconde a faixa. Cartões compactos com o
 * título, “No ar até…”, o texto e o “Saiba mais”; o cartão abre a janela da faixa. Sem nenhum, o
 * vazio do E23. Ao lado (no computador) ou embaixo (celular e tablet em pé), as notícias recentes.
 */
export default async function PaginaComunicados() {
  const [comunicados, noticias] = await Promise.all([comunicadosNoAr(), noticiasRecentes(NOTICIAS_NA_COLUNA)]);
  const t = COMUNICADOS_PAGINA;

  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-superficie-alt">
        <div className="conteudo-site flex flex-col gap-3 pt-8 pb-8 lg:pt-12 lg:pb-10">
          <Migalhas itens={[{ rotulo: "Início", href: "/" }, { rotulo: LINKS.comunicados.rotulo }]} />
          <Eyebrow className="mt-2">{t.eyebrow}</Eyebrow>
          <h1 id="titulo-pagina" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
            {t.titulo}
          </h1>
          <p className="max-w-[640px] texto-corpo text-texto-secundario">{t.texto}</p>
        </div>
      </section>

      <div className="conteudo-site grid items-start gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 lg:py-12">
        {comunicados.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
              <IconeFigma src="/site/comunicado-megafone.svg" tamanho={28} />
            </span>
            <h2 className="texto-titulo-card text-texto-primario">{t.vazioTitulo}</h2>
            <p className="max-w-[420px] texto-pequeno text-texto-secundario">{t.vazioTexto}</p>
            <Button asChild variant="secundario" className="mt-1">
              <Link href={LINKS.inicio.href}>{t.vazioAcao}</Link>
            </Button>
          </section>
        ) : (
          <ListaComunicados
            comunicados={comunicados.map((c) => ({
              id: c.id,
              titulo: c.titulo,
              texto: c.texto,
              link: c.link,
              ateQuando: { texto: dataHoraNaBahia(c.fim), iso: c.fim.toISOString() },
            }))}
          />
        )}

        {noticias.length > 0 ? <NoticiasRecentes noticias={noticias} /> : null}
      </div>
    </>
  );
}

/** “Notícias recentes” (E58): as últimas publicadas, com a capa pequena quando houver. */
function NoticiasRecentes({ noticias }: { noticias: NoticiaRecente[] }) {
  return (
    <aside aria-labelledby="titulo-noticias-recentes" className="flex flex-col gap-4 lg:sticky lg:top-28">
      <h2 id="titulo-noticias-recentes" className="texto-eyebrow text-texto-terciario">
        {COMUNICADOS_PAGINA.noticiasTitulo}
      </h2>
      <ul className="flex flex-col divide-y divide-borda-padrao border-y border-borda-padrao">
        {noticias.map((n) => (
          <li key={n.id}>
            <Link
              href={n.href}
              className="group flex items-start gap-3 rounded-[8px] py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {n.capa ? (
                // eslint-disable-next-line @next/next/no-img-element -- capa da Mídia, servida pelo armazenamento
                <img src={n.capa.url} alt={n.capa.alt} loading="lazy" className="size-16 shrink-0 rounded-[8px] bg-fundo-superficie-alt object-cover" />
              ) : null}
              <span className="flex min-w-0 flex-col gap-1">
                <span className="texto-titulo-card-pequeno break-words text-texto-primario group-hover:underline group-hover:underline-offset-2">
                  {n.titulo}
                </span>
                <time dateTime={n.publicadoEm.toISOString()} className="texto-pequeno text-texto-secundario">
                  {dataNaBahia(n.publicadoEm)}
                </time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
