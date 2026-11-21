import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";
import type { DocumentoNoCartao } from "@/lib/documentos/cartao";
import { cn } from "@/lib/utils";

export type { DocumentoNoCartao };

/** Selo de vigência (C2): “Vigente” azul e “Encerrado” neutro, com o ponto (Figma 72:1470). O “Prazo” aparece na linha “Prazo:”. */
const TOM = {
  vigente: "bg-destaque-azul-suave text-destaque-azul",
  encerrado: "bg-status-neutro-fundo text-status-neutro-texto",
} as const;

const chip = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] texto-etiqueta uppercase whitespace-nowrap";
const botaoContorno =
  "alvo-toque inline-flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-borda-forte pr-6 pl-5 texto-botao whitespace-nowrap text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * Cartão do documento oficial na página Documentos (Figma: edital 72:1367, acordo 72:1464; celular
 * 74:1085 e 76:1801). Serve à prévia do editor (#12) e ao site (#16, E60). Com `ano`, é o cartão de
 * acordo, com o quadro do ano no lugar do ícone. Com `href`, o título leva ao documento aberto
 * (N18). “Abrir documento” abre o PDF no leitor do navegador, numa aba nova; o ícone baixa.
 *
 * No celular, o ícone (ou o ano) fica ao lado das etiquetas e os botões descem para a última linha,
 * com “Abrir documento” na largura toda; do `sm` em diante, tudo numa linha, como no desktop.
 */
export function CartaoDocumento({
  documento,
  href,
  novo = false,
  ano,
  rotuloAbrir = DOCUMENTOS_PAGINA.abrirDocumento,
  className,
}: {
  documento: DocumentoNoCartao;
  href?: string;
  novo?: boolean;
  ano?: number;
  rotuloAbrir?: string;
  className?: string;
}) {
  const d = documento;
  const seloComPonto = d.selo && d.selo.tom !== "prazo" ? { rotulo: d.selo.rotulo, tom: d.selo.tom } : null;
  return (
    <article
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5",
        "[grid-template-areas:'marca_etiquetas'_'titulo_titulo'_'meta_meta'_'acoes_acoes']",
        "sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:gap-y-2 sm:p-6 sm:[grid-template-areas:'marca_etiquetas_acoes'_'marca_titulo_acoes'_'marca_meta_acoes']",
        className,
      )}
    >
      {ano ? (
        <span className="flex size-16 flex-col items-center justify-center rounded-[14px] bg-destaque-marinho-fixo [grid-area:marca] sm:size-24 sm:rounded-[18px]">
          <span className="texto-etiqueta text-white/60 uppercase">Ano</span>
          <span className="font-condensed text-[24px] leading-[1.12] font-bold text-destaque-amarelo sm:text-[32px]">{ano}</span>
        </span>
      ) : (
        <span aria-hidden className="flex size-12 items-center justify-center rounded-[14px] bg-destaque-azul-suave text-destaque-azul [grid-area:marca] sm:size-14 sm:rounded-[16px]">
          <IconeFigma src="/site/icone-documento.svg" tamanho={26} />
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1.5 self-end [grid-area:etiquetas] sm:self-auto">
        {ano ? (
          <span className="texto-eyebrow text-texto-secundario">{d.etiqueta}</span>
        ) : (
          <span className={cn(chip, "bg-destaque-azul-suave text-destaque-azul")}>{d.etiqueta}</span>
        )}
        {seloComPonto ? (
          <span className={cn(chip, "py-1", TOM[seloComPonto.tom])}>
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {seloComPonto.rotulo}
          </span>
        ) : null}
        {novo ? <span className={cn(chip, "bg-destaque-amarelo text-destaque-marinho-fixo")}>Novo</span> : null}
      </div>

      <h3 className="texto-titulo-card text-texto-primario [grid-area:titulo]">
        {href ? (
          <Link href={href} className="rounded-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring">
            {d.titulo}
          </Link>
        ) : (
          d.titulo
        )}
      </h3>

      <ul className="flex flex-wrap gap-x-[18px] gap-y-1.5 texto-pequeno text-texto-secundario [grid-area:meta]">
        {d.numero ? <li className="w-full">{d.numero}</li> : null}
        {d.publicadoEm ? (
          <li className="inline-flex items-center gap-1.5">
            <IconeFigma src="/site/icone-calendario.svg" tamanho={16} />
            Publicado em {d.publicadoEm}
          </li>
        ) : null}
        {d.prazo ? (
          <li className="inline-flex items-center gap-1.5">
            <IconeFigma src="/site/icone-relogio.svg" tamanho={16} />
            Prazo: {d.prazo}
          </li>
        ) : null}
        {d.vigencia ? (
          <li className="inline-flex items-center gap-1.5">
            <IconeFigma src="/site/icone-calendario.svg" tamanho={16} />
            Vigência: {d.vigencia}
          </li>
        ) : null}
        {d.abrangencia ? (
          <li className="inline-flex items-center gap-1.5">
            <IconeFigma src="/site/icone-local.svg" tamanho={16} />
            {d.abrangencia}
          </li>
        ) : null}
        {d.arquivo ? (
          <li className="inline-flex items-center gap-1.5">
            <IconeFigma src="/site/icone-documento.svg" tamanho={16} />
            {d.arquivo}
          </li>
        ) : null}
      </ul>

      {d.hrefAbrir ? (
        <div className="flex items-center gap-2 [grid-area:acoes]">
          <a href={d.hrefAbrir} target="_blank" rel="noopener" className={cn(botaoContorno, "flex-1 sm:flex-none")}>
            <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={18} />
            {rotuloAbrir}
            <span className="sr-only">: {d.titulo} (PDF, abre em nova aba)</span>
          </a>
          {d.hrefBaixar ? (
            <a
              href={d.hrefBaixar}
              aria-label={`Baixar o PDF de “${d.titulo}”`}
              className="alvo-toque flex size-11 shrink-0 items-center justify-center rounded-full border border-borda-padrao bg-fundo-superficie text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconeFigma src="/site/icone-download.svg" tamanho={20} />
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
