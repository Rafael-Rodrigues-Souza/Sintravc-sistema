import { ArrowUpRight, CalendarDays, Clock, Download, FileText, MapPin } from "lucide-react";

import type { DocumentoNoCartao } from "@/lib/documentos/cartao";
import { cn } from "@/lib/utils";

export type { DocumentoNoCartao };

const TOM = {
  prazo: "bg-destaque-amarelo text-destaque-amarelo-texto",
  vigente: "bg-status-sucesso-fundo text-status-sucesso-texto",
  encerrado: "bg-status-neutro-fundo text-status-neutro-texto",
} as const;

/**
 * Cartão do documento oficial na página Documentos (Figma 73:629 e 75:1438). Serve à prévia do
 * editor (#12) e à página pública (#16). "Abrir documento" abre o PDF no navegador; o ícone baixa.
 */
export function CartaoDocumento({ documento, className }: { documento: DocumentoNoCartao; className?: string }) {
  const d = documento;
  return (
    <article className={cn("flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 sm:flex-row sm:items-center", className)}>
      <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-destaque-azul-suave text-destaque-azul">
        <FileText className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-destaque-azul-suave px-2.5 py-1 texto-etiqueta uppercase text-destaque-azul">{d.etiqueta}</span>
          {d.selo ? <span className={cn("rounded-full px-2.5 py-1 texto-etiqueta uppercase", TOM[d.selo.tom])}>{d.selo.rotulo}</span> : null}
        </div>
        <h3 className="texto-titulo-card text-texto-primario">{d.titulo}</h3>
        {d.numero ? <p className="texto-pequeno text-texto-secundario">{d.numero}</p> : null}
        {d.resumo ? <p className="line-clamp-2 texto-pequeno text-texto-secundario">{d.resumo}</p> : null}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 texto-pequeno text-texto-secundario">
          {d.publicadoEm ? (
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="size-4" />
              Publicado em {d.publicadoEm}
            </li>
          ) : null}
          {d.prazo ? (
            <li className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="size-4" />
              Prazo: {d.prazo}
            </li>
          ) : null}
          {d.vigencia ? (
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="size-4" />
              Vigência: {d.vigencia}
            </li>
          ) : null}
          {d.abrangencia ? (
            <li className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4" />
              {d.abrangencia}
            </li>
          ) : null}
          {d.arquivo ? (
            <li className="inline-flex items-center gap-1.5">
              <FileText aria-hidden className="size-4" />
              {d.arquivo}
            </li>
          ) : null}
        </ul>
      </div>
      {d.hrefAbrir ? (
        <div className="flex items-center gap-2">
          <a
            href={d.hrefAbrir}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-borda-forte px-4 texto-botao text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ArrowUpRight aria-hidden className="size-[18px]" />
            Abrir documento
          </a>
          {d.hrefBaixar ? (
            <a
              href={d.hrefBaixar}
              aria-label={`Baixar o PDF de “${d.titulo}”`}
              className="flex size-10 items-center justify-center rounded-full border border-borda-forte text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <Download aria-hidden className="size-[18px]" />
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
