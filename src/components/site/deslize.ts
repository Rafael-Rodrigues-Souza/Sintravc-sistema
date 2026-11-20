"use client";

import * as React from "react";

/** O dedo precisa andar pelo menos isto (px) de lado para contar como deslize. */
export const DESLIZE_MINIMO = 40;

type Ponto = { x: number; y: number };

/**
 * Para onde o dedo deslizou: 1 (para a esquerda: o próximo), -1 (para a direita: o anterior) ou 0
 * (pouco, ou mais na vertical que de lado: é rolagem ou toque, não deslize).
 */
export function passoDoDeslize(inicio: Ponto, fim: Ponto): -1 | 0 | 1 {
  const dx = fim.x - inicio.x;
  const dy = fim.y - inicio.y;
  if (Math.abs(dx) < DESLIZE_MINIMO || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * Deslize de lado com o dedo (E58). Só o toque conta: o mouse e a caneta continuam com as setas.
 * Quem usa põe `touch-pan-y` no elemento: o navegador cuida da rolagem vertical e só manda para cá o
 * movimento de lado (a rolagem vertical vira pointercancel, que não passa). O dedo que andou não gera
 * clique no navegador: o deslize sobre a mensagem não abre a janela.
 */
export function useDeslize(aoPassar: (passo: -1 | 1) => void) {
  const inicio = React.useRef<(Ponto & { id: number }) | null>(null);

  const ouvintes = {
    onPointerDown(evento: React.PointerEvent) {
      if (evento.pointerType !== "touch" || !evento.isPrimary) return;
      inicio.current = { id: evento.pointerId, x: evento.clientX, y: evento.clientY };
    },
    onPointerUp(evento: React.PointerEvent) {
      const comeco = inicio.current;
      inicio.current = null;
      if (!comeco || comeco.id !== evento.pointerId) return;
      const passo = passoDoDeslize(comeco, { x: evento.clientX, y: evento.clientY });
      if (passo === 0) return;
      aoPassar(passo);
    },
    onPointerCancel() {
      inicio.current = null;
    },
  };

  return ouvintes;
}
