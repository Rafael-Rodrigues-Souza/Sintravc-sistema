/**
 * Duração dos episódios (E61). A Data API do YouTube devolve ISO 8601 (PT28M10S); a pessoa
 * digita 28:10 ou 1:02:30. Guardamos segundos.
 */

/** PT1H2M30S → 3750. Devolve null quando o formato não é o esperado. */
export function segundosDoIso(iso: string): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso.trim());
  if (!m || iso.trim() === "P" || iso.trim() === "PT") return null;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

/** "28:10" → 1690; "1:02:30" → 3750. Vazio → null. Formato errado → undefined. */
export function segundosDoTexto(texto: string): number | null | undefined {
  const limpo = texto.trim();
  if (!limpo) return null;
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/.exec(limpo);
  if (!m) return undefined;
  const [, h, min, s] = m;
  const minutos = Number(min);
  const segundos = Number(s);
  if (segundos > 59) return undefined;
  if (h !== undefined && minutos > 59) return undefined;
  const total = Number(h ?? 0) * 3600 + minutos * 60 + segundos;
  return total > 0 ? total : undefined;
}

/** 1690 → "28:10"; 3750 → "1:02:30". */
export function textoDaDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(min).padStart(2, "0")}:${ss}` : `${min}:${ss}`;
}

/** Para o leitor de tela: 1690 → "28 minutos e 10 segundos". */
export function duracaoPorExtenso(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const partes: string[] = [];
  if (h) partes.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (min) partes.push(`${min} ${min === 1 ? "minuto" : "minutos"}`);
  if (s) partes.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);
  if (partes.length <= 1) return partes[0] ?? "0 segundos";
  return `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}`;
}
