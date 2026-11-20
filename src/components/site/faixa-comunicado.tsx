"use client";

import { Pause, Play } from "lucide-react";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

import { COOKIE_COMUNICADOS_FECHADOS, juntarFechados, lerFechados } from "./comunicados-fechados";

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
 *   A troca para com o mouse em cima, com o foco do teclado dentro, pelo botão Pausar, quando a pessoa usa as
 *   setas e quando o sistema pede menos movimento (WCAG 2.2.2).
 * - Todos os textos ficam empilhados no mesmo lugar: a faixa tem a altura do maior e não pula.
 * - O X fecha a faixa e guarda os comunicados fechados num cookie; volta se entrar um novo (E58).
 */
export function FaixaComunicado({
  comunicados,
  intervaloSegundos,
  modo = "site",
  className,
}: {
  comunicados: ComunicadoNaFaixa[];
  intervaloSegundos: number;
  /** "site": com o X. "previa": painel, sem o X e sem trocar sozinha. "miniatura": só a primeira, sem botões. */
  modo?: "site" | "previa" | "miniatura";
  className?: string;
}) {
  const [atual, setAtual] = React.useState(0);
  const [fechada, setFechada] = React.useState(false);
  const [pausadaPelaPessoa, setPausadaPelaPessoa] = React.useState(false);
  const [emUso, setEmUso] = React.useState(false);
  const [focoDentro, setFocoDentro] = React.useState(false);
  const [menosMovimento, setMenosMovimento] = React.useState(false);
  const [anuncio, setAnuncio] = React.useState(false);

  const total = comunicados.length;
  const indice = total === 0 ? 0 : Math.min(atual, total - 1);
  const varios = total > 1 && modo !== "miniatura";
  const trocaSozinha = varios && modo === "site";
  const parada = pausadaPelaPessoa || emUso || focoDentro || menosMovimento;

  React.useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mudar = () => setMenosMovimento(consulta.matches);
    mudar();
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);

  React.useEffect(() => {
    if (!trocaSozinha || parada) return;
    const relogio = window.setInterval(() => setAtual((i) => (i + 1) % total), intervaloSegundos * 1000);
    return () => window.clearInterval(relogio);
  }, [trocaSozinha, parada, total, intervaloSegundos]);

  if (total === 0 || fechada) return null;

  const ir = (passo: number) => {
    setAnuncio(true);
    setPausadaPelaPessoa(true);
    setAtual((indice + passo + total) % total);
  };

  const fechar = () => {
    gravarFechados(comunicados.map((c) => c.id));
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
      {trocaSozinha && !menosMovimento ? (
        <button
          type="button"
          onClick={() => setPausadaPelaPessoa((p) => !p)}
          aria-label={pausadaPelaPessoa ? "Voltar a trocar os comunicados" : "Parar de trocar os comunicados"}
          className={cn(botao, "size-8 pointer-coarse:size-11")}
        >
          {pausadaPelaPessoa ? <Play aria-hidden className="size-3.5" /> : <Pause aria-hidden className="size-3.5" />}
        </button>
      ) : null}
    </div>
  ) : null;

  const fecharBotao =
    modo === "site" ? (
      <button type="button" onClick={fechar} aria-label="Fechar comunicado" className={cn(botao, "size-8 pointer-coarse:size-11")}>
        <IconeFigma src="/site/comunicado-fechar.svg" tamanho={18} />
      </button>
    ) : null;

  const visiveis = modo === "miniatura" ? comunicados.slice(0, 1) : comunicados;

  return (
    <section
      aria-label={varios ? "Comunicados do sindicato" : "Comunicado do sindicato"}
      data-testid="faixa-comunicado"
      className={cn("bg-destaque-amarelo text-destaque-marinho-fixo", modo === "site" && "print:hidden", className)}
      onMouseEnter={() => setEmUso(true)}
      onMouseLeave={() => setEmUso(false)}
      // Só o foco do teclado para a faixa: o clique do mouse deixa o foco no botão sem o anel, e a
      // faixa ficaria parada depois de “Voltar a trocar”, com o mouse já fora dela.
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
          modo === "site" ? "conteudo-site" : "px-4 lg:px-5",
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
                  !ativo && "invisible",
                )}
              >
                <p className="min-w-0 flex-1 texto-titulo-card-pequeno break-words">{c.mensagem}</p>
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
  );
}

/** Guarda no cookie os comunicados fechados (E58). Vale por um ano: é uma comodidade do navegador. */
function gravarFechados(ids: string[]) {
  const anteriores = lerFechados(
    document.cookie
      .split("; ")
      .find((parte) => parte.startsWith(`${COOKIE_COMUNICADOS_FECHADOS}=`))
      ?.slice(COOKIE_COMUNICADOS_FECHADOS.length + 1),
  );
  document.cookie = `${COOKIE_COMUNICADOS_FECHADOS}=${juntarFechados(anteriores, ids)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
