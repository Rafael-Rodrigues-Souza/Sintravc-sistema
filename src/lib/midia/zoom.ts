/**
 * Cálculo do zoom do visualizador de imagem da Mídia (E53). Funções puras, testadas.
 *
 * A imagem aparece ajustada à tela e centrada; o zoom é um `transform: translate(x, y) scale(escala)`
 * com origem no centro. `x` e `y` são o deslocamento do centro da imagem em relação ao centro da área,
 * em px da tela, e os pontos (cursor, dedos) também são medidos a partir do centro da área.
 * Os limites são de interface (não são regra de negócio): não vão para o `Parametro`.
 */

export const ZOOM = {
  minimo: 1,
  maximo: 4,
  /** Cada toque em + ou − multiplica ou divide a escala por isto. */
  passo: 1.5,
  /** Escala do duplo clique e do toque duplo. */
  duplo: 2,
  /** Toque duplo: o segundo toque até este tempo (ms) e esta distância (px) do primeiro. */
  toqueDuplo: { tempo: 300, distancia: 30 },
} as const;

export type Vista = { escala: number; x: number; y: number };
export type Ponto = { x: number; y: number };
type Tamanho = { largura: number; altura: number };
/** `imagem`: o tamanho da imagem ajustada à tela, em 100%. `area`: o espaço onde ela aparece. */
export type Medidas = { imagem: Tamanho; area: Tamanho };

export const VISTA_INICIAL: Vista = { escala: 1, x: 0, y: 0 };

export function limitarEscala(escala: number): number {
  return Math.min(ZOOM.maximo, Math.max(ZOOM.minimo, escala));
}

/** Quanto a imagem pode andar para um lado: metade do que ela passa da área (0 se cabe). */
function folga(imagem: number, area: number, escala: number) {
  return Math.max(0, (imagem * escala - area) / 2);
}

const limitar = (valor: number, limite: number) => (limite === 0 ? 0 : Math.min(limite, Math.max(-limite, valor)));

/** A imagem nunca sai da tela: anda só até a borda dela encostar na borda da área. */
export function limitarDeslocamento(vista: Vista, { imagem, area }: Medidas): Vista {
  return {
    escala: vista.escala,
    x: limitar(vista.x, folga(imagem.largura, area.largura, vista.escala)),
    y: limitar(vista.y, folga(imagem.altura, area.altura, vista.escala)),
  };
}

/** Muda a escala mantendo parado o ponto da imagem que está sob `ponto` (o cursor ou o meio dos dedos). */
export function zoomNoPonto(vista: Vista, escala: number, ponto: Ponto, medidas: Medidas): Vista {
  const nova = limitarEscala(escala);
  const fator = nova / vista.escala;
  return limitarDeslocamento(
    { escala: nova, x: ponto.x - (ponto.x - vista.x) * fator, y: ponto.y - (ponto.y - vista.y) * fator },
    medidas,
  );
}

/** A escala durante a pinça: a de quando os dedos tocaram, na proporção da distância entre eles. */
export function escalaDaPinca(escalaInicial: number, distanciaInicial: number, distanciaAtual: number): number {
  return limitarEscala(escalaInicial * (distanciaAtual / distanciaInicial));
}

/** Duplo clique e toque duplo: em 100% vai a 200% no ponto; ampliada, volta ao tamanho da tela. */
export function alternarZoom(vista: Vista, ponto: Ponto, medidas: Medidas): Vista {
  return vista.escala > ZOOM.minimo ? VISTA_INICIAL : zoomNoPonto(vista, ZOOM.duplo, ponto, medidas);
}

type Toque = { tempo: number; x: number; y: number };

/** O segundo toque chegou rápido e perto o bastante do primeiro para ser um toque duplo? */
export function ehToqueDuplo(anterior: Toque | null, atual: Toque): boolean {
  if (!anterior) return false;
  return (
    atual.tempo - anterior.tempo <= ZOOM.toqueDuplo.tempo &&
    Math.hypot(atual.x - anterior.x, atual.y - anterior.y) <= ZOOM.toqueDuplo.distancia
  );
}
