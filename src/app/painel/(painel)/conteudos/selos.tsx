import type { EstadoConteudo } from "@/lib/conteudos/listar";
import { ROTULO_DO_SELO, type SeloDeVigencia } from "@/lib/documentos/selo";
import { cn } from "@/lib/utils";

/** Estados do ciclo de vida (RN10; Figma 118:3448, "Ciclo de vida de um conteúdo"). */
export const ESTADO: Record<EstadoConteudo, { rotulo: string; classe: string; ponto: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-status-neutro-fundo text-status-neutro-texto", ponto: "border border-current" },
  agendado: { rotulo: "Agendado", classe: "bg-destaque-azul-suave text-destaque-azul", ponto: "bg-current" },
  publicado: { rotulo: "Publicado", classe: "bg-status-sucesso-fundo text-status-sucesso-texto", ponto: "bg-current" },
  oculto: { rotulo: "Oculto", classe: "bg-status-aviso-fundo text-status-aviso-texto", ponto: "bg-current" },
  arquivado: { rotulo: "Arquivado", classe: "bg-status-neutro-fundo text-status-neutro-texto", ponto: "border border-current" },
};

export function SeloEstado({ estado, className }: { estado: EstadoConteudo; className?: string }) {
  const { rotulo, classe, ponto } = ESTADO[estado];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 texto-etiqueta uppercase", classe, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", ponto)} />
      {rotulo}
    </span>
  );
}

/** Cores dos selos de categoria (Figma 117:3030). O nome da cor fica na tabela `categoria`. */
const COR_DA_CATEGORIA: Record<string, string> = {
  azul: "bg-destaque-azul-suave text-destaque-azul",
  marinho: "bg-destaque-marinho-fixo text-texto-invertido",
  amarelo: "bg-destaque-amarelo text-destaque-amarelo-texto",
  vermelho: "bg-status-perigo-fundo text-status-perigo-texto",
  aviso: "bg-status-aviso-fundo text-status-aviso-texto",
};

export function SeloCategoria({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 texto-etiqueta uppercase",
        COR_DA_CATEGORIA[cor] ?? COR_DA_CATEGORIA.azul,
      )}
    >
      {nome}
    </span>
  );
}

/**
 * Selo de vigência do documento oficial (C2, E46): calculado pelas datas, separado do estado de
 * publicação. Mesmo visual dos selos do site (Figma 73:629 e 75:1438), com o prefixo "Vigência"
 * para quem usa leitor de tela não confundir com o estado.
 */
const VIGENCIA: Record<SeloDeVigencia, string> = {
  prazo: "bg-destaque-amarelo text-destaque-amarelo-texto",
  vigente: "bg-status-sucesso-fundo text-status-sucesso-texto",
  encerrado: "bg-status-neutro-fundo text-status-neutro-texto",
};

export function SeloVigencia({ selo, className }: { selo: SeloDeVigencia | null; className?: string }) {
  if (!selo) return null;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 texto-etiqueta uppercase", VIGENCIA[selo], className)}>
      <span className="sr-only">Vigência: </span>
      {ROTULO_DO_SELO[selo]}
    </span>
  );
}
