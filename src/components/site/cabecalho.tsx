import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marca/logo";

import { AlternarTemaSite } from "./alternar-tema-site";
import { CabecalhoFixo } from "./cabecalho-fixo";
import { MenuMobile } from "./menu-mobile";
import { NavegacaoPrincipal } from "./navegacao-principal";

/**
 * Cabeçalho do site na Fase 1 (Figma 295:51107 e 54:890; N13; E63): sem “Entrar” (E01), sem busca e
 * sem telefone (E63: a busca fica dentro de Notícias e de Documentos; o telefone no Contato, no
 * rodapé e no menu do celular). No desktop, logo, menu, tema e “Filiar-se”, que faz o papel de
 * contato; abaixo de lg, logo, tema e o botão do menu.
 */
export function Cabecalho({ linkFiliacao }: { linkFiliacao: string }) {
  return (
    <CabecalhoFixo>
      <div className="conteudo-site flex items-center justify-between gap-4 py-2.5 lg:py-4">
        <Logo className="h-[46px] lg:h-[56px]" />
        <NavegacaoPrincipal />
        <div className="flex items-center gap-2 lg:gap-3 print:hidden">
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
    </CabecalhoFixo>
  );
}
