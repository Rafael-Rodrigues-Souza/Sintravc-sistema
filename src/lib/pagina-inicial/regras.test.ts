import { describe, expect, it } from "vitest";

import {
  alteracoesNaoPublicadas,
  chaveDoItem,
  conferirDados,
  esquemaDadosDaHome,
  estadoDoItem,
  montarHome,
  DESTINOS,
  erroDaChamada,
  paraONavegador,
  rotuloDaChamada,
  textoDoBotao,
  type DadosDaHome,
  type ItemDoCarrossel,
} from "./regras";

const AGORA = new Date("2026-11-25T15:00:00Z");
const antes = (horas: number) => new Date(AGORA.getTime() - horas * 3_600_000);
const depois = (horas: number) => new Date(AGORA.getTime() + horas * 3_600_000);

const ID = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`;
const noticia = (n: number, mais: Partial<ItemDoCarrossel> = {}): ItemDoCarrossel => ({
  tipo: "noticia",
  itemId: ID(n),
  entraEm: null,
  saiEm: null,
  fraseChamada: null,
  chamada: null,
  ...mais,
});
const programa: ItemDoCarrossel = { tipo: "programa", itemId: null, entraEm: null, saiEm: null, fraseChamada: null, chamada: null };
const FOTO = "00000000-0000-7000-8000-00000000f070";
/** Uma Chamada (E63): foto da Mídia, frase, apoio, botão (vazio = padrão do destino) e destino. */
const chamada = (n: number, mais: Partial<NonNullable<ItemDoCarrossel["chamada"]>> = {}, frase = "Junto, o rodoviário pesa mais."): ItemDoCarrossel => ({
  tipo: "chamada",
  itemId: ID(n),
  entraEm: null,
  saiEm: null,
  fraseChamada: frase,
  chamada: { fotoMidiaId: FOTO, fotoAlt: "Motorista ao volante", textoApoio: "Faça parte do sindicato.", botaoTexto: null, destino: "filie_se", ...mais },
});
const LIMITES = { carrosselMaximo: 5, fraseChamadaMaximo: 90, chamadaFraseMaximo: 70, chamadaApoioMaximo: 160, chamadaBotaoMaximo: 24 };

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
  const publicado: DadosDaHome = { carrossel: [programa, noticia(1)] };

  it("igual ao publicado não tem alteração", () => {
    expect(alteracoesNaoPublicadas(structuredClone(publicado), publicado)).toBe(0);
  });
  it("trocar a ordem de dois itens conta as duas posições", () => {
    expect(alteracoesNaoPublicadas({ ...publicado, carrossel: [noticia(1), programa] }, publicado)).toBe(2);
  });
  it("mudar a data de saída e pôr um item contam", () => {
    const rascunho: DadosDaHome = { carrossel: [programa, noticia(1, { saiEm: depois(5) }), noticia(2)] };
    expect(alteracoesNaoPublicadas(rascunho, publicado)).toBe(2);
  });
});

describe("conferirDados", () => {
  it("recusa mais itens que o carrossel aceita", () => {
    const seis = [1, 2, 3, 4, 5, 6].map((n) => noticia(n));
    expect(() => conferirDados({ carrossel: seis }, LIMITES)).toThrow("O carrossel aceita até 5 destaques");
  });
  it("recusa o mesmo item duas vezes no carrossel", () => {
    expect(() => conferirDados({ carrossel: [noticia(1), noticia(1)] }, LIMITES)).toThrow("já está no carrossel");
  });
  it("recusa saída antes ou igual à entrada", () => {
    expect(() => conferirDados({ carrossel: [noticia(1, { entraEm: depois(2), saiEm: depois(2) })] }, LIMITES)).toThrow(
      "A saída tem de ser depois da entrada.",
    );
  });
  it("aceita o carrossel cheio", () => {
    expect(() => conferirDados({ carrossel: [programa, noticia(1), noticia(2), noticia(3), chamada(4)] }, LIMITES)).not.toThrow();
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
          { tipo: "episodio", itemId: ID(70), entraEm: null, saiEm: null, fraseChamada: null, chamada: null },
          programa,
        ],
      },
      noticias: mapa(comCapa(1), comCapa(2), comCapa(3), semCapa(5)), // a 4 saiu do ar
      episodios: new Map([[ID(70), { id: ID(70) }]]),
      agora: AGORA,
    });
    expect(slides.map((s) => (s.tipo === "noticia" ? s.noticia.id : s.tipo === "episodio" ? s.episodio.id : "programa"))).toEqual([ID(2), ID(70), "programa"]);
  });

  it("sem nenhum item válido, mostra o slide do programa", () => {
    const { slides } = montarHome({
      publicado: { carrossel: [noticia(1, { saiEm: antes(1) })] },
      noticias: mapa(comCapa(1)),
      episodios: new Map(),
      agora: AGORA,
    });
    expect(slides).toEqual([{ tipo: "programa", frase: null }]);
  });
});

describe("o pedido do painel", () => {
  it("vai e volta do navegador sem perder as datas", () => {
    const dados: DadosDaHome = { carrossel: [programa, noticia(1, { entraEm: depois(1), saiEm: depois(48) }), chamada(2, { botaoTexto: "Quero me filiar" })] };
    expect(esquemaDadosDaHome.parse(paraONavegador(dados))).toEqual(dados);
  });
  it("a chave do item não depende do id da linha", () => {
    expect(chaveDoItem(noticia(1))).toBe(`noticia:${ID(1)}`);
    expect(chaveDoItem(programa)).toBe("programa:programa");
  });
});

describe("frase de chamada (E62, #75)", () => {
  it("mudar a frase conta como alteração; igual não", () => {
    const publicado: DadosDaHome = { carrossel: [noticia(1, { fraseChamada: "Venha para a assembleia" })] };
    expect(alteracoesNaoPublicadas(structuredClone(publicado), publicado)).toBe(0);
    expect(alteracoesNaoPublicadas({ ...publicado, carrossel: [noticia(1)] }, publicado)).toBe(1);
  });

  it("recusa frase maior que `home.frase_chamada_maximo`", () => {
    const longa = "a".repeat(91);
    expect(() => conferirDados({ carrossel: [noticia(1, { fraseChamada: longa })] }, LIMITES)).toThrow(
      "A frase de chamada tem até 90 caracteres.",
    );
    expect(() => conferirDados({ carrossel: [noticia(1, { fraseChamada: "a".repeat(90) })] }, LIMITES)).not.toThrow();
  });

  it("o pedido do painel tira os espaços sobrando; vazia vira null", () => {
    const lido = esquemaDadosDaHome.parse({
      carrossel: [
        { tipo: "programa", itemId: null, entraEm: null, saiEm: null, fraseChamada: "  Ouça   hoje às 13h  " },
        { tipo: "noticia", itemId: ID(1), entraEm: null, saiEm: null, fraseChamada: "   " },
      ],
    });
    expect(lido.carrossel.map((i) => i.fraseChamada)).toEqual(["Ouça hoje às 13h", null]);
  });

  it("o slide leva a frase do item; sem frase, null (o site mostra a linha fina)", () => {
    const { slides } = montarHome({
      publicado: { carrossel: [noticia(1, { fraseChamada: "Sua voz na campanha salarial" }), noticia(2)] },
      noticias: new Map([
        [ID(1), { id: ID(1), capa: { url: "/a.jpg" } }],
        [ID(2), { id: ID(2), capa: { url: "/b.jpg" } }],
      ]),
      episodios: new Map(),
      agora: AGORA,
    });
    expect(slides.map((s) => s.frase)).toEqual(["Sua voz na campanha salarial", null]);
  });
});

describe("Chamada (E63, #75)", () => {
  it("vira slide com a foto, os textos e o destino, seguindo as datas como os outros itens", () => {
    const { slides } = montarHome({
      publicado: { carrossel: [chamada(1), { ...chamada(2, {}, "Fora das datas"), entraEm: depois(1) }, programa] },
      noticias: new Map(),
      episodios: new Map(),
      agora: AGORA,
    });
    expect(slides).toEqual([
      {
        tipo: "chamada",
        frase: "Junto, o rodoviário pesa mais.",
        chamada: { itemId: ID(1), fotoMidiaId: FOTO, fotoAlt: "Motorista ao volante", textoApoio: "Faça parte do sindicato.", botaoTexto: null, destino: "filie_se" },
      },
      { tipo: "programa", frase: null },
    ]);
  });

  it("recusa frase, apoio e botão acima dos limites da Parametro, e aceita no limite", () => {
    const conferir = (item: ItemDoCarrossel) => () => conferirDados({ carrossel: [item] }, LIMITES);
    expect(conferir(chamada(1, {}, "a".repeat(71)))).toThrow("A frase da Chamada tem até 70 caracteres.");
    expect(conferir(chamada(1, { textoApoio: "a".repeat(161) }))).toThrow("O texto de apoio tem até 160 caracteres.");
    expect(conferir(chamada(1, { botaoTexto: "a".repeat(25) }))).toThrow("O texto do botão tem até 24 caracteres.");
    expect(conferir(chamada(1, { textoApoio: "a".repeat(160), botaoTexto: "a".repeat(24) }, "a".repeat(70)))).not.toThrow();
  });

  it("exige foto, texto alternativo, frase e texto de apoio", () => {
    const conferir = (item: ItemDoCarrossel) => () => conferirDados({ carrossel: [item] }, LIMITES);
    expect(conferir(chamada(1, { fotoAlt: "  " }))).toThrow("Descreva a foto no texto alternativo.");
    expect(conferir(chamada(1, { textoApoio: "" }))).toThrow("Escreva o texto de apoio.");
    expect(conferir({ ...chamada(1), fraseChamada: null })).toThrow("Escreva a frase da Chamada.");
    expect(conferir({ ...chamada(1), chamada: null })).toThrow("Destaque inválido.");
    // Os outros tipos não levam campos de Chamada.
    expect(conferir({ ...noticia(1), chamada: chamada(1).chamada })).toThrow("Destaque inválido.");
  });

  it("o destino é só da lista fechada; texto do botão vazio vira o padrão (null)", () => {
    const base = paraONavegador({ carrossel: [chamada(1)] }).carrossel[0]!;
    const comChamada = (mais: Record<string, unknown>) => ({ carrossel: [{ ...base, chamada: { ...base.chamada!, ...mais } }] });
    expect(esquemaDadosDaHome.safeParse(comChamada({ destino: "https://golpe.example" })).success).toBe(false);
    expect(esquemaDadosDaHome.safeParse(comChamada({ destino: "beneficios" })).success).toBe(true);
    expect(esquemaDadosDaHome.parse(comChamada({ botaoTexto: "   " })).carrossel[0]!.chamada!.botaoTexto).toBeNull();
  });

  it("mudar qualquer campo da Chamada conta como alteração", () => {
    const publicado: DadosDaHome = { carrossel: [chamada(1)] };
    expect(alteracoesNaoPublicadas(structuredClone(publicado), publicado)).toBe(0);
    expect(alteracoesNaoPublicadas({ carrossel: [chamada(1, { destino: "beneficios" })] }, publicado)).toBe(1);
    expect(alteracoesNaoPublicadas({ carrossel: [chamada(1, { fotoAlt: "Outra descrição" })] }, publicado)).toBe(1);
  });

  it("erroDaChamada é a mesma regra da janela e do servidor: sem foto, pede a foto antes de tudo", () => {
    const sem = { frase: "", fotoMidiaId: null, fotoAlt: "", textoApoio: "", botaoTexto: null, destino: "filie_se" as const };
    expect(erroDaChamada(sem, LIMITES)).toEqual({ campo: "foto", mensagem: "Escolha a foto da Chamada." });
    expect(erroDaChamada({ ...sem, fotoMidiaId: FOTO }, LIMITES)?.campo).toBe("fotoAlt");
    expect(erroDaChamada({ frase: "Frase", fotoMidiaId: FOTO, fotoAlt: "Alt", textoApoio: "Apoio", botaoTexto: null, destino: "beneficios" }, LIMITES)).toBeNull();
  });

  it("cada destino tem nome, rótulo curto, botão padrão e endereço num mapa só", () => {
    expect(rotuloDaChamada("filie_se")).toBe("Chamada · Filie-se");
    expect(rotuloDaChamada("beneficios")).toBe("Chamada · Benefícios");
    expect(DESTINOS.filie_se.endereco({ linkFiliacao: "https://wa.me/5577" })).toBe("https://wa.me/5577");
    expect(DESTINOS.beneficios.endereco({ linkFiliacao: "x" })).toBe("/sindicato/beneficios");
    expect([DESTINOS.filie_se.externo, DESTINOS.beneficios.externo]).toEqual([true, false]);
  });

  it("textoDoBotao usa o padrão do destino quando o botão está vazio", () => {
    expect(textoDoBotao({ botaoTexto: null, destino: "filie_se" })).toBe("Filie-se");
    expect(textoDoBotao({ botaoTexto: null, destino: "beneficios" })).toBe("Ver benefícios");
    expect(textoDoBotao({ botaoTexto: "Quero me filiar", destino: "filie_se" })).toBe("Quero me filiar");
  });
});
