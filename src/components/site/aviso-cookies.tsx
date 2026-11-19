"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { AVISO_COOKIES } from "@/conteudo/site";

import { LINKS } from "./navegacao";
import { useSite } from "./provedor-site";

/**
 * Aviso de cookies (Figma 158:9425 / 159:9442; RN45, E56). Aparece na primeira visita e fica fixo
 * embaixo até a escolha. “Só essenciais” mantém o mapa e os vídeos travados até o clique.
 * O link “Cookies” do rodapé reabre o aviso; nesse caso o foco vai para ele.
 */
export function AvisoCookies() {
  const { avisoAberto, escolha, escolher, salvando } = useSite();
  const regiao = useRef<HTMLDivElement>(null);
  const reaberto = avisoAberto && escolha !== null;

  useEffect(() => {
    if (reaberto) regiao.current?.focus();
  }, [reaberto]);

  if (!avisoAberto) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(16px,env(safe-area-inset-bottom))] print:hidden">
      <div className="conteudo-site">
        <div
          ref={regiao}
          role="region"
          aria-label="Aviso de cookies"
          tabIndex={-1}
          aria-busy={salvando}
          className="pointer-events-auto flex flex-col gap-4 rounded-[16px] bg-fundo-marinho-profundo px-5 py-5 text-texto-invertido shadow-[0_12px_16px_rgba(10,20,36,0.25)] outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo md:flex-row md:items-center md:gap-8 md:px-6 dark:border dark:border-sobre-escuro-borda"
        >
          <div className="flex flex-1 items-start gap-3">
            <IconeFigma src="/site/icone-escudo-check.svg" tamanho={22} className="text-destaque-amarelo" />
            <p className="texto-pequeno">
              {AVISO_COOKIES.texto}{" "}
              <Link href={LINKS.politica.href} className="rounded-sm text-destaque-amarelo underline outline-none focus-visible:ring-2 focus-visible:ring-destaque-amarelo">
                Política de privacidade
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="sobre-escuro" onClick={() => escolher("essenciais")} aria-pressed={escolha === "essenciais"} disabled={salvando}>
              Só essenciais
            </Button>
            <Button onClick={() => escolher("todos")} aria-pressed={escolha === "todos"} disabled={salvando}>
              Aceitar todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Link “Cookies” do rodapé: reabre o aviso para a pessoa mudar a escolha (E56). */
export function BotaoCookies({ className }: { className?: string }) {
  const { abrirAviso } = useSite();
  return (
    <button type="button" onClick={abrirAviso} className={className}>
      Cookies
    </button>
  );
}
