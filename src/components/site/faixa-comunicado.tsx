"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

import { COOKIE_COMUNICADOS_FECHADOS, juntarFechados, lerFechados } from "./comunicados-fechados";
import { useDeslize } from "./deslize";
import { JanelaComunicados } from "./janela-comunicados";
import { LINKS } from "./navegacao";

export type ComunicadoNaFaixa = {
  id: string;
  mensagem: string;
  link: { href: string; externo: boolean } | null;
};

const botao =
  "alvo-toque flex shrink-0 items-center justify-center rounded-[8px] text-destaque-marinho-fixo outline-none hover:bg-destaque-marinho-fixo/10 focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo";

/**
 * Faixa de comunicado (RF08, RN14; Figma 153:8927 e 153:8949). Fica logo abaixo do cabeçalho em
 * todas as páginas do site e também serve de prévia no painel.
 *
 * - Com vários no ar, troca sozinha a cada `intervaloSegundos`, na ordem da fila (CA-US01.2, E58).
 *   A troca para com o mouse em cima, com o foco do teclado dentro, com a janela aberta e depois que a
 *   pessoa passa pelas setas ou pelo deslize. Com menos movimento pedido pelo sistema, continua
 *   trocando, só sem a transição. O X cumpre a WCAG 2.2.2 (dá para esconder o que se move).
 * - Deslizar o dedo de lado passa para o próximo ou o anterior, sem atrapalhar a rolagem da página.
 * - A mensagem abre a janela dos comunicados em destaque. “Ver todos” (dois ou mais) leva à página
 *   /comunicados, que também mostra os fechados pelo X.
 * - Todos os textos ficam empilhados no mesmo lugar: a faixa tem a altura do maior e não pula.
 * - O X fecha a faixa e guarda os comunicados fechados num cookie; volta se entrar um novo (E58).
 */
