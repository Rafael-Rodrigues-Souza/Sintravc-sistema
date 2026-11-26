"use client";

import Link from "next/link";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { SeloCategoria } from "@/components/selo-categoria";
import { useDeslize, vizinhoNaFila } from "@/components/site/deslize";
import { HOME_PAGINA } from "@/conteudo/site";
import { cn } from "@/lib/utils";

import type { ItemDaLista, SeloDoSlide, SlideNaTela } from "./slides";

const t = HOME_PAGINA;

const botaoRedondo =
  "alvo-toque flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo";

/** "01 / 05". */
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Carrossel da Home (Figma 32:647 / 35:750; E62). No computador, o slide à esquerda e a lista “Em
 * destaque” à direita, com o contador e os controles; no celular (35:750), só o slide e os controles.
 *
 * - Troca sozinho a cada `intervaloSegundos`. Para com o mouse em cima, com o foco do teclado dentro,
 *   depois que a pessoa usa as setas ou o deslize, e com o botão Pausar (WCAG 2.2.2).
 * - Com “reduzir movimento” no sistema, não troca sozinho. O servidor e o navegador desenham o mesmo
 *   HTML (lição do E58): o botão tem os dois textos, e o CSS mostra o certo para cada preferência; a
 *   troca automática só começa num efeito, depois de conferir a preferência.
 * - Setas, ← e → com o foco dentro, e deslize do dedo de lado.
 */
