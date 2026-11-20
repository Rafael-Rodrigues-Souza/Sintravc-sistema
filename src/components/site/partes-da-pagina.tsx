import Link from "next/link";
import type { ReactNode } from "react";

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
}: {
  id: string;
  eyebrow: React.ReactNode;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
      <div className="flex max-w-[640px] flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className={"texto-titulo-secao-mobile scroll-mt-28 text-texto-primario lg:texto-titulo-secao"}>
          {titulo}
        </h2>
      </div>
      {texto ? <p className={"texto-corpo max-w-[360px] text-texto-secundario"}>{texto}</p> : null}
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

/**
 * Topo marinho das páginas com foto (Instituição e Contato): migalhas, sobretítulo, título, texto,
 * a foto (pendente, D5) com o quadro amarelo e os botões. No celular e no tablet em pé, a foto fica
 * entre o texto e os botões (Figma 57:813; #64), com 16 px entre eles; do lg em diante, o texto e
 * os botões ficam à esquerda e a foto, centralizada, à direita. A ordem do DOM é a do celular, para
 * o leitor de tela e o Tab seguirem a mesma ordem.
 */
export function TopoComFoto({
  migalhas,
  eyebrow,
  titulo,
  texto,
  complemento,
  destaqueDaFoto,
  acoes,
}: {
  migalhas: { rotulo: string; href?: string }[];
  eyebrow: ReactNode;
  titulo: ReactNode;
  texto: ReactNode;
  /** Abaixo do texto, como o horário no Contato. */
  complemento?: ReactNode;
  /** O conteúdo do quadro amarelo sobre a foto. */
  destaqueDaFoto: ReactNode;
  acoes: ReactNode;
}) {
  return (
    <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho text-texto-invertido">
      <div className="conteudo-site flex flex-col gap-4 py-8 lg:grid lg:grid-cols-[1fr_minmax(0,480px)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-16 lg:gap-y-0 lg:py-14">
        <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-2">
          <Migalhas sobreEscuro itens={migalhas} />
          <Eyebrow sobreEscuro className="mt-2 lg:mt-6">
            {eyebrow}
          </Eyebrow>
          <h1 id="titulo-pagina" className="texto-display-mobile lg:texto-display">
            {titulo}
          </h1>
          <p className="texto-corpo max-w-[560px] text-texto-invertido-sec lg:texto-corpo-grande">{texto}</p>
          {complemento}
        </div>
        <div className="relative lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center">
          <FotoPendente className="aspect-[358/250] w-full justify-start rounded-[24px] pt-8 lg:aspect-[4/3]" />
          <div className="absolute right-5 bottom-5 left-5 max-w-[300px] rounded-[16px] bg-destaque-amarelo p-4 text-destaque-amarelo-texto">{destaqueDaFoto}</div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-3 lg:col-start-1 lg:row-start-3 lg:mt-5">{acoes}</div>
      </div>
    </section>
  );
}
