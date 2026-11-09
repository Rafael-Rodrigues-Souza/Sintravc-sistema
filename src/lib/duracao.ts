/** Durações do Parametro em texto para a tela e os e-mails. */

const UNIDADES = [
  { segundos: 3600, singular: "hora", plural: "horas" },
  { segundos: 60, singular: "minuto", plural: "minutos" },
  { segundos: 1, singular: "segundo", plural: "segundos" },
] as const;

/**
 * "1 minuto", "2 horas", "30 segundos". Usa a maior unidade que divide o valor sem sobra:
 * 5400 vira "90 minutos" e 90 vira "90 segundos".
 */
export function duracaoPorExtenso(segundos: number): string {
  const unidade = UNIDADES.find((u) => segundos % u.segundos === 0) ?? UNIDADES[2];
  const quantidade = segundos / unidade.segundos;
  return `${quantidade} ${quantidade === 1 ? unidade.singular : unidade.plural}`;
}
