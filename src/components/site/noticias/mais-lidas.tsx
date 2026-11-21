import Link from "next/link";

import { SeloCategoria } from "@/components/selo-categoria";
import { NOTICIAS_PAGINA } from "@/conteudo/site";
import { dataCurtaNaBahia } from "@/lib/datas";
import type { NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import { cn } from "@/lib/utils";

/**
 * “Mais lidas da semana” (Figma 80:771 e a lateral da notícia aberta, 100:15159; E30, E59). Sobre o
 * marinho na página Notícias; claro na lateral da notícia. Cada item inteiro é um link.
 */
export function MaisLidas({ noticias, sobreEscuro = false, id = "mais-lidas" }: { noticias: NoticiaDoSite[]; sobreEscuro?: boolean; id?: string }) {
  if (noticias.length === 0) return null;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col rounded-[24px] border px-6 pt-6 pb-2 lg:rounded-[28px]",
        sobreEscuro ? "border-sobre-escuro-chip bg-sobre-escuro-superficie lg:px-7 lg:pt-7" : "border-borda-padrao bg-fundo-superficie",
      )}
    >
      <h2 id={id} className={cn("texto-eyebrow flex items-center gap-3 pb-2", sobreEscuro ? "text-destaque-amarelo" : "text-destaque-azul")}>
        <span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-destaque-amarelo" />
        {NOTICIAS_PAGINA.maisLidas}
      </h2>
      <ol className={cn("flex flex-col divide-y", sobreEscuro ? "divide-sobre-escuro-chip" : "divide-borda-padrao")}>
        {noticias.map((n, i) => (
          <li key={n.id}>
            <Link
              href={n.href}
              className={cn(
                "group flex items-center gap-4 rounded-[12px] outline-none focus-visible:ring-[3px]",
                sobreEscuro ? "py-5 focus-visible:ring-destaque-amarelo" : "py-4 focus-visible:ring-ring",
              )}
            >
              <span
                aria-hidden
                className={cn("w-8 shrink-0 font-condensed text-[32px] leading-[1.12] font-bold", sobreEscuro ? "text-destaque-amarelo" : "text-destaque-azul")}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {sobreEscuro && n.capa ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura da capa
                <img src={n.capa.url} alt="" loading="lazy" className="size-[72px] shrink-0 rounded-[14px] object-cover lg:size-[84px]" />
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                {n.categoria ? <SeloCategoria nome={n.categoria.nome} cor={n.categoria.cor} /> : null}
                <span
                  className={cn(
                    "texto-titulo-card-pequeno break-words group-hover:underline group-hover:underline-offset-2",
                    sobreEscuro ? "text-texto-invertido" : "text-texto-primario",
                  )}
                >
                  {n.titulo}
                </span>
                <time dateTime={n.publicadoEm.toISOString()} className={cn("texto-pequeno", sobreEscuro ? "text-texto-invertido-sec" : "text-texto-terciario")}>
                  {dataCurtaNaBahia(n.publicadoEm)}
                </time>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
