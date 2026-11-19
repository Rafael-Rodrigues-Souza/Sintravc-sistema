import { ehMarcador } from "@/lib/config-site/esquema";
import { cn } from "@/lib/utils";

/**
 * Texto que pode estar pendente (D5): entre colchetes, aparece como marcador visível, fácil de achar
 * e de trocar quando o sindicato mandar o conteúdo.
 */
export function TextoDoSite({ texto, className }: { texto: string; className?: string }) {
  if (!ehMarcador(texto)) return <span className={className}>{texto}</span>;
  return <Marcador className={className}>{texto}</Marcador>;
}

export function Marcador({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      data-marcador
      className={cn(
        "rounded-[4px] bg-status-aviso-fundo px-1 text-status-aviso-texto [box-decoration-break:clone]",
        className,
      )}
    >
      {children}
    </span>
  );
}
