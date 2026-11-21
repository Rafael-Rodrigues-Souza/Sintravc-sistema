import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { FilieSe } from "@/components/site/filie-se";
import { LINKS } from "@/components/site/navegacao";
import { NoticiaAberta } from "@/components/site/noticia-aberta";
import { CanalNoWhatsApp, PrecisaDeOrientacao } from "@/components/site/noticias/blocos-laterais";
import { CartaoNoticia } from "@/components/site/noticias/cartao-noticia";
import { Compartilhar } from "@/components/site/noticias/compartilhar";
import { ContarVisualizacao } from "@/components/site/noticias/contar-visualizacao";
import { MaisLidas } from "@/components/site/noticias/mais-lidas";
import { Eyebrow } from "@/components/site/partes-da-pagina";
import { Button } from "@/components/ui/button";
import { NOTICIA_LATERAL } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao, linkWhatsApp } from "@/lib/config-site/links";
import { noticiaParaLer } from "@/lib/conteudos/para-ler";
import { lerEnvSite } from "@/lib/env";
import { descricaoDaNoticia, IMAGEM_PADRAO_COMPARTILHAR } from "@/lib/noticias-do-site/compartilhar";
import { leiaTambem, maisLidas, noticiaPeloSlug } from "@/lib/noticias-do-site/consultas";
import { enderecoDaLista } from "@/lib/noticias-do-site/filtros";

/** Uma leitura por visita: generateMetadata e a página usam a mesma notícia. */
const carregar = cache(async (slug: string) => (/^[a-z0-9-]{1,120}$/.test(slug) ? noticiaPeloSlug(slug) : null));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const noticia = await carregar((await params).slug);
  if (!noticia) return { title: "Página não encontrada" };
  const { dados } = noticia;
  const descricao = descricaoDaNoticia(dados);
  // Capa: a imagem da prévia (P4). Sem capa, a imagem padrão do SINTRAVC (comentário da #15).
  const imagem = noticia.capa
    ? { url: noticia.capa.url, alt: noticia.capa.alt, ...(noticia.capa.largura && noticia.capa.altura ? { width: noticia.capa.largura, height: noticia.capa.altura } : {}) }
    : { url: IMAGEM_PADRAO_COMPARTILHAR.caminho, width: IMAGEM_PADRAO_COMPARTILHAR.largura, height: IMAGEM_PADRAO_COMPARTILHAR.altura, alt: "SINTRAVC" };
  return {
    title: dados.titulo,
    description: descricao,
    alternates: { canonical: `/noticias/${noticia.slug}` },
    openGraph: {
      type: "article",
      title: dados.titulo,
      description: descricao,
      url: `/noticias/${noticia.slug}`,
      images: [imagem],
      publishedTime: noticia.publicadoEm.toISOString(),
      ...(noticia.atualizadoEm ? { modifiedTime: noticia.atualizadoEm.toISOString() } : {}),
      ...(noticia.categoria ? { section: noticia.categoria.nome } : {}),
    },
    twitter: { card: "summary_large_image", title: dados.titulo, description: descricao, images: [imagem.url] },
  };
}

/**
 * Notícia aberta (Figma 100:15159 / 100:15345; RF02, US02, E59). Só a publicada abre: rascunho,
 * agendada, oculta e arquivada dão 404 (CA-US02.2). Mostra o retrato da versão no ar (E42), com
 * compartilhar, a lateral (Mais lidas e os blocos) e “Mais notícias” (o “Leia também”).
 */
export default async function PaginaNoticia({ params }: { params: Promise<{ slug: string }> }) {
  const noticia = await carregar((await params).slug);
  if (!noticia) notFound();

  const [config, lidas, relacionadas] = await Promise.all([lerConfigSite(), maisLidas(), leiaTambem(noticia.id, noticia.categoria?.id ?? null)]);
  const url = `${lerEnvSite().URL_SITE}/noticias/${noticia.slug}`;
  const paraLer = noticiaParaLer(noticia.dados, {
    categoria: noticia.categoria?.nome ?? null,
    publicadoEm: noticia.publicadoEm,
    atualizadoEm: noticia.atualizadoEm,
    enderecoDe: noticia.enderecoDe,
  });
  const whatsappDaRecepcao = linkWhatsApp(config.contato.whatsappRecepcao);
  const t = NOTICIA_LATERAL;

  return (
    <>
      <ContarVisualizacao id={noticia.id} />
      <NoticiaAberta
        noticia={paraLer}
        extras={{
          migalhas: {
            inicio: LINKS.inicio.href,
            noticias: LINKS.noticias.href,
            categoria: noticia.categoria ? enderecoDaLista({ categoria: noticia.categoria.slug }) : undefined,
          },
          compartilhar: <Compartilhar url={url} titulo={paraLer.titulo} tom="sobre-escuro" />,
          rodape: (
            <section aria-labelledby="gostou-da-noticia" className="flex flex-col gap-4 border-t border-borda-padrao pt-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <h2 id="gostou-da-noticia" className="texto-titulo-card text-texto-primario">
                  {t.gostou}
                </h2>
                <p className="texto-pequeno text-texto-secundario">{t.gostouTexto}</p>
              </div>
              <Compartilhar url={url} titulo={paraLer.titulo} tom="claro" />
            </section>
          ),
          lateral: (
            <>
              <MaisLidas noticias={lidas} id="mais-lidas-lateral" />
              <PrecisaDeOrientacao linkWhatsApp={whatsappDaRecepcao} />
              {config.redes.canalWhatsapp ? <CanalNoWhatsApp linkCanal={config.redes.canalWhatsapp} /> : null}
            </>
          ),
        }}
      />

      {relacionadas.length > 0 ? (
        <section aria-labelledby="mais-noticias" className="bg-fundo-superficie-alt">
          <div className="conteudo-site flex flex-col gap-8 py-14 lg:py-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2.5">
                <Eyebrow>{t.maisNoticiasEyebrow}</Eyebrow>
                <h2 id="mais-noticias" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
                  {t.maisNoticiasTitulo}
                </h2>
              </div>
              <Button asChild variant="secundario" className="w-fit">
                <Link href={LINKS.noticias.href}>
                  {t.verTodas}
                  <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
                </Link>
              </Button>
            </div>
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relacionadas.map((n) => (
                <li key={n.id} className="flex">
                  <CartaoNoticia noticia={n} className="w-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="pt-16 lg:pt-24">
        <FilieSe linkFiliacao={linkFiliacao(config)} />
      </div>
    </>
  );
}
