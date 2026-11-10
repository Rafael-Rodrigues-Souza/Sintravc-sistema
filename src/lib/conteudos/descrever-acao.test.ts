import { describe, expect, it } from "vitest";

import { descreverAcao } from "./descrever-acao";

describe("descreverAcao: as Últimas ações da Edição rápida (Figma 115:2324)", () => {
  it("agendar e reagendar dizem a data, no horário da Bahia", () => {
    expect(descreverAcao("noticia.agendar", { para: "2026-10-28T19:00:00.000Z" })).toBe("Agendado para 28/10/2026 às 16h00");
    expect(descreverAcao("noticia.reagendar", { de: "2026-10-28T19:00:00.000Z", para: "2026-10-29T11:00:00.000Z" })).toBe(
      "Reagendado para 29/10/2026 às 08h00",
    );
  });

  it("as outras ações têm frase própria", () => {
    expect(descreverAcao("noticia.criar", {})).toBe("Rascunho criado");
    expect(descreverAcao("noticia.editar", {})).toBe("Texto editado");
    expect(descreverAcao("noticia.publicar", { versao: 1 })).toBe("Publicado");
    expect(descreverAcao("noticia.publicar_agendado", {})).toBe("Publicado na hora agendada");
    expect(descreverAcao("noticia.agendamento_falhou", {})).toBe("A publicação agendada falhou");
    expect(descreverAcao("noticia.cancelar_agendamento", {})).toBe("Agendamento cancelado");
  });

  it("ação desconhecida não quebra a tela", () => {
    expect(descreverAcao("noticia.algo_novo", {})).toBe("Alteração registrada");
  });
});
