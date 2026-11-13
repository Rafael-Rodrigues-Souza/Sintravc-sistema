/**
 * O que mudou entre duas versões do documento, pelas partes do editor (N4, N14). Puro: serve ao
 * modal "Há duas versões do rascunho" e ao resumo do Histórico.
 */
import type { DadosDocumento } from "./dados";

const PARTES: { nome: string; campos: (keyof DadosDocumento)[] }[] = [
  { nome: "título", campos: ["titulo"] },
  { nome: "número", campos: ["numero"] },
  { nome: "tipo", campos: ["subtipo"] },
  { nome: "datas", campos: ["dataDocumento", "eventoData", "eventoHora"] },
  { nome: "vigência", campos: ["temVigencia", "vigenciaInicio", "vigenciaFim"] },
  { nome: "abrangência", campos: ["abrangencia"] },
  { nome: "partes signatárias", campos: ["partesSignatarias"] },
  { nome: "resumo", campos: ["resumo"] },
  { nome: "PDF oficial", campos: ["pdfMidiaId"] },
  { nome: "texto pesquisável", campos: ["textoPesquisavel"] },
  { nome: "categoria", campos: ["categoriaId"] },
];

/** As partes que mudaram, em linguagem simples ("resumo e PDF oficial"); "nada" se nada mudou. */
export function partesDiferentes(a: DadosDocumento, b: DadosDocumento): string {
  const mudou = PARTES.filter(({ campos }) => campos.some((c) => JSON.stringify(a[c]) !== JSON.stringify(b[c]))).map((p) => p.nome);
  if (mudou.length === 0) return "nada";
  return mudou.length === 1 ? mudou[0]! : `${mudou.slice(0, -1).join(", ")} e ${mudou.at(-1)}`;
}
