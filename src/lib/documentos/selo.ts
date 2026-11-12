/**
 * Selo de vigência do documento oficial (C2, E46). É calculado pelas datas e não é estado: o
 * documento continua publicado quando o selo vira “Encerrado”. Os dias de vigência são comparados
 * com o dia de hoje no horário da Bahia (RNF06). Puro.
 */
import { bahiaEmCampos } from "@/lib/datas";

import type { EstadoConteudo } from "@/lib/conteudos/listar";

export type SeloDeVigencia = "prazo" | "vigente" | "encerrado";

export type DatasDoSelo = {
  estado: EstadoConteudo;
  /** Data e hora do evento ou do prazo (instante em UTC). */
  dataEvento: Date | null;
  /** Dias do calendário, "AAAA-MM-DD". */
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
};

export const ROTULO_DO_SELO: Record<SeloDeVigencia, string> = {
  prazo: "Prazo",
  vigente: "Vigente",
  encerrado: "Encerrado",
};

export function seloDeVigencia(doc: DatasDoSelo, agora: Date): SeloDeVigencia | null {
  if (doc.estado !== "publicado") return null;
  if (doc.dataEvento && doc.dataEvento.getTime() > agora.getTime()) return "prazo";
  if (doc.vigenciaInicio && doc.vigenciaFim) {
    const hoje = bahiaEmCampos(agora).data;
    if (hoje > doc.vigenciaFim) return "encerrado";
    if (hoje >= doc.vigenciaInicio) return "vigente";
    return null;
  }
  if (doc.dataEvento) return "encerrado";
  return null;
}
