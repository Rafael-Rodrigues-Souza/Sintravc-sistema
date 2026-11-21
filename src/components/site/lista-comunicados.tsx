"use client";

import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";

import type { ComunicadoNaFaixa } from "./faixa-comunicado";
import { JanelaComunicados } from "./janela-comunicados";

export type ComunicadoNaPagina = ComunicadoNaFaixa & {
  /** "22/11/2026 às 18h00", já no horário da Bahia, e o instante para o `<time>`. */
  ateQuando: { texto: string; iso: string };
};

/**
 * Os comunicados da página /comunicados (E58), em cartões compactos na ordem da fila: título, “No ar
 * até…” logo abaixo, o texto inteiro e o “Saiba mais”. Tocar ou clicar no cartão abre a mesma janela
 * da faixa, nele, com setas e deslize para os outros.
 *
 * O cartão inteiro é a área do botão do título (o `after:` cobre o cartão); o “Saiba mais” fica por
 * cima, para continuar sendo um link à parte.
 */
export function ListaComunicados({ comunicados }: { comunicados: ComunicadoNaPagina[] }) {
  const [aberta, setAberta] = React.useState(false);
  const [indice, setIndice] = React.useState(0);
  const lista = React.useRef<HTMLOListElement>(null);

  return (
    <>
      <ol ref={lista} aria-label="Comunicados no ar, na ordem da fila" className="flex flex-col gap-3">
        {comunicados.map((c, i) => (
          <li key={c.id}>
            <article className="relative flex flex-col gap-2 rounded-[16px] bg-destaque-amarelo p-4 text-destaque-marinho-fixo transition-[filter] hover:brightness-[0.97] lg:px-5">
              <div className="flex flex-col gap-0.5">
                <h2 className="texto-titulo-card-pequeno break-words lg:texto-titulo-card">
                  <button
                    type="button"
                    data-abre-janela={i}
                    aria-haspopup="dialog"
                    onClick={() => {
                      setIndice(i);
                      setAberta(true);
                    }}
                    className="cursor-pointer text-left outline-none after:absolute after:inset-0 after:rounded-[16px] focus-visible:after:ring-[3px] focus-visible:after:ring-destaque-marinho-fixo"
                  >
                    {c.titulo}
                    <span className="sr-only"> (ver em destaque)</span>
                  </button>
                </h2>
                <p className="texto-pequeno text-destaque-marinho-fixo/80">
                  No ar até <time dateTime={c.ateQuando.iso}>{c.ateQuando.texto}</time>
                </p>
              </div>
              <p className="texto-pequeno break-words whitespace-pre-line">{c.texto}</p>
              {c.link ? (
                <a
                  href={c.link.href}
                  {...(c.link.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="alvo-toque relative z-10 flex items-center gap-1.5 self-start rounded-[6px] texto-botao underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo"
                >
                  Saiba mais
                  <span className="sr-only">: {c.titulo}</span>
                  {c.link.externo ? <span className="sr-only"> (abre em outra aba)</span> : null}
                  <IconeFigma src="/site/comunicado-seta-direita.svg" tamanho={16} />
                </a>
              ) : null}
            </article>
          </li>
        ))}
      </ol>

      <JanelaComunicados
        comunicados={comunicados}
        indice={indice}
        aoIr={setIndice}
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        // O foco volta para o cartão do último comunicado visto na janela.
        aoDevolverFoco={() => lista.current?.querySelector<HTMLElement>(`[data-abre-janela="${indice}"]`)?.focus()}
      />
    </>
  );
}
