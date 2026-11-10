/**
 * Resumo de cada versão no Histórico (N14, Figma 294:43036): o que mudou em relação à versão
 * anterior, calculado pelos retratos guardados. Pura: serve ao servidor e aos testes.
 */
import type { DadosNoticia } from "./dados";

/** As partes da notícia, na ordem do editor, e os campos de cada uma. */
const PARTES: { nome: string; campos: (keyof DadosNoticia)[] }[] = [
  { nome: "manchete", campos: ["titulo"] },
  { nome: "linha fina", campos: ["linhaFina"] },
  { nome: "lide", campos: ["lide"] },
  { nome: "texto", campos: ["corpo"] },
  { nome: "imagem de capa", campos: ["capaMidiaId", "capaAlt", "capaLegenda"] },
  { nome: "assinatura", campos: ["assinatura"] },
  { nome: "local", campos: ["local"] },
  { nome: "categoria", campos: ["categoriaId"] },
  { nome: "palavras-chave", campos: ["palavrasChave"] },
  { nome: "fontes e anexos", campos: ["links"] },
];

export function resumirMudancas(anterior: DadosNoticia | null, atual: DadosNoticia): string {
  if (!anterior) return "Primeira publicação.";
  const mudou = PARTES.filter(({ campos }) => campos.some((c) => JSON.stringify(anterior[c]) !== JSON.stringify(atual[c]))).map(
    (p) => p.nome,
  );
  if (mudou.length === 0) return "Sem mudanças no texto.";
  const lista = mudou.length === 1 ? mudou[0] : `${mudou.slice(0, -1).join(", ")} e ${mudou.at(-1)}`;
  return `Mudou: ${lista}.`;
}
