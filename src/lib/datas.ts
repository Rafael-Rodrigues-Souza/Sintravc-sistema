/** Datas na tela e nos e-mails: sempre no horário da Bahia (RNF06). */

export const FUSO = "America/Bahia";
const DIA_MS = 24 * 60 * 60 * 1000;

/** Lê as partes (dia, mês, hora…) de uma data no horário da Bahia. */
function partesNaBahia(data: Date, opcoes: Intl.DateTimeFormatOptions) {
  const partes = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hourCycle: "h23", ...opcoes }).formatToParts(data);
  return (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
}

/** "05/11/2026", no horário da Bahia. */
export function dataNaBahia(data: Date): string {
  const parte = partesNaBahia(data, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${parte("day")}/${parte("month")}/${parte("year")}`;
}

/** "14h30", no horário da Bahia. */
export function horaNaBahia(data: Date): string {
  const parte = partesNaBahia(data, { hour: "2-digit", minute: "2-digit" });
  return `${parte("hour")}h${parte("minute")}`;
}

/** "05/11/2026 às 14h30", no horário da Bahia. */
export function dataHoraNaBahia(data: Date): string {
  return `${dataNaBahia(data)} às ${horaNaBahia(data)}`;
}

/** Dia do calendário na Bahia, como número de dias desde 1970 (para contar "hoje", "ontem"…). */
export function diaNaBahia(data: Date): number {
  const parte = partesNaBahia(data, { day: "2-digit", month: "2-digit", year: "numeric" });
  return Math.round(Date.UTC(Number(parte("year")), Number(parte("month")) - 1, Number(parte("day"))) / DIA_MS);
}
