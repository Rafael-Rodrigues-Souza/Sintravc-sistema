/** Datas na tela e nos e-mails: sempre no horário da Bahia (RNF06). */

/** "05/11/2026 às 14h30", no horário da Bahia (RNF06). */
export function dataHoraNaBahia(data: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} às ${p("hour")}h${p("minute")}`;
}
