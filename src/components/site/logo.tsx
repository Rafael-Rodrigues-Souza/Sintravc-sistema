import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const ALT = "SINTRAVC, Sindicato dos Rodoviários de Vitória da Conquista";

/**
 * Logo nova do sindicato (#13), gerada por scripts/otimizar-logo.ts. A versão do tema troca por
 * classe (sem esperar o JavaScript); na impressão, sai a preta. `sempreBranca` é para fundo marinho.
 * A altura vem de `className` (ex.: h-14); a largura acompanha.
 */
export function Logo({ className, sempreBranca = false }: { className?: string; sempreBranca?: boolean }) {
  const img = "h-full w-auto";
  return (
    <Link href="/" className={cn("inline-flex shrink-0 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring", className)}>
      {sempreBranca ? null : (
        <Image src="/marca/sintravc-clara.webp" alt={ALT} width={245} height={192} priority className={cn(img, "dark:hidden print:hidden")} />
      )}
      <Image
        src="/marca/sintravc-escura.webp"
        alt={ALT}
        width={283}
        height={192}
        priority={sempreBranca}
        className={cn(img, sempreBranca ? "print:hidden" : "hidden dark:block dark:print:hidden")}
      />
      <Image src="/marca/sintravc-preta.png" alt={ALT} width={261} height={192} className={cn(img, "hidden print:block")} />
    </Link>
  );
}
