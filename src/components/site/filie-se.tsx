import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";

import { FILIE_SE } from "@/conteudo/site";

import { LINKS } from "./navegacao";

/** Seção Filie-se (Figma 54:907 / 54:918; RN03): “Filiar-se pelo WhatsApp” com a mensagem pronta. */
export function FilieSe({ linkFiliacao }: { linkFiliacao: string }) {
  return (
    <section aria-labelledby="filie-se-titulo" className="conteudo-site pb-16 lg:pb-24 print:hidden">
      <div className="flex flex-col gap-6 rounded-[24px] bg-destaque-amarelo px-6 py-8 text-destaque-amarelo-texto lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:rounded-[32px] lg:px-16 lg:py-14">
        <div className="flex max-w-[620px] flex-col gap-3">
          <p className="texto-eyebrow opacity-70">{FILIE_SE.eyebrow}</p>
          <h2 id="filie-se-titulo" className="texto-titulo-secao-mobile lg:texto-titulo-secao">
            {FILIE_SE.titulo}
          </h2>
          <p className="texto-corpo opacity-85 lg:texto-corpo-grande">
            {FILIE_SE.texto}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Button asChild variant="marinho">
            <a href={linkFiliacao} target="_blank" rel="noopener noreferrer">
              <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
              Filiar-se pelo WhatsApp
            </a>
          </Button>
          <Link
            href={LINKS.beneficios.href}
            className="texto-botao alvo-toque inline-flex items-center justify-center gap-1.5 rounded-md whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo"
          >
            Conhecer os benefícios
            <IconeFigma src="/site/icone-seta-direita.svg" tamanho={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