export function CarrosselHome({
  slides,
  lista,
  intervaloSegundos,
  modo = "site",
}: {
  slides: SlideNaTela[];
  lista: ItemDaLista[];
  intervaloSegundos: number;
  /** "previa": no painel, sem trocar sozinho. */
  modo?: "site" | "previa";
}) {
  const [atual, setAtual] = React.useState(0);
  /** null: o padrão (troca sozinho, menos com “reduzir movimento”). */
  const [escolha, setEscolha] = React.useState<"pausado" | "tocando" | null>(null);
  const [emUso, setEmUso] = React.useState(false);
  const [focoDentro, setFocoDentro] = React.useState(false);
  const [anunciar, setAnunciar] = React.useState(false);
  const [reduzMovimento, setReduzMovimento] = React.useState<boolean | null>(null);

  const total = slides.length;
  const indice = Math.min(atual, total - 1);
  const varios = total > 1;

  React.useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ler = () => setReduzMovimento(consulta.matches);
    ler();
    consulta.addEventListener("change", ler);
    return () => consulta.removeEventListener("change", ler);
  }, []);

  const tocando = escolha === "tocando" || (escolha === null && reduzMovimento === false);
  const trocaSozinho = varios && modo === "site" && tocando && !emUso && !focoDentro;

  React.useEffect(() => {
    if (!trocaSozinho) return;
    const relogio = window.setInterval(() => setAtual((i) => vizinhoNaFila(i, 1, total)), intervaloSegundos * 1000);
    return () => window.clearInterval(relogio);
  }, [trocaSozinho, total, intervaloSegundos]);

  function ir(passo: -1 | 1) {
    setAnunciar(true);
    setEscolha("pausado");
    setAtual(vizinhoNaFila(indice, passo, total));
  }
  const deslize = useDeslize(ir);

  const alternar = () => {
    setAnunciar(false);
    setEscolha(tocando ? "pausado" : "tocando");
  };

  const controles = varios ? (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ir(-1)} aria-label={t.anterior} className={botaoRedondo}>
        <IconeFigma src="/site/icone-seta-esquerda.svg" tamanho={18} />
      </button>
      <button type="button" onClick={() => ir(1)} aria-label={t.proximo} className={botaoRedondo}>
        <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
      </button>
      {modo === "site" ? (
        <button type="button" onClick={alternar} className={botaoRedondo} data-testid="pausar-carrossel">
          {escolha === null ? (
            <>
              {/* O padrão depende da preferência: o CSS mostra o texto certo, sem mudar o HTML. */}
              <span className="contents motion-reduce:hidden">
                <IconePausar />
                <span className="sr-only">{t.pausar}</span>
              </span>
              <span className="hidden motion-reduce:contents">
                <IconeTocar />
                <span className="sr-only">{t.continuar}</span>
              </span>
            </>
          ) : tocando ? (
            <>
              <IconePausar />
              <span className="sr-only">{t.pausar}</span>
            </>
          ) : (
            <>
              <IconeTocar />
              <span className="sr-only">{t.continuar}</span>
            </>
          )}
        </button>
      ) : null}
      <div aria-hidden className="ml-2 flex items-center gap-1.5">
        {slides.map((s, i) => (
          <span key={s.chave} className={cn("h-1 rounded-full transition-[width] motion-reduce:transition-none", i === indice ? "w-8 bg-destaque-amarelo" : "w-3 bg-sobre-escuro-inativo")} />
        ))}
      </div>
    </div>
  ) : null;

  // O contador visível (“01 / 05”) fica na lista; o leitor de tela ouve “Destaque 2 de 5” quando a pessoa troca.
  const contador = (
    <p aria-hidden className="texto-pequeno text-texto-invertido-sec tabular-nums" data-testid="contador-carrossel">
      {doisDigitos(indice + 1)} / {doisDigitos(total)}
    </p>
  );

  return (
    <section
      aria-roledescription="carrossel"
      aria-label={t.carrosselRotulo}
      data-testid="carrossel-home"
      // Só depois da hidratação: diz qual preferência de movimento o carrossel leu (os testes esperam por ela).
      data-movimento={reduzMovimento === null ? undefined : reduzMovimento ? "reduzido" : "normal"}
      onMouseEnter={() => setEmUso(true)}
      onMouseLeave={() => setEmUso(false)}
      onFocus={(e) => setFocoDentro(e.target.matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocoDentro(false);
      }}
      onKeyDown={(e) => {
        if (!varios || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
        if ((e.target as HTMLElement).closest("input, select, textarea")) return;
        e.preventDefault();
        ir(e.key === "ArrowLeft" ? -1 : 1);
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_380px]"
    >
      <div className="flex min-w-0 flex-col gap-4">
        {/* Slides empilhados no mesmo lugar: a altura é a do maior e nada pula ao trocar. */}
        <div className={cn("grid min-w-0", varios && "touch-pan-y touch-pinch-zoom")} {...(varios ? deslize : {})}>
          {slides.map((s, i) => {
            const ativo = i === indice;
            return (
              <div
                key={s.chave}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} de ${total}`}
                aria-hidden={!ativo}
                inert={!ativo}
                data-testid="slide-home"
                data-ativo={ativo ? "" : undefined}
                className={cn(
                  "col-start-1 row-start-1 flex min-w-0 flex-col gap-4 transition-[opacity,visibility] duration-300 ease-out motion-reduce:duration-0",
                  ativo ? "opacity-100" : "invisible opacity-0",
                )}
              >
                <Slide slide={s} primeiro={i === 0} />
              </div>
            );
          })}
        </div>
        {varios ? <div className="flex items-center justify-between gap-4 lg:hidden">{controles}</div> : null}
        {varios ? (
          <p aria-live={anunciar ? "polite" : "off"} aria-atomic className="sr-only">
            Destaque {indice + 1} de {total}
          </p>
        ) : null}
      </div>

      {/* A lista “Em destaque”: só no computador, como no Figma (o celular, 35:750, mostra só o carrossel). */}
      <div className="hidden min-w-0 flex-col justify-between gap-6 lg:flex">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-sobre-escuro-divisor pb-3">
            <h2 className="texto-eyebrow text-destaque-amarelo">{t.emDestaque}</h2>
            {varios ? contador : null}
          </div>
          {lista.length > 0 ? (
            <ol className="flex flex-col divide-y divide-sobre-escuro-divisor" data-testid="lista-em-destaque">
              {lista.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} className="group flex items-center gap-4 rounded-[12px] py-4 outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo">
                    {n.capa ? (
                      // eslint-disable-next-line @next/next/no-img-element -- capa da Mídia
                      <img src={n.capa.url} alt="" loading="lazy" className="h-[84px] w-[108px] shrink-0 rounded-[12px] object-cover" />
                    ) : (
                      <span aria-hidden className="h-[84px] w-[108px] shrink-0 rounded-[12px] bg-sobre-escuro-chip" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                      {n.categoria ? <SeloCategoria nome={n.categoria.nome} cor={n.categoria.cor} /> : null}
                      <span className="line-clamp-3 texto-titulo-card-pequeno break-words text-texto-invertido group-hover:underline group-hover:underline-offset-2">
                        {n.titulo}
                      </span>
                      <time dateTime={n.dataIso} className="texto-pequeno text-texto-invertido-sec">
                        {n.data}
                      </time>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        {controles}
      </div>
    </section>
  );
}

function Slide({ slide: s, primeiro }: { slide: SlideNaTela; primeiro: boolean }) {
  return (
    <>
      <div className="relative flex min-h-[446px] flex-col justify-end overflow-hidden rounded-[24px] bg-fundo-marinho-profundo lg:min-h-[560px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- capa da Mídia ou do Rádio Chofer; só a primeira carrega logo (LCP) */}
        <img
          src={s.imagem.url}
          alt={s.imagem.alt}
          loading={primeiro ? "eager" : "lazy"}
          fetchPriority={primeiro ? "high" : "auto"}
          className="absolute inset-0 size-full object-cover"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-fundo-marinho-profundo via-fundo-marinho-profundo/75 to-fundo-marinho-profundo/10 lg:bg-gradient-to-r lg:via-fundo-marinho-profundo/70 lg:to-transparent" />
        <div className="relative flex flex-col gap-4 p-6 lg:max-w-[600px] lg:gap-5 lg:p-11">
          {s.selos.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {s.selos.map((selo) => (
                <Selo key={selo.texto} selo={selo} />
              ))}
            </div>
          ) : null}
          <h2 className="texto-display-mobile [overflow-wrap:anywhere] text-texto-invertido uppercase lg:texto-display">{s.titulo}</h2>
          {s.resumo ? <p className="line-clamp-3 texto-corpo text-texto-invertido-sec lg:texto-corpo-grande">{s.resumo}</p> : null}
          <div className="hidden flex-wrap gap-3 pt-1 lg:flex">
            <Acoes slide={s} />
          </div>
        </div>
      </div>
      {/* No celular (35:750), os botões ficam embaixo do cartão, na largura toda. */}
      <div className="flex flex-col gap-3 lg:hidden">
        <Acoes slide={s} />
      </div>
    </>
  );
}

function Acoes({ slide }: { slide: SlideNaTela }) {
  return slide.acoes.map((a) => (
    <Link
      key={a.rotulo}
      href={a.href}
      className={cn(
        "alvo-toque inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 texto-botao whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo focus-visible:ring-offset-2 focus-visible:ring-offset-fundo-marinho",
        a.principal
          ? "bg-destaque-amarelo text-destaque-amarelo-texto hover:brightness-95"
          : "border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido hover:bg-sobre-escuro-chip",
      )}
    >
      {a.tocar ? <IconeTocar pequeno /> : null}
      {a.rotulo}
      {a.principal ? <span className="sr-only">: {slide.titulo}</span> : null}
    </Link>
  ));
}

function Selo({ selo }: { selo: SeloDoSlide }) {
  if (selo.tom === "categoria") return <SeloCategoria nome={selo.texto} cor={selo.cor ?? "azul"} />;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 texto-etiqueta uppercase",
        selo.tom === "amarelo" && "bg-destaque-amarelo text-destaque-amarelo-texto",
        selo.tom === "escuro" && "bg-sobre-escuro-chip text-texto-invertido",
        selo.tom === "ao-vivo" && "bg-sobre-escuro-chip text-texto-invertido",
      )}
    >
      {selo.tom === "ao-vivo" ? <span aria-hidden className="size-2 rounded-full bg-sobre-escuro-ao-vivo motion-safe:animate-pulse" /> : null}
      {selo.texto}
    </span>
  );
}

function IconePausar() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function IconeTocar({ pequeno = false }: { pequeno?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={pequeno ? "size-3.5" : "size-[18px]"} fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}
