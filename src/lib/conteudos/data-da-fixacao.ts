import { bahiaParaUtc, FUSO, somarDias } from "@/lib/datas";

/**
 * Datas da notícia fixada (RN58, E59). Puro: serve ao servidor e à tela.
 * `noticia.fixada_ate` é o fim **exclusivo**: “até 10/11” guarda 00:00 de 11/11 na Bahia.
 */

/** O fim exclusivo da fixação escolhida na tela ("2026-11-10" → 00:00 de 11/11 na Bahia, em UTC). */
export function fimDaFixacao(dia: string): Date | null {
  if (!bahiaParaUtc(dia, "00:00")) return null;
  return bahiaParaUtc(somarDias(dia, 1), "00:00");
}

/** O dia escolhido na tela ("2026-11-10") a partir do fim exclusivo guardado (o inverso de fimDaFixacao). */
export function diaDaFixacao(fim: Date): string {
  // O último instante que ainda vale é 1 ms antes do fim; o dia dele, na Bahia.
  const ultimo = new Date(fim.getTime() - 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(ultimo);
}
