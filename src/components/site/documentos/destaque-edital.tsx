import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { FotoPendente } from "@/components/site/partes-da-pagina";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import type { DocumentoNaLista } from "@/lib/documentos-do-site/pagina";
import { cn } from "@/lib/utils";

const chip = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] texto-etiqueta uppercase whitespace-nowrap";

/**
 * “Em destaque” no topo de Editais (Figma 73:765 / 74:1085; CA-US03.3, E60): o edital com prazo em
 * aberto mais perto de vencer, com “Faltam N dias” pela mesma regra do selo Prazo. A foto é o
 * marcador até a D11. No celular, sem o resumo e com o “Baixar PDF” só no ícone.
 */
export function DestaqueEdital({ documento, className }: { documento: DocumentoNaLista; className?: string }) {
  const t = DOCUMENTOS_PAGINA;
  const d = documento.cartao;
  return (
    <article aria-labelledby="destaque-edital" className={cn("flex flex-col overflow-hidden rounded-[24px] bg-fundo-superficie lg:rounded-[28px]", className)}>
      <div className="relative">
        <FotoPendente className="aspect-[358/150] w-full justify-start pt-6 lg:aspect-[520/200]" />
        <span className={cn(chip, "absolute bottom-4 left-4 gap-1.5 bg-destaque-amarelo px-3 py-1.5 text-destaque-marinho-fixo lg:bottom-6 lg:left-6")}>
          <IconeFigma src="/site/icone-estrela.svg" tamanho={14} />
          {t.editais.emDestaque}
        </span>
      </div>
      <div className="flex flex-col gap-3.5 p-5 lg:px-7 lg:pt-6 lg:pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(chip, "bg-destaque-azul-suave text-destaque-azul")}>{d.etiqueta}</span>
          {documento.contagem ? (
            <span className={cn(chip, "bg-fundo-superficie-alt text-texto-secundario")}>
              <IconeFigma src="/site/icone-relogio.svg" tamanho={13} />
              {documento.contagem}
            </span>
          ) : null}
        </div>
        <h2 id="destaque-edital" className="texto-titulo-destaque-mobile text-texto-primario lg:texto-titulo-card-grande">
          <Link href={documento.href} className="alvo-toque rounded-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring">
            {d.titulo}
          </Link>
        </h2>
        {d.resumo ? <p className="hidden texto-corpo text-texto-secundario lg:block">{d.resumo}</p> : null}
        {d.prazo ? (
          <p className="inline-flex items-center gap-1.5 texto-pequeno text-texto-secundario">
            <IconeFigma src="/site/icone-calendario.svg" tamanho={16} />
            <span className="sr-only">Prazo: </span>
            {d.prazo}
          </p>
        ) : null}
        {d.hrefAbrir ? (
          <div className="flex gap-2.5 pt-1.5">
            <a
              href={d.hrefAbrir}
              target="_blank"
              rel="noopener"
              className="alvo-toque inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-destaque-amarelo pr-6 pl-5 texto-botao text-destaque-amarelo-texto outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={18} />
              {t.editais.abrir}
              <span className="sr-only">: {d.titulo} (PDF, abre em nova aba)</span>
            </a>
            {d.hrefBaixar ? (
              <a
                href={d.hrefBaixar}
                aria-label={`Baixar o PDF de “${d.titulo}”`}
                className="alvo-toque inline-flex size-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-borda-forte texto-botao text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring lg:w-auto lg:pr-6 lg:pl-5"
              >
                <IconeFigma src="/site/icone-download.svg" tamanho={18} />
                <span aria-hidden className="hidden lg:inline">
                  {t.baixarPdf}
                </span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
