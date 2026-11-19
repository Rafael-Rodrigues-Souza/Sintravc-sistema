import Link from "next/link";

import { cn } from "@/lib/utils";

import { Marcador } from "./texto-do-site";

/** Migalhas (Figma: “Início › Sindicato › Instituição”). O último item é a página atual. */
export function Migalhas({ itens, sobreEscuro = false }: { itens: { rotulo: string; href?: string }[]; sobreEscuro?: boolean }) {
  return (
    <nav aria-label="Você está em" className="texto-pequeno">
      <ol className={cn("flex flex-wrap items-center gap-1.5", sobreEscuro ? "text-texto-invertido-sec" : "text-texto-secundario")}>
        {itens.map((item, i) => (
          <li key={item.rotulo} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>›</span> : null}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "alvo-toque rounded-sm outline-none focus-visible:ring-2",
                  sobreEscuro ? "hover:text-texto-invertido focus-visible:ring-destaque-amarelo" : "hover:text-texto-primario focus-visible:ring-ring",
                )}
              >
                {item.rotulo}
              </Link>
            ) : (
              <span aria-current="page" className={cn("font-semibold", sobreEscuro ? "text-texto-invertido" : "text-texto-primario")}>
                {item.rotulo}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Sobretítulo com o traço amarelo (estilo 2.0/Eyebrow). */
export function Eyebrow({ children, sobreEscuro = false, className }: { children: React.ReactNode; sobreEscuro?: boolean; className?: string }) {
  return (
    <p className={cn("texto-eyebrow flex items-center gap-3", sobreEscuro ? "text-destaque-amarelo" : "text-destaque-azul", className)}>
      <span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-destaque-amarelo" />
      <span>{children}</span>
    </p>
  );
}

/** Título de seção: sobretítulo, título e, ao lado no desktop, um texto curto. */
export function CabecalhoDeSecao({
  id,
  eyebrow,
  titulo,
  texto,
  sobreEscuro = false,
}: {
  id: string;
  eyebrow: React.ReactNode;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
  sobreEscuro?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
      <div className="flex max-w-[640px] flex-col gap-3">
        <Eyebrow sobreEscuro={sobreEscuro}>{eyebrow}</Eyebrow>
        <h2 id={id} className={cn("texto-titulo-secao-mobile scroll-mt-28 lg:texto-titulo-secao", sobreEscuro ? "text-texto-invertido" : "text-texto-primario")}>
          {titulo}
        </h2>
      </div>
      {texto ? <p className={cn("texto-corpo max-w-[360px]", sobreEscuro ? "text-texto-invertido-sec" : "text-texto-secundario")}>{texto}</p> : null}
    </div>
  );
}

/**
 * Lugar de uma foto que o sindicato ainda vai mandar (D5): sem banco de imagens. Mostra as iniciais,
 * quando houver, e o marcador.
 */
export function FotoPendente({ iniciais, rotulo = "[Foto a definir pelo sindicato]", className }: { iniciais?: string; rotulo?: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={iniciais ? `Foto ainda não enviada (${iniciais})` : "Foto ainda não enviada"}
      className={cn("flex flex-col items-center justify-center gap-2 bg-destaque-azul-suave p-4 text-center", className)}
    >
      {iniciais ? <span className="font-condensed text-[44px] leading-none font-extrabold text-destaque-azul">{iniciais}</span> : null}
      <Marcador className="texto-pequeno">{rotulo}</Marcador>
    </div>
  );
}
