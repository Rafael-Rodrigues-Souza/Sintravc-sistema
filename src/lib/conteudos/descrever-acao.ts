/** Frases das "Últimas ações" (Figma 115:2324). Pura: o servidor monta o texto para a tela. */
import { dataHoraNaBahia, dataNaBahia } from "@/lib/datas";

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
  "noticia.ocultar": "Ocultado do site",
  "noticia.mostrar": "De volta ao site",
  "noticia.arquivar": "Arquivado",
  "noticia.desfazer_arquivamento": "Arquivamento desfeito",
  "noticia.restaurar": "Restaurado como rascunho",
};

export function descreverAcao(acao: string, detalhe: Record<string, unknown>): string {
  const para = typeof detalhe.para === "string" ? new Date(detalhe.para) : null;
  if (acao === "noticia.agendar" && para) return `Agendado para ${dataHoraNaBahia(para)}`;
  if (acao === "noticia.reagendar" && para) return `Reagendado para ${dataHoraNaBahia(para)}`;
  if (acao === "noticia.fixar" && typeof detalhe.fixada_ate === "string") {
    // O fim é exclusivo (00:00 do dia seguinte): o dia escolhido é o anterior (E59).
    const ate = dataNaBahia(new Date(new Date(detalhe.fixada_ate).getTime() - 1));
    return detalhe.ao_publicar ? `Fixar até ${ate} ao publicar` : `Fixada no topo de Notícias até ${ate}`;
  }
  if (acao === "noticia.desafixar") {
    if (detalhe.automatico) return "Saiu do topo de Notícias na data marcada";
    if (typeof detalhe.substituida_por === "string") return "Saiu do topo de Notícias: outra notícia foi fixada";
    return "Deixou de ser fixada";
  }
  if (acao === "noticia.restaurar_versao" && typeof detalhe.versao === "number") return `Versão ${detalhe.versao} restaurada como rascunho`;
  return FRASES[acao] ?? "Alteração registrada";
}
