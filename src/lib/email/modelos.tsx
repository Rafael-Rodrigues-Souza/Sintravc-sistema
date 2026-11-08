import { render } from "@react-email/render";

import { ASSUNTO_CONVITE, ConviteEquipe, type DadosConviteEquipe } from "@/emails/convite-equipe";

import type { Mensagem } from ".";

/** "05/11/2026 às 14h30", no horário da Bahia (RNF06). */
export function dataHoraDoEmail(data: Date): string {
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

/** M01: convite para a equipe, em HTML e em texto. */
export async function mensagemConviteEquipe(para: string, dados: DadosConviteEquipe): Promise<Mensagem> {
  const elemento = <ConviteEquipe {...dados} />;
  return {
    para,
    assunto: ASSUNTO_CONVITE,
    html: await render(elemento),
    texto: await render(elemento, { plainText: true }),
  };
}
