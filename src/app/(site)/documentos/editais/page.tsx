import type { Metadata } from "next";

import { AbasDocumentos } from "@/components/site/documentos/abas-documentos";
import { AvisosNoCelular, NaoEncontrou, Transparencia } from "@/components/site/documentos/blocos-laterais";
import { BuscaEFiltros } from "@/components/site/documentos/busca-e-filtros";
import { DestaqueEdital } from "@/components/site/documentos/destaque-edital";
import { ListaDeDocumentos, VazioDeDocumentos } from "@/components/site/documentos/lista-de-documentos";
import { FilieSe } from "@/components/site/filie-se";
import { LINKS } from "@/components/site/navegacao";
import { Eyebrow, Migalhas } from "@/components/site/partes-da-pagina";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao } from "@/lib/config-site/links";
import { paginaDaAba } from "@/lib/documentos-do-site/consultas";
import { lerFiltros } from "@/lib/documentos-do-site/filtros";
import { IMAGEM_PADRAO_COMPARTILHAR } from "@/lib/noticias-do-site/compartilhar";

const t = DOCUMENTOS_PAGINA;

export const metadata: Metadata = {
  title: "Editais",
  description: t.editais.texto,
  openGraph: {
    title: "Editais do SINTRAVC",
    description: t.editais.texto,
    images: [{ url: IMAGEM_PADRAO_COMPARTILHAR.caminho, width: IMAGEM_PADRAO_COMPARTILHAR.largura, height: IMAGEM_PADRAO_COMPARTILHAR.altura }],
  },
};

/**
 * Documentos › Editais (Figma 73:629 / 74:1085; US03, RF04, C2, E60). No topo, os contadores e o
 * destaque com “Faltam N dias”. Embaixo, busca, tipo e ano (na URL) e a lista agrupada pelo mês
 * da publicação. Renderizada a cada visita: o selo e a contagem seguem o relógio.
 */
export default async function PaginaEditais({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtros = lerFiltros("editais", await searchParams);
  const [config, pagina] = await Promise.all([lerConfigSite(), paginaDaAba("editais", filtros)]);
  const { lista, contadores } = pagina;
  const [uma, varias] = t.editais.unidade;
  const resultado = `Mostrando ${lista.itens.length} de ${lista.total} ${lista.total === 1 ? uma : varias}`;

  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho">
        <div className="conteudo-site flex flex-col gap-7 pt-6 pb-10 lg:pt-8 lg:pb-[72px]">
          <Migalhas sobreEscuro itens={[{ rotulo: "Início", href: "/" }, { rotulo: t.migalha, href: "/documentos" }, { rotulo: LINKS.editais.rotulo }]} />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16">
            <div className="flex flex-1 flex-col gap-4 lg:gap-5">
              <Eyebrow sobreEscuro>{t.editais.eyebrow}</Eyebrow>
              <h1 id="titulo-pagina" className="texto-display-mobile text-texto-invertido uppercase lg:texto-display">
                {t.editais.titulo}
              </h1>
              <p className="texto-corpo text-texto-invertido-sec lg:texto-corpo-grande">{t.editais.texto}</p>
              {contadores ? (
                <dl className="flex pt-3">
                  <Indicador valor={String(contadores.publicacoesNoAno)} rotulo={`${t.editais.publicacoes}`} complemento={` em ${contadores.ano}`} primeiro />
                  <Indicador valor={String(contadores.prazosEmAberto)} rotulo={t.editais.prazos} rotuloCurto={t.editais.prazosCurto} />
                  {contadores.ultimaAtualizacao ? (
                    <Indicador valor={contadores.ultimaAtualizacao} rotulo={t.editais.atualizacao} rotuloCurto={t.editais.atualizacaoCurto} />
                  ) : null}
                </dl>
              ) : null}
            </div>
            {pagina.destaque ? <DestaqueEdital documento={pagina.destaque} className="w-full lg:w-[520px] lg:shrink-0" /> : null}
          </div>
        </div>
      </section>

      <AbasDocumentos atual="editais" />

      <section aria-labelledby="publicacoes" className="conteudo-site flex flex-col gap-7 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2.5">
            <Eyebrow>{t.listaEyebrow}</Eyebrow>
            <h2 id="publicacoes" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
              {t.editais.listaTitulo}
            </h2>
          </div>
          {pagina.totalNoAr > 0 ? (
            <p role="status" className="texto-pequeno text-texto-secundario">
              {resultado}
            </p>
          ) : null}
        </div>

        {pagina.totalNoAr > 0 ? (
          <BuscaEFiltros aba="editais" filtros={filtros} anos={pagina.anos} total={pagina.totalNoAr} subtipos={pagina.subtipos} />
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-10">
          {lista.itens.length > 0 ? (
            <ListaDeDocumentos aba="editais" filtros={filtros} lista={lista} />
          ) : (
            <VazioDeDocumentos aba="editais" filtrando={pagina.filtrando} />
          )}
          <div className="flex flex-col gap-4">
            <Transparencia />
            {config.redes.canalWhatsapp ? <AvisosNoCelular linkCanal={config.redes.canalWhatsapp} /> : null}
            <NaoEncontrou />
          </div>
        </div>
      </section>

      <FilieSe linkFiliacao={linkFiliacao(config)} />
    </>
  );
}

/** Um contador do topo (Figma 73:756): número amarelo e rótulo; no celular, o rótulo curto (74:1085). */
function Indicador({
  valor,
  rotulo,
  rotuloCurto,
  complemento,
  primeiro = false,
}: {
  valor: string;
  rotulo: string;
  rotuloCurto?: string;
  complemento?: string;
  primeiro?: boolean;
}) {
  return (
    <div className={primeiro ? "flex flex-col-reverse gap-0.5 pr-4 sm:pr-7" : "flex flex-col-reverse gap-0.5 border-l border-sobre-escuro-chip px-4 sm:px-7"}>
      <dt className="texto-pequeno text-texto-invertido-sec">
        {rotuloCurto ? (
          <>
            <span className="sm:hidden">{rotuloCurto}</span>
            <span className="hidden sm:inline">{rotulo}</span>
          </>
        ) : (
          <>
            {rotulo}
            {complemento ? <span className="hidden sm:inline">{complemento}</span> : null}
          </>
        )}
      </dt>
      <dd className="font-condensed text-[28px] leading-[1.12] font-bold text-destaque-amarelo lg:text-[32px]">{valor}</dd>
    </div>
  );
}
