import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

/**
 * O “Saiba mais” de um comunicado (RN14, E58), igual na faixa, na janela e nos cartões da página
 * Comunicados: sublinhado, com a seta, sobre o amarelo. Link externo abre em outra aba, e o leitor de
 * tela ouve isso. `sobre` diz a que comunicado o link se refere, para quem ouve só a lista de links.
 */
export function SaibaMais({
  link,
  sobre,
  className,
}: {
  link: { href: string; externo: boolean };
  sobre?: string;
  className?: string;
}) {
  return (
    <a
      href={link.href}
      {...(link.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "flex items-center gap-1.5 rounded-[6px] texto-botao underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo",
        className,
      )}
    >
      Saiba mais
      {sobre ? <span className="sr-only">: {sobre}</span> : null}
      {link.externo ? <span className="sr-only"> (abre em outra aba)</span> : null}
      <IconeFigma src="/site/comunicado-seta-direita.svg" tamanho={16} />
    </a>
  );
}
