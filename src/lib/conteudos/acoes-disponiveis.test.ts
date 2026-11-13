import { describe, expect, it } from "vitest";

import type { QuemDaEquipe } from "@/lib/permissoes";

import { acoesDisponiveis } from "./acoes-disponiveis";

const autora: QuemDaEquipe = { tipo: "equipe", id: "autora", perfil: "COM" };
const colega: QuemDaEquipe = { tipo: "equipe", id: "colega", perfil: "COM" };
const adm: QuemDaEquipe = { tipo: "equipe", id: "adm", perfil: "ADM" };
const atd: QuemDaEquipe = { tipo: "equipe", id: "atd", perfil: "ATD" };

const rascunhoNovo = { estado: "rascunho" as const, jaPublicado: false, autorId: "autora" };

describe("acoesDisponiveis: o menu de ações de cada conteúdo (RN10, RN54)", () => {
  it("publicado: só ocultar e arquivar (CA-US22.4)", () => {
    expect(acoesDisponiveis({ estado: "publicado", jaPublicado: true, autorId: "autora" }, autora)).toEqual(["ocultar", "arquivar"]);
  });

  it("oculto: mostrar no site e arquivar", () => {
    expect(acoesDisponiveis({ estado: "oculto", jaPublicado: true, autorId: "autora" }, colega)).toEqual(["mostrar", "arquivar"]);
  });

  it("arquivado: só restaurar como rascunho", () => {
    expect(acoesDisponiveis({ estado: "arquivado", jaPublicado: true, autorId: "autora" }, adm)).toEqual(["restaurar"]);
  });

  it("rascunho nunca publicado: a autora vê Excluir; a colega da Comunicação não; o ADM vê (CA-US22.3, CA-US22.5)", () => {
    expect(acoesDisponiveis(rascunhoNovo, autora)).toEqual(["arquivar", "excluir"]);
    expect(acoesDisponiveis(rascunhoNovo, colega)).toEqual(["arquivar"]);
    expect(acoesDisponiveis(rascunhoNovo, adm)).toEqual(["arquivar", "excluir"]);
  });

  it("rascunho que já foi ao ar e agendado não se excluem (RN54)", () => {
    expect(acoesDisponiveis({ ...rascunhoNovo, jaPublicado: true }, autora)).toEqual(["arquivar"]);
    expect(acoesDisponiveis({ ...rascunhoNovo, estado: "agendado" }, autora)).toEqual(["arquivar"]);
  });

  it("quem não mexe em notícia não vê nada", () => {
    expect(acoesDisponiveis({ estado: "publicado", jaPublicado: true, autorId: "autora" }, atd)).toEqual([]);
  });

  it("documento oficial: o ADM tem o mesmo menu; a Comunicação não tem ações (RN08, CA-US23.2)", () => {
    const publicado = { tipo: "edital" as const, estado: "publicado" as const, jaPublicado: true, autorId: "adm" };
    expect(acoesDisponiveis(publicado, adm)).toEqual(["ocultar", "arquivar"]);
    expect(acoesDisponiveis(publicado, colega)).toEqual([]);
    expect(acoesDisponiveis({ ...publicado, estado: "rascunho", jaPublicado: false }, adm)).toEqual(["arquivar", "excluir"]);
    expect(acoesDisponiveis({ ...publicado, estado: "rascunho", jaPublicado: false }, colega)).toEqual([]);
  });
});
