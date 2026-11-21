import { cn } from "@/lib/utils";

/** Cores dos selos de categoria (Figma 117:3030). O nome da cor fica na tabela `categoria`. */
const COR_DA_CATEGORIA: Record<string, string> = {
  azul: "bg-destaque-azul-suave text-destaque-azul",
  marinho: "bg-destaque-marinho-fixo text-texto-invertido",
  amarelo: "bg-destaque-amarelo text-destaque-amarelo-texto",
  vermelho: "bg-status-perigo-fundo text-status-perigo-texto",
  aviso: "bg-status-aviso-fundo text-status-aviso-texto",
};

/** Selo da categoria, no painel (Conteúdos) e no site (cartões de notícia, Figma 79:1481). */
export function SeloCategoria({ nome, cor, className }: { nome: string; cor: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 texto-etiqueta uppercase",
        COR_DA_CATEGORIA[cor] ?? COR_DA_CATEGORIA.azul,
        className,
      )}
    >
      {nome}
    </span>
  );
}
