import { cn } from "@/lib/utils";

/**
 * Ícone exportado do Figma (public/painel/*.svg), desenhado como máscara: a forma é a do
 * arquivo e a cor vem do texto (`currentColor`). Assim o mesmo ícone serve no item ativo,
 * no inativo e no tema escuro.
 */
export function IconeFigma({
  src,
  tamanho = 20,
  className,
}: {
  src: string;
  tamanho?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        width: tamanho,
        height: tamanho,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}
