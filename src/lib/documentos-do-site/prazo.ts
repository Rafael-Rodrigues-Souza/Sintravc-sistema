/**
 * “Faltam N dias” e selo “Novo” da página Documentos (E60). Puro.
 *
 * A contagem usa a mesma regra do selo de vigência (`seloDosDados`, E46): só existe enquanto o selo
 * é “Prazo”. Assim o destaque e o cartão nunca discordam: no último dia, “Termina hoje” some na hora
 * do prazo, no mesmo instante em que o selo vira “Encerrado”. Os dias são contados pelo calendário
 * da Bahia (RNF06).
 */
import { diaNaBahia } from "@/lib/datas";
import { instanteDoEvento, type TipoDocumento } from "@/lib/documentos/dados";
import { seloDosDados, type DatasDoDocumento } from "@/lib/documentos/selo";

/** O prazo está em aberto: o selo do documento publicado é “Prazo”. */
export function prazoEmAberto(tipo: TipoDocumento, dados: DatasDoDocumento, agora: Date): boolean {
  return seloDosDados(tipo, "publicado", dados, agora) === "prazo";
}

/** "Faltam 5 dias", "Falta 1 dia", "Termina hoje"; nulo quando o prazo não está em aberto. */
export function contagemDoPrazo(tipo: TipoDocumento, dados: DatasDoDocumento, agora: Date): string | null {
  if (!prazoEmAberto(tipo, dados, agora)) return null;
  const evento = instanteDoEvento(dados);
  if (!evento) return null;
  const dias = diaNaBahia(evento) - diaNaBahia(agora);
  if (dias <= 0) return "Termina hoje";
  if (dias === 1) return "Falta 1 dia";
  return `Faltam ${dias} dias`;
}

/** Publicado há menos de `dias` dias do calendário da Bahia (`documento.novo_dias`, E46). */
export function ehNovo(publicadoEm: Date, agora: Date, dias: number): boolean {
  return diaNaBahia(agora) - diaNaBahia(publicadoEm) < dias;
}
