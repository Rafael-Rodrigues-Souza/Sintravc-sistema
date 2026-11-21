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

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "12 out 2026", no horário da Bahia (os cartões de notícia do site, Figma 79:1481). */
export function dataCurtaNaBahia(data: Date): string {
  const parte = partesNaBahia(data, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${parte("day")} ${MESES_CURTOS[Number(parte("month")) - 1]} ${parte("year")}`;
}

/**
 * Um dia do calendário da Bahia ("2026-11-10") somado de `dias` (negativo volta): "2026-11-11".
 * Conta só o calendário, sem hora: serve ao fim da fixação e à janela das Mais lidas (E59).
 */
export function somarDias(dia: string, dias: number): string {
  const [ano, mes, d] = dia.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(ano, mes - 1, d + dias)).toISOString().slice(0, 10);
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

/** "05/11/2026 · 14h30", no horário da Bahia (o "Quando" dos e-mails de segurança). */
export function quandoNaBahia(data: Date): string {
  return `${dataNaBahia(data)} · ${horaNaBahia(data)}`;
}

/** Diferença entre o relógio da Bahia e o UTC naquele instante, em ms (negativa: UTC-3). */
function deslocamentoDaBahia(instante: number): number {
  const parte = partesNaBahia(new Date(instante), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const relogio = Date.UTC(
    Number(parte("year")),
    Number(parte("month")) - 1,
    Number(parte("day")),
    Number(parte("hour")),
    Number(parte("minute")),
    Number(parte("second")),
  );
  return relogio - Math.floor(instante / 1000) * 1000;
}

/**
 * Converte a data ("2026-11-03") e a hora ("08:00") escolhidas na tela, sempre no horário da
 * Bahia, para o instante em UTC (RNF06, E44). Não depende do fuso do computador de quem escolheu
 * nem do servidor. Devolve null se a data ou a hora não existem.
 */
export function bahiaParaUtc(data: string, hora: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!d || !h) return null;
  const [ano, mes, dia, horas, minutos] = [d[1], d[2], d[3], h[1], h[2]].map(Number) as [number, number, number, number, number];
  if (horas > 23 || minutos > 59) return null;
  const relogio = Date.UTC(ano, mes - 1, dia, horas, minutos);
  const conferida = new Date(relogio);
  if (conferida.getUTCFullYear() !== ano || conferida.getUTCMonth() !== mes - 1 || conferida.getUTCDate() !== dia) return null;
  // Duas passadas: se o fuso tivesse horário de verão, a segunda corrige a primeira.
  const primeira = relogio - deslocamentoDaBahia(relogio);
  return new Date(relogio - deslocamentoDaBahia(primeira));
}

/** A data ("2026-11-03") e a hora ("08:00") de um instante no horário da Bahia, para os campos da tela. */
export function bahiaEmCampos(instante: Date): { data: string; hora: string } {
  const parte = partesNaBahia(instante, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return { data: `${parte("year")}-${parte("month")}-${parte("day")}`, hora: `${parte("hour")}:${parte("minute")}` };
}

/** "03/11/2026 às 08h00", a partir dos campos da tela (que já estão no horário da Bahia). */
export function camposEmTexto({ data, hora }: { data: string; hora: string }): string {
  const [ano, mes, dia] = data.split("-");
  const [h, m] = hora.split(":");
  return `${dia}/${mes}/${ano} às ${h}h${m}`;
}

/** Ano no horário da Bahia (ex.: o “© 2026” do rodapé). */
export function anoNaBahia(data: Date): number {
  return Number(partesNaBahia(data, { year: "numeric" })("year"));
}
