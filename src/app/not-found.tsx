import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { MolduraSite } from "@/components/site/moldura-site";
import { LINKS } from "@/components/site/navegacao";
import { PaginaDeErro } from "@/components/site/pagina-de-erro";
import { Button } from "@/components/ui/button";
import { ERRO_404 } from "@/conteudo/site";

export const metadata: Metadata = { title: ERRO_404.titulo };

const ATALHOS = [
  { ...LINKS.editais, icone: "/site/icone-documento.svg" },
  { ...LINKS.acordos, icone: "/site/icone-balanca.svg" },
  { ...LINKS.beneficios, icone: "/site/icone-estrela.svg" },
  { ...LINKS.contato, icone: "/site/icone-telefone.svg" },
];

/** Página 404 do site (Figma 159:8590 / 159:8788; RF09), com a moldura do site. */
export default function NaoEncontrada() {
  return (
    <MolduraSite>
      <PaginaDeErro
        codigo="404"
        titulo={ERRO_404.titulo}
        texto={ERRO_404.texto}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
          <Button asChild variant="secundario">
            <Link href={LINKS.noticias.href}>
              <IconeFigma src="/site/icone-busca.svg" tamanho={18} />
              Buscar notícias
            </Link>
          </Button>
        </div>
        <nav aria-label="Atalhos">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-3 pointer-coarse:vao-y-toque-8">
            {ATALHOS.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="alvo-toque inline-flex min-h-8 items-center gap-1.5 rounded-md font-semibold text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <IconeFigma src={a.icone} tamanho={16} />
                  {a.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </PaginaDeErro>
    </MolduraSite>
  );
}
