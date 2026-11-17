import { describe, expect, it } from "vitest";

import { alternarZoom, ehToqueDuplo, escalaDaPinca, limitarDeslocamento, limitarEscala, VISTA_INICIAL, zoomNoPonto } from "./zoom";

// A imagem ajustada à tela mede 400 × 300, numa área de 600 × 450 (sobra em volta).
const medidas = { imagem: { largura: 400, altura: 300 }, area: { largura: 600, altura: 450 } };

describe("limitarEscala", () => {
  it("fica entre 100% e 400%", () => {
    expect(limitarEscala(0.5)).toBe(1);
    expect(limitarEscala(2.25)).toBe(2.25);
    expect(limitarEscala(9)).toBe(4);
  });
});

describe("limitarDeslocamento: a imagem não sai da tela", () => {
  it("em 100% a imagem fica centrada", () => {
    expect(limitarDeslocamento({ escala: 1, x: 120, y: -80 }, medidas)).toEqual({ escala: 1, x: 0, y: 0 });
  });

  it("ampliada, anda só até a borda dela encostar na borda da tela", () => {
    // 400% → 1600 × 1200: passa 500 px de cada lado na largura e 375 px na altura.
    expect(limitarDeslocamento({ escala: 4, x: 1000, y: -1000 }, medidas)).toEqual({ escala: 4, x: 500, y: -375 });
    expect(limitarDeslocamento({ escala: 4, x: -150, y: 90 }, medidas)).toEqual({ escala: 4, x: -150, y: 90 });
  });

  it("ampliada, mas ainda menor que a tela num sentido: fica centrada nesse sentido", () => {
    // 150% → 600 × 450: cabe na área de 600 × 450 nos dois sentidos.
    expect(limitarDeslocamento({ escala: 1.5, x: 50, y: 50 }, medidas)).toEqual({ escala: 1.5, x: 0, y: 0 });
  });
});

describe("zoomNoPonto: o ponto sob o cursor ou entre os dedos fica parado", () => {
  it("no centro, só muda a escala", () => {
    expect(zoomNoPonto(VISTA_INICIAL, 2, { x: 0, y: 0 }, medidas)).toEqual({ escala: 2, x: 0, y: 0 });
  });

  it("perto da borda da imagem, a imagem anda para o ponto continuar no mesmo lugar", () => {
    // Ponto 100 px à direita e 50 px abaixo do centro: em 2× (800 × 600, folga de 100 e 75), a imagem anda −100 e −50.
    expect(zoomNoPonto(VISTA_INICIAL, 2, { x: 100, y: 50 }, medidas)).toEqual({ escala: 2, x: -100, y: -50 });
  });

  it("respeita os limites de escala e de deslocamento", () => {
    expect(zoomNoPonto(VISTA_INICIAL, 10, { x: 0, y: 0 }, medidas)).toEqual({ escala: 4, x: 0, y: 0 });
    expect(zoomNoPonto({ escala: 2, x: -100, y: -50 }, 0.5, { x: 100, y: 50 }, medidas)).toEqual(VISTA_INICIAL);
  });
});

describe("escalaDaPinca", () => {
  it("abre os dedos ao dobro da distância: dobra a escala de quando a pinça começou", () => {
    expect(escalaDaPinca(1.5, 100, 200)).toBe(3);
  });
  it("fecha os dedos: não fica menor que 100%", () => {
    expect(escalaDaPinca(1, 200, 50)).toBe(1);
  });
});

describe("alternarZoom (duplo clique e toque duplo)", () => {
  it("em 100%, vai a 200% no ponto tocado", () => {
    expect(alternarZoom(VISTA_INICIAL, { x: 100, y: 50 }, medidas)).toEqual({ escala: 2, x: -100, y: -50 });
  });
  it("ampliada, volta ao tamanho da tela", () => {
    expect(alternarZoom({ escala: 3, x: 40, y: 20 }, { x: 0, y: 0 }, medidas)).toEqual(VISTA_INICIAL);
  });
});

describe("ehToqueDuplo", () => {
  const primeiro = { tempo: 1000, x: 200, y: 300 };
  it("dois toques a menos de 300 ms e 30 px um do outro", () => {
    expect(ehToqueDuplo(primeiro, { tempo: 1250, x: 215, y: 310 })).toBe(true);
  });
  it("devagar demais, longe demais ou sem toque anterior: não é", () => {
    expect(ehToqueDuplo(primeiro, { tempo: 1350, x: 200, y: 300 })).toBe(false);
    expect(ehToqueDuplo(primeiro, { tempo: 1100, x: 260, y: 300 })).toBe(false);
    expect(ehToqueDuplo(null, { tempo: 1100, x: 200, y: 300 })).toBe(false);
  });
});
