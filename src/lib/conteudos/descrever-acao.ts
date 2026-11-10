/** Frases das "Últimas ações" (Figma 115:2324). Pura: o servidor monta o texto para a tela. */
import { dataHoraNaBahia } from "@/lib/datas";

const FRASES: Record<string, string> = {
  "noticia.criar": "Rascunho criado",
  "noticia.editar": "Texto editado",
  "noticia.resolver_conflito": "Versão escolhida depois de um conflito",
  "noticia.publicar": "Publicado",
  "noticia.publicar_alteracoes": "Alterações publicadas",
  "noticia.descartar_alteracoes": "Alterações descartadas",
  "noticia.publicar_agendado": "Publicado na hora agendada",
  "noticia.agendamento_falhou": "A publicação agendada falhou",
  "noticia.cancelar_agendamento": "Agendamento cancelado",
};

export function descreverAcao(acao: string, detalhe: Record<string, unknown>): string {
  const para = typeof detalhe.para === "string" ? new Date(detalhe.para) : null;
  if (acao === "noticia.agendar" && para) return `Agendado para ${dataHoraNaBahia(para)}`;
  if (acao === "noticia.reagendar" && para) return `Reagendado para ${dataHoraNaBahia(para)}`;
  return FRASES[acao] ?? "Alteração registrada";
}
