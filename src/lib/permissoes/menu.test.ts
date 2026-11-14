import { describe, expect, it } from "vitest";

import { areaDoCaminho, itensDoMenu, menuDoCelular, telaComBarraPropria, type GrupoDoMenu } from "./menu";
import type { Quem } from ".";

const adm: Quem = { tipo: "equipe", id: "adm-1", perfil: "ADM" };
const com: Quem = { tipo: "equipe", id: "com-1", perfil: "COM" };

/** Só os títulos e rótulos, para comparar com o Figma. */
function resumo(quem: Quem) {
  return itensDoMenu(quem).map((grupo) => [grupo.titulo, grupo.itens.map((i) => i.rotulo)]);
}

describe("itensDoMenu (RN06, RF31)", () => {
  it("Comunicação: o menu da tela 403 do Figma (293:42423)", () => {
    expect(resumo(com)).toEqual([
      [null, ["Visão geral"]],
      ["Publicações", ["Conteúdos", "Comunicados", "Rádio Chofer"]],
      ["Site", ["Página inicial", "Mídia"]],
    ]);
  });

  it("Administrador geral: o menu da Navegação do Figma (107:715), sem Atendimento na Fase 1", () => {
    expect(resumo(adm)).toEqual([
      [null, ["Visão geral"]],
      ["Publicações", ["Conteúdos", "Comunicados", "Rádio Chofer"]],
      ["Site", ["Página inicial", "Benefícios", "Mídia"]],
      ["Administração", ["Atividade", "Equipe e perfis", "Configurações"]],
    ]);
  });

  it("cada item leva ao endereço da área", () => {
    const enderecos = itensDoMenu(adm).flatMap((g) => g.itens.map((i) => i.href));
    expect(enderecos).toEqual([
      "/painel",
      "/painel/conteudos",
      "/painel/comunicados",
      "/painel/radio",
      "/painel/pagina-inicial",
      "/painel/beneficios",
      "/painel/midia",
      "/painel/atividade",
      "/painel/equipe",
      "/painel/configuracoes",
    ]);
  });

  it("quem não é da equipe não tem menu", () => {
    expect(itensDoMenu({ tipo: "visitante" })).toEqual([]);
  });
});

describe("areaDoCaminho", () => {
  it.each([
    ["/painel", "Visão geral"],
    ["/painel/equipe", "Equipe e perfis"],
    ["/painel/conteudos/noticias/42/editar", "Conteúdos"],
    ["/painel/pagina-inicial", "Página inicial"],
  ])("%s → %s", (caminho, rotulo) => {
    expect(areaDoCaminho(caminho)?.rotulo).toBe(rotulo);
  });

  it("fora do painel, nenhuma área", () => {
    expect(areaDoCaminho("/noticias")).toBeUndefined();
  });
});

describe("menuDoCelular (E49; Figma M 119:3528)", () => {
  const rotulos = (grupos: GrupoDoMenu[]) => grupos.map((g) => [g.titulo, g.itens.map((i) => i.rotulo)]);

  it("Comunicação: Início, Conteúdos e Comunicados na barra; o resto no “Mais”, com os grupos", () => {
    const { barra, mais } = menuDoCelular(itensDoMenu(com));
    expect(barra.map((i) => [i.rotulo, i.href])).toEqual([
      ["Início", "/painel"],
      ["Conteúdos", "/painel/conteudos"],
      ["Comunicados", "/painel/comunicados"],
    ]);
    expect(rotulos(mais)).toEqual([
      ["Publicações", ["Rádio Chofer"]],
      ["Site", ["Página inicial", "Mídia"]],
    ]);
  });

  it("Administrador geral: a Administração também vai para o “Mais”", () => {
    expect(rotulos(menuDoCelular(itensDoMenu(adm)).mais)).toEqual([
      ["Publicações", ["Rádio Chofer"]],
      ["Site", ["Página inicial", "Benefícios", "Mídia"]],
      ["Administração", ["Atividade", "Equipe e perfis", "Configurações"]],
    ]);
  });

  it("a barra só tem o que veio de itensDoMenu: sem Comunicados no menu, sem Comunicados na barra", () => {
    const semComunicados = itensDoMenu(com).map((g) => ({ ...g, itens: g.itens.filter((i) => i.area !== "comunicados") }));
    expect(menuDoCelular(semComunicados).barra.map((i) => i.rotulo)).toEqual(["Início", "Conteúdos"]);
  });

  it("sem menu, nada na barra nem no “Mais”", () => {
    expect(menuDoCelular([])).toEqual({ barra: [], mais: [] });
  });
});

describe("telaComBarraPropria (E49)", () => {
  it.each([
    ["/painel/conteudos/noticia/nova", true],
    ["/painel/conteudos/noticia/0193b1c2-aaaa-7bbb-8ccc-1234567890ab", true],
    ["/painel/conteudos/documento/nova", true],
    ["/painel/conteudos/documento/0193b1c2-aaaa-7bbb-8ccc-1234567890ab", true],
    ["/painel", false],
    ["/painel/conteudos", false],
    ["/painel/midia", false],
  ])("%s → %s", (caminho, esperado) => {
    expect(telaComBarraPropria(caminho)).toBe(esperado);
  });
});
