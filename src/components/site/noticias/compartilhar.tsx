"use client";

import { toast } from "sonner";

import { IconeFigma } from "@/components/icone-figma";
import { linksDeCompartilhar } from "@/lib/noticias-do-site/compartilhar";
import { cn } from "@/lib/utils";

const REDONDO = "flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px]";
const PILULA = "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full pr-6 pl-5 texto-botao outline-none focus-visible:ring-[3px]";

/**
 * Compartilhar a notícia (Figma 100:15197 no topo e 100:15279 no fim; E59): WhatsApp, Facebook e
 * “Copiar link”. Os dois primeiros abrem numa aba nova e só falam com a rede no clique.
 */
export function Compartilhar({ url, titulo, tom }: { url: string; titulo: string; tom: "sobre-escuro" | "claro" }) {
  const links = linksDeCompartilhar(url, titulo);
  const escuro = tom === "sobre-escuro";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não conseguimos copiar o link.", { description: url, duration: Infinity, closeButton: true });
    }
  }

  const redondo = cn(
    REDONDO,
    escuro
      ? "border border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido hover:bg-sobre-escuro-chip focus-visible:ring-destaque-amarelo"
      : "border border-borda-padrao bg-fundo-superficie text-texto-primario hover:bg-fundo-superficie-alt focus-visible:ring-ring",
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {escuro ? <span className="texto-pequeno text-texto-invertido-sec">Compartilhe</span> : null}
      {escuro ? (
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no WhatsApp" className={redondo}>
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={20} />
        </a>
      ) : (
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartilhar no WhatsApp"
          className={cn(PILULA, "bg-destaque-amarelo text-destaque-amarelo-texto hover:brightness-95 focus-visible:ring-ring")}
        >
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
          WhatsApp
        </a>
      )}
      <a href={links.facebook} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Facebook" className={redondo}>
        <IconeFigma src="/site/icone-facebook.svg" tamanho={20} />
      </a>
      <button
        type="button"
        onClick={copiar}
        className={cn(
          PILULA,
          "border-[1.5px]",
          escuro
            ? "border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido hover:bg-sobre-escuro-chip focus-visible:ring-destaque-amarelo"
            : "border-borda-forte text-texto-primario hover:bg-fundo-superficie-alt focus-visible:ring-ring",
        )}
      >
        Copiar link
      </button>
    </div>
  );
}
