import { IconeFigma } from "@/components/icone-figma";
import { cn } from "@/lib/utils";

/**
 * Alerta 2.0 (Figma 153:9018): alerta em linha para formulários e telas (E23).
 * Erro = bloqueio/falha; Aviso = atenção; Sucesso = confirmação; Informação = orientação.
 */
const TIPOS = {
  erro: { fundo: "bg-status-perigo-fundo", cor: "text-status-perigo-texto", icone: "/painel/alerta-erro.svg" },
  aviso: { fundo: "bg-status-aviso-fundo", cor: "text-status-aviso-texto", icone: "/painel/alerta-aviso.svg" },
  sucesso: { fundo: "bg-status-sucesso-fundo", cor: "text-status-sucesso-texto", icone: "/painel/alerta-sucesso.svg" },
  informacao: { fundo: "bg-destaque-azul-suave", cor: "text-destaque-azul", icone: "/painel/alerta-info.svg" },
} as const;

export function Alerta({
  tipo,
  titulo,
  children,
  className,
}: {
  tipo: keyof typeof TIPOS;
  titulo: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const estilo = TIPOS[tipo];
  return (
    <div
      role={tipo === "erro" || tipo === "aviso" ? "alert" : "status"}
      className={cn("flex w-full items-start gap-3 rounded-[12px] p-4", estilo.fundo, className)}
    >
      <IconeFigma src={estilo.icone} tamanho={22} className={estilo.cor} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className={cn("texto-titulo-card-pequeno", estilo.cor)}>{titulo}</p>
        {children ? <div className="texto-pequeno text-texto-primario">{children}</div> : null}
      </div>
    </div>
  );
}
