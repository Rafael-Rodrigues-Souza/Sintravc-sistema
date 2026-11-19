import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { LOGO } from "./arquivos";

const ALT = "SINTRAVC, Sindicato dos Rodoviários de Vitória da Conquista";

/**
 * Logo nova do sindicato (#13, #61), gerada por scripts/otimizar-logo.ts, no site e no painel. A
 * versão do tema troca por classe (sem esperar o JavaScript); na impressão, sai a preta.
 * `sempreBranca` é para fundo marinho (rodapé do site, menu, topo e telas de acesso do painel). A
 * altura vem de `className` (ex.: h-14); a largura acompanha. `href={null}` mostra a logo sem link
 * (telas de acesso).
 */
export function Logo({
  className,
  sempreBranca = false,
  href = "/",
  alt = ALT,
}: {
  className?: string;
  sempreBranca?: boolean;
  href?: string | null;
  alt?: string;
}) {
  const classesDaImagem = "h-full w-auto";
  const imagens = (
    <>
      {sempreBranca ? null : (
        <Image
          src={`${LOGO.clara.caminho}.webp`}
          alt={alt}
          width={LOGO.clara.largura}
          height={LOGO.clara.altura}
          priority
          className={cn(classesDaImagem, "dark:hidden print:hidden")}
        />
      )}
      <Image
        src={`${LOGO.branca.caminho}.webp`}
        alt={alt}
        width={LOGO.branca.largura}
        height={LOGO.branca.altura}
        priority={sempreBranca}
        className={cn(classesDaImagem, sempreBranca ? "print:hidden" : "hidden dark:block dark:print:hidden")}
      />
      <Image
        src={`${LOGO.preta.caminho}.png`}
        alt={alt}
        width={LOGO.preta.largura}
        height={LOGO.preta.altura}
        className={cn(classesDaImagem, "hidden print:block")}
      />
    </>
  );
  if (href === null) return <span className={cn("inline-flex shrink-0", className)}>{imagens}</span>;
  return (
    <Link href={href} className={cn("inline-flex shrink-0 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring", className)}>
      {imagens}
    </Link>
  );
}
