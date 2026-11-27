/**
 * A altura da seção do carrossel da Home (E63), em px: medidas de layout, não regra (ficam no código,
 * como no E62). A seção vai do fim do topo até `sobra` antes do fim da janela, entre `minimo` e
 * `maximo`; antes de o navegador medir o topo, vale a `reservaDoTopo`. O componente e o e2e leem daqui.
 */
export const ALTURA_DO_CARROSSEL = { minimo: 520, maximo: 960, sobra: 88, reservaDoTopo: 150 } as const;

/** O `min-height` da seção, com o topo medido (ou a reserva, antes de medir). */
export function alturaMinimaDoCarrossel(topo: number | null): string {
  const { minimo, maximo, sobra, reservaDoTopo } = ALTURA_DO_CARROSSEL;
  return `clamp(${minimo}px, calc(100svh - ${topo ?? reservaDoTopo}px - ${sobra}px), ${maximo}px)`;
}
