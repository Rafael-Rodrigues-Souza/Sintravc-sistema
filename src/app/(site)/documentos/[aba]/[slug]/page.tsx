import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { FilieSe } from "@/components/site/filie-se";
import { LINKS } from "@/components/site/navegacao";
import { Migalhas } from "@/components/site/partes-da-pagina";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao } from "@/lib/config-site/links";
import { dataNaBahia } from "@/lib/datas";
import { documentoPeloSlug } from "@/lib/documentos-do-site/consultas";
import { ABAS, abaDoSegmento, enderecoDaAba } from "@/lib/documentos-do-site/filtros";
import { documentoNaLista } from "@/lib/documentos-do-site/pagina";
import { descricaoParaCompartilhar, IMAGEM_PADRAO_COMPARTILHAR } from "@/lib/noticias-do-site/compartilhar";
import { lerParametro } from "@/lib/parametros";
import { cn } from "@/lib/utils";

type Params = Promise<{ aba: string; slug: string }>;

/** Uma leitura por visita: generateMetadata e a página usam o mesmo documento. Só o que está no ar. */
const carregar = cache(async (segmento: string, slug: string) => {
  const aba = abaDoSegmento(segmento);
  if (!aba) return null;
  const doc = await documentoPeloSlug(ABAS[aba].tipo, slug);
  return doc ? { aba, doc } : null;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { aba, slug } = await params;
  const achado = await carregar(aba, slug);
  if (!achado) return { title: "Página não encontrada" };
  const { dados } = achado.doc;
  const endereco = `/documentos/${achado.aba}/${achado.doc.slug}`;
  const descricao = descricaoParaCompartilhar(dados.resumo || [dados.numero, dados.abrangencia].filter(Boolean).join(" · ") || dados.titulo);
  const imagem = { url: IMAGEM_PADRAO_COMPARTILHAR.caminho, width: IMAGEM_PADRAO_COMPARTILHAR.largura, height: IMAGEM_PADRAO_COMPARTILHAR.altura, alt: "SINTRAVC" };
  return {
    title: dados.titulo,
    description: descricao,
    alternates: { canonical: endereco },
    openGraph: { type: "article", title: dados.titulo, description: descricao, url: endereco, images: [imagem], publishedTime: achado.doc.publicadoEm.toISOString() },
    twitter: { card: "summary_large_image", title: dados.titulo, description: descricao, images: [imagem.url] },
  };
}

const chip = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] texto-etiqueta uppercase whitespace-nowrap";
const TOM = {
  prazo: "bg-destaque-amarelo text-destaque-marinho-fixo",
  vigente: "bg-destaque-azul-suave text-destaque-azul",
  encerrado: "bg-status-neutro-fundo text-texto-secundario",
} as const;

/** "2026-11-19" → "19/11/2026". */
const dataDoCampo = (dia: string) => dia.split("-").reverse().join("/");

/**
 * Documento aberto no site (N18, E60; sem frame no Figma, padrão do E50). Editais e acordos usam a
 * mesma página. Só o que está no ar abre: rascunho, agendado, oculto, arquivado, slug de outra aba
 * ou inexistente dão 404, pela mesma consulta da rota pública do PDF. Mostra o resumo inteiro, os
 * dados do documento e os botões do PDF. Renderizada a cada visita: o selo segue o relógio.
 */