export function FaixaComunicado({
  comunicados,
  intervaloSegundos,
  diasDoCookie = 0,
  modo = "site",
  className,
}: {
  comunicados: ComunicadoNaFaixa[];
  intervaloSegundos: number;
  /** Por quantos dias o X é lembrado (`comunicados.cookie_fechados_dias`). Só no modo "site". */
  diasDoCookie?: number;
  /** "site": com o X e a janela. "previa": painel, sem o X e sem trocar sozinha. "miniatura": só a primeira, sem botões. */
  modo?: "site" | "previa" | "miniatura";
  className?: string;
}) {
  const [atual, setAtual] = React.useState(0);
  const [fechada, setFechada] = React.useState(false);
  const [passouPelaPessoa, setPassouPelaPessoa] = React.useState(false);
  const [emUso, setEmUso] = React.useState(false);
  const [focoDentro, setFocoDentro] = React.useState(false);
  const [anuncio, setAnuncio] = React.useState(false);
  const [janelaAberta, setJanelaAberta] = React.useState(false);
  const secao = React.useRef<HTMLElement>(null);
  const caminho = usePathname();

  const total = comunicados.length;
  const indice = total === 0 ? 0 : Math.min(atual, total - 1);
  const varios = total > 1 && modo !== "miniatura";
  const noSite = modo === "site";
  const trocaSozinha = varios && noSite;
  const parada = passouPelaPessoa || emUso || focoDentro || janelaAberta;
  // Na própria página Comunicados, o “Ver todos” levaria para onde a pessoa já está.
  const comVerTodos = noSite && varios && caminho !== LINKS.comunicados.href;

  function ir(passo: number) {
    setAnuncio(true);
    setPassouPelaPessoa(true);
    setAtual((indice + passo + total) % total);
  }
  const deslize = useDeslize(ir);

  React.useEffect(() => {
    if (!trocaSozinha || parada) return;
    const relogio = window.setInterval(() => setAtual((i) => (i + 1) % total), intervaloSegundos * 1000);
    return () => window.clearInterval(relogio);
  }, [trocaSozinha, parada, total, intervaloSegundos]);

  if (total === 0 || fechada) return null;

  const fechar = () => {
    gravarFechados(comunicados.map((c) => c.id), diasDoCookie);
    setFechada(true);
  };

  const paginacao = varios ? (
    <div className="flex items-center gap-1 pointer-coarse:gap-0">
      <button type="button" onClick={() => ir(-1)} aria-label="Comunicado anterior" className={cn(botao, "size-8 pointer-coarse:size-11")}>
        <IconeFigma src="/site/comunicado-seta-esquerda.svg" tamanho={16} />
      </button>
      <p aria-live={anuncio ? "polite" : "off"} aria-atomic className="texto-pequeno whitespace-nowrap text-destaque-marinho-fixo">
        <span className="sr-only">Comunicado </span>
        {indice + 1} de {total}
      </p>
      <button type="button" onClick={() => ir(1)} aria-label="Próximo comunicado" className={cn(botao, "size-8 pointer-coarse:size-11")}>
        <IconeFigma src="/site/comunicado-seta-direita.svg" tamanho={16} />
      </button>
    </div>
  ) : null;

  const fecharBotao = noSite ? (
    <button type="button" onClick={fechar} aria-label="Fechar comunicado" className={cn(botao, "size-8 pointer-coarse:size-11")}>
      <IconeFigma src="/site/comunicado-fechar.svg" tamanho={18} />
    </button>
  ) : null;

  const visiveis = modo === "miniatura" ? comunicados.slice(0, 1) : comunicados;

  return (
    <>
    <section
      ref={secao}
      aria-label={varios ? "Comunicados do sindicato" : "Comunicado do sindicato"}
      data-testid="faixa-comunicado"
      className={cn(
        "bg-destaque-amarelo text-destaque-marinho-fixo",
        noSite && "print:hidden",
        // O dedo de lado passa os comunicados; na vertical, o navegador rola a página como sempre.
        trocaSozinha && "touch-pan-y touch-pinch-zoom",
        className,
      )}
      {...(trocaSozinha ? deslize : {})}
      onMouseEnter={() => setEmUso(true)}
      onMouseLeave={() => setEmUso(false)}
      // Só o foco do teclado para a faixa: o clique do mouse deixa o foco no botão sem o anel, e a
      // faixa ficaria parada com o mouse já fora dela.
      onFocus={(e) => setFocoDentro(e.target.matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocoDentro(false);
      }}
    >
      {/* Celular (153:8949): rótulo e controles em cima, mensagem embaixo. A partir do lg (153:8927): uma
          linha com rótulo, divisor, mensagem e controles. Os controles existem uma vez só. */}
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 pt-3 pb-3.5 [grid-template-areas:'rotulo_controles'_'mensagem_mensagem']",
          "lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:gap-x-5 lg:py-3 lg:[grid-template-areas:'rotulo_divisor_mensagem_controles']",
          noSite ? "conteudo-site" : "px-4 lg:px-5",
          modo === "miniatura" && "pointer-events-none",
        )}
      >
        <p className="flex items-center gap-2 texto-eyebrow uppercase [grid-area:rotulo]">
          <IconeFigma src="/site/comunicado-megafone.svg" tamanho={18} />
          Comunicado
        </p>
        <span aria-hidden className="hidden h-5 w-px bg-destaque-marinho-fixo opacity-30 [grid-area:divisor] lg:block" />

        {/* Mensagens empilhadas no mesmo lugar: a altura é a do maior texto (sem pulos ao trocar). */}
        <div className="grid min-w-0 [grid-area:mensagem]">
          {visiveis.map((c, i) => {
            const ativo = i === indice;
            return (
              <div
                key={c.id}
                aria-hidden={!ativo}
                inert={!ativo}
                className={cn(
                  "col-start-1 row-start-1 flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:gap-5",
                  noSite && "gap-3",
                  // Esmaece um e só depois mostra o outro (os textos ficam no mesmo lugar e não podem se
                  // cruzar). Com menos movimento pedido pelo sistema, troca sem transição.
                  "transition-[opacity,visibility] duration-150 ease-out motion-reduce:delay-0 motion-reduce:duration-0",
                  ativo ? "delay-150" : "invisible opacity-0",
                  // Com a janela aberta, a faixa está atrás dela e troca na hora: ao fechar logo depois de
                  // passar pela janela, o comunicado novo já está visível e pode receber o foco de volta.
                  janelaAberta && "delay-0 duration-0",
                )}
              >
                {noSite ? (
                  <button
                    type="button"
                    data-abre-janela
                    aria-haspopup="dialog"
                    onClick={() => setJanelaAberta(true)}
                    className="alvo-toque min-w-0 flex-1 cursor-pointer rounded-[6px] text-left texto-titulo-card-pequeno break-words outline-none hover:underline hover:underline-offset-2 focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo"
                  >
                    {c.mensagem}
                    <span className="sr-only"> (ver em destaque)</span>
                  </button>
                ) : (
                  <p className="min-w-0 flex-1 texto-titulo-card-pequeno break-words">{c.mensagem}</p>
                )}
                {c.link || comVerTodos ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1">
                    {c.link ? (
                      <a
                        href={c.link.href}
                        {...(c.link.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="flex shrink-0 items-center gap-1.5 rounded-[6px] texto-botao underline underline-offset-2 outline-none pointer-coarse:min-h-11 focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo"
                      >
                        Saiba mais
                        <span className="sr-only">: {c.mensagem}</span>
                        {c.link.externo ? <span className="sr-only"> (abre em outra aba)</span> : null}
                        <IconeFigma src="/site/comunicado-seta-direita.svg" tamanho={16} />
                      </a>
                    ) : null}
                    {comVerTodos ? (
                      <Link
                        href={LINKS.comunicados.href}
                        className="flex shrink-0 items-center rounded-[6px] texto-botao underline underline-offset-2 outline-none pointer-coarse:min-h-11 focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo"
                      >
                        Ver todos
                        <span className="sr-only"> os comunicados</span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {paginacao || fecharBotao ? (
          <div className="flex items-center gap-2 justify-self-end [grid-area:controles]">
            {paginacao}
            {fecharBotao}
          </div>
        ) : null}
      </div>
    </section>

      {/* Fora da seção: os eventos do portal subiriam até ela (o deslize na janela passaria a faixa também). */}
      {noSite ? (
        <JanelaComunicados
          comunicados={comunicados}
          indice={indice}
          aoIr={(i) => {
            setPassouPelaPessoa(true);
            setAtual(i);
          }}
          aberta={janelaAberta}
          aoFechar={() => setJanelaAberta(false)}
          aoDevolverFoco={() => secao.current?.querySelector<HTMLElement>("[aria-hidden=false] [data-abre-janela]")?.focus()}
        />
      ) : null}
    </>
  );
}

/** Guarda no cookie os comunicados fechados (E58), pelo número de dias do parâmetro. */
function gravarFechados(ids: string[], dias: number) {
  const anteriores = lerFechados(
    document.cookie
      .split("; ")
      .find((parte) => parte.startsWith(`${COOKIE_COMUNICADOS_FECHADOS}=`))
      ?.slice(COOKIE_COMUNICADOS_FECHADOS.length + 1),
  );
  document.cookie = `${COOKIE_COMUNICADOS_FECHADOS}=${juntarFechados(anteriores, ids)}; path=/; max-age=${dias * 24 * 60 * 60}; samesite=lax`;
}
