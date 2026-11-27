"use client";

import Link from "next/link";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { SeloCategoria } from "@/components/selo-categoria";
import { useDeslize, vizinhoNaFila } from "@/components/site/deslize";
import { HOME_PAGINA } from "@/conteudo/site";
import { cn } from "@/lib/utils";

import type { SeloDoSlide, SlideNaTela } from "./slides";

const t = HOME_PAGINA;

const botaoRedondo =
  "alvo-toque flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo";

/** "01 / 05". */
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Carrossel da Home (E62; visual do E63, “variação 2”): a foto de cada slide ocupa a seção marinha de
 * ponta a ponta, e o texto fica por cima, sobre um degradê marinho forte do lado do texto (embaixo no
 * celular, à esquerda no computador), para qualquer foto ter contraste. A lista “Em destaque” saiu
 * (E63). No computador, o contador “01 / 05” fica junto dos controles; no celular, os indicadores.
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
  intervaloSegundos,
  modo = "site",
}: {
  slides: SlideNaTela[];
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
      <div aria-hidden className="ml-2 flex items-center gap-1.5 lg:hidden">
        {slides.map((s, i) => (
          <span key={s.chave} className={cn("h-1.5 rounded-full transition-[width] motion-reduce:transition-none", i === indice ? "w-8 bg-destaque-amarelo" : "w-3 bg-sobre-escuro-inativo")} />
        ))}
      </div>
      {/* O contador visível (“01 / 05”) só no computador; o leitor de tela ouve “Destaque 2 de 5” quando a pessoa troca. */}
      <p aria-hidden className="ml-2 hidden texto-pequeno text-texto-invertido-sec tabular-nums lg:block" data-testid="contador-carrossel">
        {doisDigitos(indice + 1)} / {doisDigitos(total)}
      </p>
    </div>
  ) : null;

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
      className="relative isolate overflow-hidden bg-fundo-marinho"
    >
      {/* O degradê marinho fica entre a foto (atrás) e o texto: sólido do lado do texto e some do outro. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-fundo-marinho from-40% via-fundo-marinho/85 via-60% to-fundo-marinho/5 lg:bg-gradient-to-r lg:from-30% lg:via-fundo-marinho/80 lg:via-50% lg:to-transparent lg:to-80%"
      />
      <div className="conteudo-site flex flex-col gap-6 pt-[200px] pb-8 sm:pt-[260px] lg:min-h-[600px] lg:justify-end lg:py-16">
        {/* Slides empilhados no mesmo lugar: a altura é a do maior e nada pula ao trocar. A foto de
            cada um fica atrás de tudo, na seção inteira (o slide não é posicionado). */}
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
                  // Esmaece um e só depois mostra o outro: os textos ficam no mesmo lugar e não podem se cruzar
                  // (como na faixa de comunicado, E58). Com “reduzir movimento”, troca sem transição.
                  "col-start-1 row-start-1 flex min-w-0 flex-col items-start justify-end gap-4 transition-[opacity,visibility] duration-200 ease-out motion-reduce:delay-0 motion-reduce:duration-0 lg:max-w-[640px] lg:gap-5",
                  ativo ? "opacity-100 delay-200" : "invisible opacity-0",
                )}
              >
                <Slide slide={s} primeiro={i === 0} />
              </div>
            );
          })}
        </div>
        {controles}
        {varios ? (
          <p aria-live={anunciar ? "polite" : "off"} aria-atomic className="sr-only">
            Destaque {indice + 1} de {total}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Slide({ slide: s, primeiro }: { slide: SlideNaTela; primeiro: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- capa da Mídia, do Rádio Chofer ou foto da Chamada; só a primeira carrega logo (LCP) */}
      <img
        src={s.imagem.url}
        alt={s.imagem.alt}
        loading={primeiro ? "eager" : "lazy"}
        fetchPriority={primeiro ? "high" : "auto"}
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      {s.selos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {s.selos.map((selo) => (
            <Selo key={selo.texto} selo={selo} />
          ))}
        </div>
      ) : null}
      <h2 className="font-condensed text-[38px] leading-[1.02] font-bold text-balance [overflow-wrap:anywhere] text-texto-invertido sm:text-[46px] lg:text-[64px]">{s.titulo}</h2>
      {s.resumo ? <p className="line-clamp-3 max-w-[520px] texto-corpo text-texto-invertido-sec lg:texto-corpo-grande">{s.resumo}</p> : null}
      <div className="flex w-full flex-col gap-3 pt-1 sm:w-auto sm:flex-row sm:flex-wrap">
        <Acoes slide={s} />
      </div>
    </>
  );
}

function Acoes({ slide }: { slide: SlideNaTela }) {
  return slide.acoes.map((a) => {
    const classe = cn(
      "alvo-toque inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 texto-botao whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo focus-visible:ring-offset-2 focus-visible:ring-offset-fundo-marinho",
      a.principal
        ? "bg-destaque-amarelo text-destaque-amarelo-texto hover:brightness-95"
        : "border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido hover:bg-sobre-escuro-chip",
    );
    if (a.externo) {
      return (
        <a key={a.rotulo} href={a.href} target="_blank" rel="noopener noreferrer" className={classe}>
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
          {a.rotulo}
          <span className="sr-only"> (abre o WhatsApp)</span>
        </a>
      );
    }
    return (
      <Link key={a.rotulo} href={a.href} className={classe}>
        {a.tocar ? <IconeTocar pequeno /> : null}
        {a.rotulo}
        {a.principal ? <span className="sr-only">: {slide.titulo}</span> : null}
      </Link>
    );
  });
}

function Selo({ selo }: { selo: SeloDoSlide }) {
  // O contorno claro faz o selo marinho aparecer sobre o fundo marinho (E63).
  if (selo.tom === "categoria") return <SeloCategoria nome={selo.texto} cor={selo.cor ?? "azul"} className="ring-1 ring-sobre-escuro-borda" />;
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
