import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";

/**
 * Estado com ícone, frase e ação, no padrão do E23 (Figma 293:42423: 403 e 500).
 */
export function EstadoDaTela({
  icone,
  eyebrow,
  titulo,
  children,
  acao,
}: {
  icone: string;
  eyebrow: string;
  titulo: string;
  children: React.ReactNode;
  acao: { rotulo: string; href: string };
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-5 pt-8 pb-16 text-center lg:px-10 lg:pb-28">
      <div className="flex max-w-[560px] flex-col items-center gap-4">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
          <IconeFigma src={icone} tamanho={32} />
        </span>
        <p className="texto-eyebrow text-destaque-azul">{eyebrow}</p>
        <h1 className="texto-titulo-card-grande text-texto-primario">{titulo}</h1>
        <p className="max-w-[520px] texto-corpo-grande text-texto-secundario">{children}</p>
        <Button asChild>
          <Link href={acao.href}>{acao.rotulo}</Link>
        </Button>
      </div>
    </section>
  );
}