export default async function PaginaDoDocumento({ params }: { params: Params }) {
  const { aba: segmento, slug } = await params;
  const achado = await carregar(segmento, slug);
  if (!achado) notFound();
  const { aba, doc } = achado;
  const [config, novoDias] = await Promise.all([lerConfigSite(), lerParametro("documento.novo_dias")]);
  const item = documentoNaLista(doc, new Date(), novoDias);
  const d = item.cartao;
  const t = DOCUMENTOS_PAGINA;
  const rotuloDaAba = LINKS[ABAS[aba].textos].rotulo;
  const voltar = t.aberto.voltar[ABAS[aba].textos];

  const dadosDoDocumento: { rotulo: string; valor: string }[] = [
    { rotulo: t.aberto.dataDocumento, valor: doc.dados.dataDocumento ? dataDoCampo(doc.dados.dataDocumento) : "" },
    { rotulo: t.aberto.publicadoEm, valor: dataNaBahia(doc.publicadoEm) },
    { rotulo: t.aberto.prazo, valor: d.prazo ?? "" },
    { rotulo: t.aberto.vigencia, valor: d.vigencia ?? "" },
    { rotulo: t.aberto.abrangencia, valor: doc.dados.abrangencia },
    { rotulo: t.aberto.partes, valor: doc.dados.partesSignatarias },
    { rotulo: t.aberto.arquivo, valor: d.arquivo ?? "" },
  ].filter((linha) => linha.valor.trim() !== "");

  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho">
        <div className="conteudo-site flex flex-col gap-6 pt-6 pb-10 lg:gap-7 lg:pt-8 lg:pb-14">
          <Migalhas
            sobreEscuro
            itens={[{ rotulo: "Início", href: "/" }, { rotulo: t.migalha, href: "/documentos" }, { rotulo: rotuloDaAba, href: enderecoDaAba(aba, {}) }, { rotulo: d.titulo }]}
          />
          <div className="flex max-w-[860px] flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(chip, "bg-sobre-escuro-chip text-texto-invertido")}>{d.etiqueta}</span>
              {d.selo ? (
                <span className={cn(chip, TOM[d.selo.tom])}>
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  {d.selo.rotulo}
                </span>
              ) : null}
              {item.contagem ? (
                <span className={cn(chip, "bg-fundo-superficie text-texto-primario")}>
                  <IconeFigma src="/site/icone-relogio.svg" tamanho={13} />
                  {item.contagem}
                </span>
              ) : null}
              {item.novo ? <span className={cn(chip, "bg-destaque-amarelo text-destaque-marinho-fixo")}>Novo</span> : null}
            </div>
            <h1 id="titulo-pagina" className="texto-titulo-secao-mobile text-texto-invertido lg:texto-titulo-secao">
              {d.titulo}
            </h1>
            {d.numero ? <p className="texto-corpo-grande text-texto-invertido-sec">{d.numero}</p> : null}
          </div>
        </div>
      </section>

      {/* O PDF vem antes no HTML: no celular, os botões ficam logo abaixo do topo (e o Tab segue a tela); do lg, à direita. */}
      <div className="conteudo-site grid gap-8 pt-10 pb-16 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-10 lg:pt-14 lg:pb-24">
        {d.hrefAbrir ? (
          <aside aria-labelledby="pdf-do-documento" className="flex flex-col items-start gap-3.5 self-start rounded-[24px] bg-fundo-marinho p-7 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
            <span aria-hidden className="flex size-12 items-center justify-center rounded-[14px] bg-destaque-amarelo text-destaque-marinho-fixo">
              <IconeFigma src="/site/icone-documento.svg" tamanho={24} />
            </span>
            <h2 id="pdf-do-documento" className="texto-titulo-card text-texto-invertido">
              {t.aberto.pdfTitulo}
            </h2>
            <p className="texto-corpo text-texto-invertido-sec">{t.aberto.pdfTexto}</p>
            <div className="flex w-full flex-col gap-2.5 pt-1">
              <a
                href={d.hrefAbrir}
                target="_blank"
                rel="noopener"
                className="alvo-toque inline-flex h-12 items-center justify-center gap-2 rounded-full bg-destaque-amarelo pr-6 pl-5 texto-botao text-destaque-amarelo-texto outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={18} />
                {t.abrirPdf}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
              {d.hrefBaixar ? (
                <a
                  href={d.hrefBaixar}
                  className="alvo-toque inline-flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie pr-6 pl-5 texto-botao text-texto-invertido outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <IconeFigma src="/site/icone-download.svg" tamanho={18} />
                  {t.baixarPdf}
                  {d.arquivo ? <span className="font-medium opacity-80">· {d.arquivo.replace(/^PDF · /, "")}</span> : null}
                </a>
              ) : null}
            </div>
          </aside>
        ) : null}
        <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
          {d.resumo ? (
            <section aria-labelledby="resumo" className="flex flex-col gap-3">
              <h2 id="resumo" className="texto-titulo-card text-texto-primario">
                {t.aberto.resumo}
              </h2>
              <p className="texto-corpo-grande whitespace-pre-line text-texto-secundario">{d.resumo}</p>
            </section>
          ) : null}
          <section aria-labelledby="dados-do-documento" className="flex flex-col gap-3">
            <h2 id="dados-do-documento" className="sr-only">
              Dados do documento
            </h2>
            <dl className="divide-y divide-borda-padrao rounded-[20px] border border-borda-padrao bg-fundo-superficie">
              {dadosDoDocumento.map((linha) => (
                <div key={linha.rotulo} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6 sm:px-6">
                  <dt className="texto-pequeno text-texto-secundario sm:w-48 sm:shrink-0">{linha.rotulo}</dt>
                  <dd className="texto-corpo text-texto-primario">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </section>
          <Link
            href={enderecoDaAba(aba, {})}
            className="alvo-toque inline-flex items-center gap-1.5 self-start rounded-sm texto-botao text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <IconeFigma src="/site/icone-seta-direita.svg" tamanho={16} className="rotate-180" />
            {voltar}
          </Link>
        </div>

      </div>

      <FilieSe linkFiliacao={linkFiliacao(config)} />
    </>
  );
}
