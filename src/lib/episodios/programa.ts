import type { ProgramaAoVivo } from "@/lib/config-site/esquema";
import { FUSO } from "@/lib/datas";

/**
 * Programa ao vivo do Rádio Chofer (E61, P10). Funções puras: valem no servidor e na tela.
 * O texto público mostra só o início (“Segunda a sexta · 13h”); o fim serve ao “ao vivo agora”.
 */

export const NOME_DO_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
/** A semana na ordem da tela: começa na segunda. */
export const DIAS_DA_SEMANA = [1, 2, 3, 4, 5, 6, 0] as const;
export const NOME_CURTO_DO_DIA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** "13:00" → "13h"; "13:30" → "13h30". */
export function textoDaHora(hora: string): string {
  const [h, m] = hora.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Os dias marcados, na ordem da semana começando na segunda. */
function diasEmOrdem(dias: readonly number[]): number[] {
  return DIAS_DA_SEMANA.filter((d) => dias.includes(d));
}

/** Três dias ou mais em sequência viram “X a Y”. */
function emSequencia(marcados: number[]): boolean {
  const posicoes = marcados.map((d) => DIAS_DA_SEMANA.indexOf(d as (typeof DIAS_DA_SEMANA)[number]));
  return marcados.length >= 3 && posicoes.every((p, i) => i === 0 || p === posicoes[i - 1]! + 1);
}

function juntar(nomes: string[]): string {
  return nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/** “segunda a sexta”, “todos os dias”, “segunda, quarta e sexta”. */
export function textoDosDias(dias: readonly number[]): string {
  const marcados = diasEmOrdem(dias);
  if (marcados.length === 7) return "todos os dias";
  if (emSequencia(marcados)) return `${NOME_DO_DIA[marcados[0]!]} a ${NOME_DO_DIA[marcados.at(-1)!]}`;
  return juntar(marcados.map((d) => NOME_DO_DIA[d]!));
}

/** “Segunda a sexta · 13h”, como no painel (166:17373). */
export function textoDoHorario(p: Pick<ProgramaAoVivo, "dias" | "inicio">): string {
  return `${maiuscula(textoDosDias(p.dias))} · ${textoDaHora(p.inicio)}`;
}

/** “Ao vivo de segunda a sexta · 13h”, a linha do topo da página (157:8305). */
export function linhaAoVivo(p: Pick<ProgramaAoVivo, "dias" | "inicio">): string {
  const marcados = diasEmOrdem(p.dias);
  const hora = textoDaHora(p.inicio);
  if (marcados.length === 7) return `Ao vivo todos os dias · ${hora}`;
  if (emSequencia(marcados)) return `Ao vivo de ${textoDosDias(p.dias)} · ${hora}`;
  return `Ao vivo às ${juntar(marcados.map((d) => `${NOME_DO_DIA[d]}s`))} · ${hora}`;
}

/** O dia da semana (0 = domingo) e a hora "HH:MM" de um instante, no horário da Bahia. */
function agoraNaBahia(instante: Date): { dia: number; hora: string } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(valor("weekday"));
  return { dia, hora: `${valor("hour")}:${valor("minute")}` };
}

/** O programa está no ar agora? Ligado, num dia marcado, do início (incluído) ao fim (excluído), na Bahia. A Home usa (#18). */
export function programaNoAr(p: ProgramaAoVivo, instante: Date): boolean {
  if (!p.ativo) return false;
  const { dia, hora } = agoraNaBahia(instante);
  return p.dias.includes(dia) && hora >= p.inicio && hora < p.fim;
}

/** Os links do topo: o canal e o “inscrever-se” do YouTube (`?sub_confirmation=1`). Sem canal, nenhum. */
export function linksDoCanal(canal: string | null): { assistir: string; inscrever: string } | null {
  if (!canal) return null;
  const inscrever = new URL(canal);
  inscrever.searchParams.set("sub_confirmation", "1");
  return { assistir: canal, inscrever: inscrever.toString() };
}
