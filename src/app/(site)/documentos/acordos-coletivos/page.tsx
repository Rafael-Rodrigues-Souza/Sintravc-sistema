import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { AbasDocumentos } from "@/components/site/documentos/abas-documentos";
import { ActECct } from "@/components/site/documentos/act-e-cct";
import { AvisoImportante, ComoLer, DuvidasSobreAcordo } from "@/components/site/documentos/blocos-laterais";
import { BuscaEFiltros } from "@/components/site/documentos/busca-e-filtros";
import { ListaDeDocumentos, VazioDeDocumentos } from "@/components/site/documentos/lista-de-documentos";
import { FilieSe } from "@/components/site/filie-se";
import { LINKS } from "@/components/site/navegacao";
import { Eyebrow, TopoComFoto } from "@/components/site/partes-da-pagina";
import { Button } from "@/components/ui/button";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao, linkWhatsApp } from "@/lib/config-site/links";
import { paginaDaAba } from "@/lib/documentos-do-site/consultas";
import { lerFiltros } from "@/lib/documentos-do-site/filtros";
import { IMAGEM_PADRAO_COMPARTILHAR } from "@/lib/noticias-do-site/compartilhar";

const t = DOCUMENTOS_PAGINA;

export const metadata: Metadata = {
  title: "Acordos coletivos",
  description: t.acordos.texto,
  openGraph: {
    title: "Acordos coletivos do SINTRAVC",
    description: t.acordos.texto,
    images: [{ url: IMAGEM_PADRAO_COMPARTILHAR.caminho, width: IMAGEM_PADRAO_COMPARTILHAR.largura, height: IMAGEM_PADRAO_COMPARTILHAR.altura }],
  },
};

/**
 * Documentos › Acordos coletivos (Figma 75:1438 / 76:1801; US03, RF04, C2, E60). No topo, o acordo
 * vigente com o início mais recente (sem vigente, o quadro e o botão somem). Depois, ACT e CCT, a
 * busca com tipo e ano (do início da vigência) e a lista com o quadro do ano. Renderizada a cada
 * visita: o selo de vigência segue o relógio.
 */
export default async function PaginaAcordosColetivos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtros = lerFiltros("acordos-coletivos", await searchParams);
  const [config, pagina] = await Promise.all([lerConfigSite(), paginaDaAba("acordos-coletivos", filtros)]);
  const { lista, vigente } = pagina;
  const [uma, varias] = t.acordos.unidade;
  const resultado = `Mostrando ${lista.itens.length} de ${lista.total} ${lista.total === 1 ? uma : varias}`;

  return (
    <>
      <TopoComFoto
        migalhas={[{ rotulo: "Início", href: "/" }, { rotulo: t.migalha, href: "/documentos" }, { rotulo: LINKS.acordos.rotulo }]}
        eyebrow={t.acordos.eyebrow}
        titulo={<span className="uppercase">{t.acordos.titulo}</span>}
        texto={t.acordos.texto}
        destaqueDaFoto={
          vigente ? (
            <p className="flex items-center gap-3.5">
              <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-destaque-marinho-fixo text-destaque-amarelo">
                <IconeFigma src="/site/icone-balanca.svg" tamanho={24} />
              </span>
              <span className="flex flex-col gap-0.5 text-destaque-marinho-fixo">
                <span className="texto-titulo-card">
                  {vigente.sigla} {vigente.ano} {t.acordos.emVigor}
                </span>
                {vigente.validoAte ? (
                  <span className="texto-pequeno">
                    {t.acordos.validoAte} {vigente.validoAte}
                  </span>
                ) : null}
              </span>
            </p>
          ) : undefined
        }
        acoes={
          <>
            {vigente ? (
              <Button asChild>
                <Link href={vigente.href}>
                  <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={18} />
                  {t.acordos.verVigente}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="sobre-escuro" className="hidden sm:inline-flex">
              <a href="#entenda-act-e-cct">
                <IconeFigma src="/site/icone-seta-baixo.svg" tamanho={18} />
                {t.acordos.entenda}
              </a>
            </Button>
          </>
        }
      />

      <AbasDocumentos atual="acordos-coletivos" />

      <ActECct />

      <section aria-labelledby="publicacoes" className="conteudo-site flex flex-col gap-7 pt-12 pb-16 lg:pt-[72px] lg:pb-24">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2.5">
            <Eyebrow>{t.listaEyebrow}</Eyebrow>
            <h2 id="publicacoes" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
              {t.acordos.listaTitulo}
            </h2>
          </div>
          {pagina.totalNoAr > 0 ? (
            <p role="status" className="texto-pequeno text-texto-secundario">
              {resultado}
            </p>
          ) : null}
        </div>

        {pagina.totalNoAr > 0 ? (
          <BuscaEFiltros aba="acordos-coletivos" filtros={filtros} anos={pagina.anos} total={pagina.totalNoAr} subtipos={pagina.subtipos} />
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_368px]">
          <div className="flex flex-col gap-4">
            {lista.itens.length > 0 ? (
              <ListaDeDocumentos aba="acordos-coletivos" filtros={filtros} lista={lista} />
            ) : (
              <VazioDeDocumentos aba="acordos-coletivos" filtrando={pagina.filtrando} />
            )}
            <AvisoImportante />
          </div>
          <div className="flex flex-col gap-4">
            {/* “Como ler” só do lg em diante, como no Figma: no celular a lista vem logo depois de ACT e CCT. */}
            <div className="hidden lg:block">
              <ComoLer />
            </div>
            <DuvidasSobreAcordo linkWhatsApp={linkWhatsApp(config.contato.whatsappRecepcao)} />
          </div>
        </div>
      </section>

      <FilieSe linkFiliacao={linkFiliacao(config)} />
    </>
  );
}
