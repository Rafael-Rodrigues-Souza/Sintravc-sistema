/**
 * A grade do calendário de publicações (Figma 115:2992). Função pura, sem código de servidor:
 * roda na tela e no servidor. As datas são dias do calendário (texto "AAAA-MM-DD"), sem hora.
 */
import { bahiaEmCampos } from "@/lib/datas";

export type DiaDaGrade = { data: string; dia: number; doMes: boolean };

const DIA_MS = 24 * 60 * 60 * 1000;
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** 6 semanas (42 dias), de domingo a sábado, com o mês no meio. `mes` vai de 1 a 12. */
export function gradeDoMes(ano: number, mes: number): DiaDaGrade[] {
  const primeiro = Date.UTC(ano, mes - 1, 1);
  const inicio = primeiro - new Date(primeiro).getUTCDay() * DIA_MS;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio + i * DIA_MS);
    return {
      data: `${d.getUTCFullYear()}-${doisDigitos(d.getUTCMonth() + 1)}-${doisDigitos(d.getUTCDate())}`,
      dia: d.getUTCDate(),
      doMes: d.getUTCMonth() === mes - 1,
    };
  });
}

/** O dia ("AAAA-MM-DD") em que o instante cai no horário da Bahia. */
export function diaNoCalendario(instante: Date): string {
  return bahiaEmCampos(instante).data;
}

/** O mês antes (-1) ou depois (+1). */
export function mesVizinho(ano: number, mes: number, passo: 1 | -1): { ano: number; mes: number } {
  const indice = ano * 12 + (mes - 1) + passo;
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}
