import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marca/logo";

import { AlternarTemaSite } from "./alternar-tema-site";
import { MenuMobile } from "./menu-mobile";
import { NavegacaoPrincipal } from "./navegacao-principal";
import { LINKS } from "./navegacao";

const botaoRedondo =
  "alvo-toque flex size-11 shrink-0 items-center justify-center rounded-full border border-borda-padrao bg-fundo-superficie text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * Cabeçalho do site na Fase 1 (Figma 295:51107 e 54:890; N13): sem “Entrar” (E01).
 * No desktop, menu, busca, tema e “Filiar-se”; abaixo de lg, logo, tema e o botão do menu.
 */
export function Cabecalho({ linkFiliacao }: { linkFiliacao: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-borda-padrao bg-fundo-cabecalho print:static">
      <div className="conteudo-site flex items-center justify-between gap-4 py-2.5 lg:py-3.5">
        <Logo className="h-[46px] lg:h-[55px]" />
        <NavegacaoPrincipal />
        <div className="flex items-center gap-2 lg:gap-3 print:hidden">
          {/* A busca de notícias chega com a #15. */}
          <Link href={LINKS.noticias.href} aria-label="Buscar notícias" className={`${botaoRedondo} hidden lg:flex`}>
            <IconeFigma src="/site/icone-busca.svg" tamanho={20} />
          </Link>
          <div className="hidden lg:block">
            <AlternarTemaSite />
          </div>
          <Button asChild className="hidden lg:inline-flex">
            <a href={linkFiliacao} target="_blank" rel="noopener noreferrer">
              <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
              Filiar-se<span className="sr-only"> pelo WhatsApp</span>
            </a>
          </Button>
          <MenuMobile />
        </div>
      </div>
    </header>
  );
}
