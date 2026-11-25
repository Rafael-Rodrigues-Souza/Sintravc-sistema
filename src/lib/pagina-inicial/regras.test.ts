import { describe, expect, it } from "vitest";

import {
  alteracoesNaoPublicadas,
  chaveDoItem,
  conferirDados,
  esquemaDadosDaHome,
  estadoDoItem,
  montarHome,
  paraONavegador,
  type DadosDaHome,
  type ItemDoCarrossel,
} from "./regras";

const AGORA = new Date("2026-11-25T15:00:00Z");
const antes = (horas: number) => new Date(AGORA.getTime() - horas * 3_600_000);
const depois = (horas: number) => new Date(AGORA.getTime() + horas * 3_600_000);

const ID = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`;
const noticia = (n: number, mais: Partial<ItemDoCarrossel> = {}): ItemDoCarrossel => ({ tipo: "noticia", itemId: ID(n), entraEm: null, saiEm: null, ...mais });
const programa: ItemDoCarrossel = { tipo: "programa", itemId: null, entraEm: null, saiEm: null };
const LIMITES = { carrosselMaximo: 5, listaPosicoes: 3 };

describe("estadoDoItem: o carrossel segue o relógio (E62)", () => {
  it("sem datas, está no ar sem data de saída", () => {
    expect(estadoDoItem({ entraEm: null, saiEm: null }, AGORA)).toEqual({ tipo: "no_ar", saiEm: null });
  });
  it("com a entrada no futuro, está agendado", () => {
    expect(estadoDoItem({ entraEm: depois(2), saiEm: null }, AGORA)).toEqual({ tipo: "agendado", entraEm: depois(2) });
  });
  it("entra exatamente na hora e sai exatamente na hora (entra_em ≤ agora < sai_em)", () => {
    expect(estadoDoItem({ entraEm: AGORA, saiEm: depois(1) }, AGORA).tipo).toBe("no_ar");
    expect(estadoDoItem({ entraEm: antes(1), saiEm: AGORA }, AGORA)).toEqual({ tipo: "saiu", saiEm: AGORA });
  });
});

describe("alteracoesNaoPublicadas: compara o conteúdo, não as gravações", () => {
  const publicado: DadosDaHome = { carrossel: [programa, noticia(1)], lista: [null, { noticiaId: ID(9) }, null] };

  it("igual ao publicado não tem alteração", () => {
    expect(alteracoesNaoPublicadas(structuredClone(publicado), publicado)).toBe(0);
  });
  it("trocar a ordem de dois itens conta as duas posições", () => {
    expect(alteracoesNaoPublicadas({ ...publicado, carrossel: [noticia(1), programa] }, publicado)).toBe(2);
  });
  it("mudar a data de saída, pôr um item e escolher uma posição da lista contam", () => {
    const rascunho: DadosDaHome = {
      carrossel: [programa, noticia(1, { saiEm: depois(5) }), noticia(2)],
      lista: [{ noticiaId: ID(8) }, { noticiaId: ID(9) }, null],
    };
    expect(alteracoesNaoPublicadas(rascunho, publicado)).toBe(3);
  });
});

describe("conferirDados", () => {
  it("recusa mais itens que o carrossel aceita", () => {
    const seis = [1, 2, 3, 4, 5, 6].map((n) => noticia(n));
    expect(() => conferirDados({ carrossel: seis, lista: [] }, LIMITES)).toThrow("O carrossel aceita até 5 destaques");
  });
  it("recusa o mesmo item duas vezes no carrossel e a mesma notícia duas vezes na lista", () => {
    expect(() => conferirDados({ carrossel: [noticia(1), noticia(1)], lista: [] }, LIMITES)).toThrow("já está no carrossel");
    expect(() => conferirDados({ carrossel: [], lista: [{ noticiaId: ID(1) }, { noticiaId: ID(1) }] }, LIMITES)).toThrow("já está na lista");
  });
  it("recusa saída antes ou igual à entrada", () => {
    expect(() => conferirDados({ carrossel: [noticia(1, { entraEm: depois(2), saiEm: depois(2) })], lista: [] }, LIMITES)).toThrow(
      "A saída tem de ser depois da entrada.",
    );
  });
  it("aceita o carrossel cheio e a lista com automáticas", () => {
    expect(() => conferirDados({ carrossel: [programa, noticia(1), noticia(2), noticia(3), noticia(4)], lista: [null, null, null] }, LIMITES)).not.toThrow();
  });
});

describe("montarHome: o que o site mostra (E62)", () => {
  type N = { id: string; capa: { url: string } | null };
  const comCapa = (n: number): N => ({ id: ID(n), capa: { url: `/capa-${n}.jpg` } });
  const semCapa = (n: number): N => ({ id: ID(n), capa: null });
  const mapa = (...ns: N[]) => new Map(ns.map((n) => [n.id, n]));

  it("o carrossel segue a ordem do publicado e pula o que está fora das datas, fora do ar ou sem capa", () => {
    const { slides } = montarHome({
      publicado: {
        carrossel: [
          noticia(2),
          noticia(1, { entraEm: depois(1) }),
          noticia(3, { saiEm: antes(1) }),
          noticia(4),
          noticia(5),
          { tipo: "episodio", itemId: ID(70), entraEm: null, saiEm: null },
          programa,
        ],
        lista: [],
      },
      noticias: mapa(comCapa(1), comCapa(2), comCapa(3), semCapa(5)), // a 4 saiu do ar
      episodios: new Map([[ID(70), { id: ID(70) }]]),
      recentes: [],
      listaPosicoes: 3,
      agora: AGORA,
    });
    expect(slides.map((s) => (s.tipo === "noticia" ? s.noticia.id : s.tipo === "episodio" ? s.episodio.id : "programa"))).toEqual([ID(2), ID(70), "programa"]);
  });

  it("sem nenhum item válido, mostra o slide do programa", () => {
    const { slides } = montarHome({
      publicado: { carrossel: [noticia(1, { saiEm: antes(1) })], lista: [] },
      noticias: mapa(comCapa(1)),
      episodios: new Map(),
      recentes: [],
      listaPosicoes: 3,
      agora: AGORA,
    });
    expect(slides).toEqual([{ tipo: "programa" }]);
  });

  it("a lista mostra as escolhidas na posição e completa com as recentes, sem repetir o carrossel nem as escolhidas", () => {
    const { lista } = montarHome({
      publicado: { carrossel: [noticia(10)], lista: [null, { noticiaId: ID(20) }, null] },
      noticias: mapa(comCapa(10), comCapa(20)),
      episodios: new Map(),
      recentes: [comCapa(10), comCapa(20), comCapa(30), comCapa(40), comCapa(50)],
      listaPosicoes: 3,
      agora: AGORA,
    });
    expect(lista.map((n) => n.id)).toEqual([ID(30), ID(20), ID(40)]);
  });

  it("a escolhida que saiu do ar é trocada por uma automática", () => {
    const { lista } = montarHome({
      publicado: { carrossel: [], lista: [{ noticiaId: ID(99) }, null, null] },
      noticias: new Map(),
      episodios: new Map(),
      recentes: [comCapa(1), comCapa(2), comCapa(3)],
      listaPosicoes: 3,
      agora: AGORA,
    });
    expect(lista.map((n) => n.id)).toEqual([ID(1), ID(2), ID(3)]);
  });

  it("com poucas notícias no ar, a lista fica menor (sem buraco)", () => {
    const { lista } = montarHome({
      publicado: { carrossel: [], lista: [null, null, null] },
      noticias: new Map(),
      episodios: new Map(),
      recentes: [semCapa(1)],
      listaPosicoes: 3,
      agora: AGORA,
    });
    expect(lista.map((n) => n.id)).toEqual([ID(1)]);
  });
});

describe("o pedido do painel", () => {
  it("vai e volta do navegador sem perder as datas", () => {
    const dados: DadosDaHome = { carrossel: [programa, noticia(1, { entraEm: depois(1), saiEm: depois(48) })], lista: [null, { noticiaId: ID(2) }, null] };
    expect(esquemaDadosDaHome.parse(paraONavegador(dados))).toEqual(dados);
  });
  it("a chave do item não depende do id da linha", () => {
    expect(chaveDoItem(noticia(1))).toBe(`noticia:${ID(1)}`);
    expect(chaveDoItem(programa)).toBe("programa:programa");
  });
});
