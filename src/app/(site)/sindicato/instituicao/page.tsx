import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { AbasSindicato } from "@/components/site/abas-sindicato";
import { FilieSe } from "@/components/site/filie-se";
import { LINKS } from "@/components/site/navegacao";
import { CabecalhoDeSecao, Eyebrow, FotoPendente, Migalhas, TopoComFoto } from "@/components/site/partes-da-pagina";
import { TextoDoSite } from "@/components/site/texto-do-site";
import { Button } from "@/components/ui/button";
import { INSTITUICAO } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao, linkWhatsApp } from "@/lib/config-site/links";

export const metadata: Metadata = {
  title: "Instituição",
  description: "Quem somos, nosso propósito, nossos valores e a história do SINTRAVC.",
};

const ICONES_DOS_VALORES: Record<string, string> = {
  democracia: "/site/icone-valor-democracia.svg",
  autonomia: "/site/icone-valor-autonomia.svg",
  unidade: "/site/icone-valor-unidade.svg",
  respeito: "/site/icone-valor-respeito.svg",
  dignidade: "/site/icone-valor-dignidade.svg",
  responsabilidade: "/site/icone-valor-responsabilidade.svg",
};

const dois = (n: number) => String(n).padStart(2, "0");

/** Sindicato › Instituição (Figma 56:519 / 57:813; RF03, US07). */
export default async function PaginaInstituicao() {
  const config = await lerConfigSite();
  const { marcos } = config.historia;
  const fundacao = marcos.find((m) => m.id === "fundacao") ?? marcos[0]!;
  const { hero, numeros, proposito, valores, naPratica, historia } = INSTITUICAO;

  return (
    <>
      {/* Topo */}
      <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho text-texto-invertido">
        <TopoComFoto
          texto={
            <>
              <Migalhas sobreEscuro itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Sindicato" }, { rotulo: "Instituição" }]} />
              <Eyebrow sobreEscuro className="mt-2 lg:mt-6">{hero.eyebrow}</Eyebrow>
              <h1 id="titulo-pagina" className="texto-display-mobile lg:texto-display">
                {hero.titulo}
              </h1>
              <p className="texto-corpo max-w-[560px] text-texto-invertido-sec lg:texto-corpo-grande">{hero.texto}</p>
            </>
          }
          foto={
            <>
              <FotoPendente className="aspect-[358/250] w-full justify-start rounded-[24px] pt-8 lg:aspect-[4/3]" />
              <p className="absolute right-5 bottom-5 left-5 flex max-w-[280px] flex-col gap-2 rounded-[16px] bg-destaque-amarelo p-4 font-bold text-destaque-amarelo-texto">
                <IconeFigma src="/site/icone-aspas.svg" tamanho={20} />
                {hero.destaqueDaFoto}
              </p>
            </>
          }
          acoes={
            <>
              <Button asChild>
                <a href="#historia">
                  Conheça nossa história
                  <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
                </a>
              </Button>
              <Button asChild variant="sobre-escuro">
                <Link href={LINKS.contato.href}>
                  <IconeFigma src="/site/icone-conversa.svg" tamanho={18} />
                  Fale com o sindicato
                </Link>
              </Button>
            </>
          }
        />
      </section>

      <AbasSindicato atual={LINKS.instituicao.href} />

      {/* Números */}
      <section aria-label="O SINTRAVC em números" className="conteudo-site pt-10 lg:pt-12">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6 lg:grid-cols-4 lg:p-8">
          {[{ valor: fundacao.ano, rotulo: "Ano de fundação" }, ...numeros].map((n) => (
            <div key={n.rotulo} className="flex flex-col-reverse gap-1 lg:border-l lg:border-borda-padrao lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
              <dt className="texto-pequeno text-texto-secundario">{n.rotulo}</dt>
              <dd className="texto-numero-destaque-mobile text-destaque-azul lg:texto-numero-destaque">
                <TextoDoSite texto={n.valor} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Propósito (missão, da ConfigSite) */}
      <section aria-labelledby="proposito" className="conteudo-site grid gap-8 py-14 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center lg:gap-16 lg:py-20">
        <div className="flex flex-col gap-4">
          <Eyebrow>{proposito.eyebrow}</Eyebrow>
          <h2 id="proposito" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
            {proposito.titulo}
          </h2>
          <p className="texto-corpo text-texto-secundario lg:texto-corpo-grande">
            <TextoDoSite texto={config.missao} />
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-[20px] bg-fundo-marinho p-6 text-texto-invertido lg:p-8">
          <IconeFigma src="/site/icone-aspas.svg" tamanho={28} className="text-destaque-amarelo" />
          <p className="texto-titulo-card-grande">{proposito.destaqueTitulo}</p>
          <p className="texto-corpo text-texto-invertido-sec">{proposito.destaqueTexto}</p>
        </div>
      </section>

      {/* Valores */}
      <section aria-labelledby="valores" className="conteudo-site flex flex-col gap-8 pb-14 lg:gap-10 lg:pb-20">
        <CabecalhoDeSecao id="valores" eyebrow={valores.eyebrow} titulo={valores.titulo} texto={valores.texto} />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {valores.itens.map((v, i) => (
            <li key={v.titulo} className="flex flex-col gap-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6">
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-[12px] bg-destaque-azul-suave text-destaque-azul">
                  <IconeFigma src={ICONES_DOS_VALORES[v.icone]!} tamanho={22} />
                </span>
                <span aria-hidden className="font-condensed text-[28px] leading-none font-bold text-borda-forte">
                  {dois(i + 1)}
                </span>
              </div>
              <h3 className="texto-titulo-card mt-2 text-texto-primario">{v.titulo}</h3>
              <p className="texto-pequeno text-texto-secundario">{v.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Na prática */}
      <section aria-labelledby="na-pratica" className="bg-fundo-marinho text-texto-invertido">
        <div className="conteudo-site grid gap-8 py-14 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-center lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-4">
            <Eyebrow sobreEscuro>{naPratica.eyebrow}</Eyebrow>
            <h2 id="na-pratica" className="texto-titulo-secao-mobile lg:texto-titulo-secao">
              {naPratica.titulo}
            </h2>
            <p className="texto-corpo text-texto-invertido-sec">{naPratica.texto}</p>
            <Button asChild className="self-start">
              <a href={linkWhatsApp(config.contato.whatsappRecepcao)} target="_blank" rel="noopener noreferrer">
                <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
                Fale no WhatsApp
              </a>
            </Button>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {naPratica.itens.map((item, i) => (
              <li key={item.titulo} className="flex gap-4 rounded-[20px] border border-sobre-escuro-borda bg-sobre-escuro-superficie p-5 sm:flex-col sm:gap-3 lg:p-6">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destaque-amarelo text-[13px] font-bold text-destaque-amarelo-texto">
                  {dois(i + 1)}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="texto-titulo-card">{item.titulo}</h3>
                  <p className="texto-pequeno text-texto-invertido-sec">{item.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* História: a linha do tempo é o índice do texto (âncoras nos subtítulos). */}
      <section aria-labelledby="historia" className="conteudo-site flex flex-col gap-8 py-14 lg:gap-10 lg:py-20">
        <CabecalhoDeSecao id="historia" eyebrow={historia.eyebrow} titulo={historia.titulo} />
        <nav aria-label="Linha do tempo">
          <ol className="relative grid gap-6 lg:grid-cols-4 lg:gap-8">
            <span aria-hidden className="absolute top-[7px] right-0 left-[7px] hidden h-0.5 bg-borda-forte lg:block" />
            <span aria-hidden className="absolute top-[7px] bottom-[7px] left-[7px] w-0.5 bg-borda-forte lg:hidden" />
            {marcos.map((marco, i) => (
              <li key={marco.id} className="relative">
                <a
                  href={`#${marco.id}`}
                  className="group flex gap-4 rounded-[12px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring lg:flex-col lg:gap-3"
                >
                  <span
                    aria-hidden
                    className={`relative mt-0.5 size-4 shrink-0 rounded-full border-[3px] ${i === marcos.length - 1 ? "border-destaque-amarelo bg-destaque-amarelo" : "border-destaque-azul bg-fundo-pagina"}`}
                  />
                  <span className="flex flex-col gap-1">
                    <span className="font-condensed text-[28px] leading-none font-bold text-destaque-azul">
                      <TextoDoSite texto={marco.ano} />
                    </span>
                    <span className="texto-titulo-card text-texto-primario underline-offset-4 group-hover:underline">
                      <TextoDoSite texto={marco.titulo} />
                    </span>
                    <span className="texto-pequeno text-texto-secundario">
                      <TextoDoSite texto={marco.resumo} />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex flex-col gap-8 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6 lg:p-10">
          {marcos.map((marco) => (
            <article key={marco.id} aria-labelledby={marco.id} className="flex flex-col gap-2">
              <h3 id={marco.id} tabIndex={-1} className="texto-titulo-card-grande scroll-mt-28 text-texto-primario outline-none">
                <TextoDoSite texto={marco.ano} /> · <TextoDoSite texto={marco.titulo} />
              </h3>
              <p className="texto-corpo text-texto-secundario">
                <TextoDoSite texto={marco.texto} />
              </p>
            </article>
          ))}
        </div>
      </section>

      <FilieSe linkFiliacao={linkFiliacao(config)} />
    </>
  );
}
