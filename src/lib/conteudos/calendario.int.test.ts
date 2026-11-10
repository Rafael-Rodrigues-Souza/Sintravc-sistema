import { describe, expect, it } from "vitest";

import { SemPermissao } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { pessoaDaEquipe } from "@/testes/equipe";
import { noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { agendarNoticia } from "./agendar";
import { itensDoCalendario, rascunhosSemData } from "./calendario";
import { executarPublicacaoAgendada } from "./publicar-agendado";

// Um mês longe dos outros testes, que dividem o mesmo banco.
const ANTES = new Date("2031-01-01T12:00:00Z");

async function agendadaPara(titulo: string, para: Date) {
  const quem = await pessoaDaEquipe("COM");
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta({ titulo }));
  await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila: filaEmMemoria().fila, agora: ANTES });
  return id;
}

describe("itensDoCalendario (RF36, Figma 115:2992)", () => {
  it("mostra publicados pela data em que foram ao ar e agendados pela data marcada, no dia da Bahia", async () => {
    const publicadaId = await agendadaPara("Publicada em março", new Date("2031-03-10T13:00:00Z"));
    await executarPublicacaoAgendada({ conteudoId: publicadaId, para: "2031-03-10T13:00:00.000Z" }, { agora: new Date("2031-03-10T13:00:00Z") });
    const agendadaId = await agendadaPara("Agendada para a noite", new Date("2031-03-21T02:30:00Z")); // 20/03 às 23h30 na Bahia
    const foraDoMes = await agendadaPara("Agendada para maio", new Date("2031-05-05T12:00:00Z"));
    const quem = await pessoaDaEquipe("COM");

    const { dias } = await itensDoCalendario({ ano: 2031, mes: 3 }, { quem });

    expect(dias["2031-03-10"]).toEqual([
      expect.objectContaining({ id: publicadaId, titulo: "Publicada em março", estado: "publicado", tipo: "noticia", quando: new Date("2031-03-10T13:00:00Z") }),
    ]);
    expect(dias["2031-03-20"]).toEqual([expect.objectContaining({ id: agendadaId, estado: "agendado", revisao: expect.any(Number) })]);
    expect(Object.values(dias).flat().map((i) => i.id)).not.toContain(foraDoMes);
  });

  it("os dias de fora do mês que aparecem na grade também trazem os itens", async () => {
    const id = await agendadaPara("No comecinho de abril", new Date("2031-04-02T12:00:00Z"));
    const quem = await pessoaDaEquipe("COM");

    // A grade de março de 2031 vai até o sábado 05/04.
    const { dias } = await itensDoCalendario({ ano: 2031, mes: 3 }, { quem });

    expect(dias["2031-04-02"]?.map((i) => i.id)).toContain(id);
  });

  it("filtra por tipo, e o mesmo dia ordena pela hora", async () => {
    const tarde = await agendadaPara("À tarde", new Date("2031-03-25T18:00:00Z"));
    const manha = await agendadaPara("De manhã", new Date("2031-03-25T11:00:00Z"));
    const quem = await pessoaDaEquipe("COM");

    const noticias = await itensDoCalendario({ ano: 2031, mes: 3, tipo: "noticia" }, { quem });
    const editais = await itensDoCalendario({ ano: 2031, mes: 3, tipo: "edital" }, { quem });

    expect(noticias.dias["2031-03-25"]!.map((i) => i.id)).toEqual([manha, tarde]);
    expect(editais.dias["2031-03-25"]).toBeUndefined();
  });

  it("Atendimento não vê o calendário (RNF01)", async () => {
    await expect(itensDoCalendario({ ano: 2031, mes: 3 }, { quem: await pessoaDaEquipe("ATD") })).rejects.toBeInstanceOf(SemPermissao);
  });
});

describe("rascunhosSemData", () => {
  it("lista os rascunhos (não os agendados), do mais recente para o mais antigo, e conta o total", async () => {
    const quem = await pessoaDaEquipe("COM");
    const primeiro = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: "Rascunho mais antigo" }));
    const segundo = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: "Rascunho mais novo" }));
    const agendada = await agendadaPara("Já tem data", new Date("2031-03-12T12:00:00Z"));

    const { itens, total } = await rascunhosSemData({ quem });

    const ids = itens.map((i) => i.id);
    expect(ids.indexOf(segundo.id)).toBeLessThan(ids.indexOf(primeiro.id));
    expect(ids).not.toContain(agendada);
    expect(total).toBeGreaterThanOrEqual(2);
    expect(itens.find((i) => i.id === segundo.id)).toMatchObject({ titulo: "Rascunho mais novo", revisao: segundo.revisao });
  });
});
