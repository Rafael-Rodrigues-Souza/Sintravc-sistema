import { describe, expect, it } from "vitest";

import { SemPermissao } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { agendarNoticia, cancelarAgendamento, reagendarConteudo } from "./agendar";
import { carregarNoticia } from "./carregar";
import { ErroConteudo } from "./erros";
import { ErroFaltamCampos, publicarNoticia } from "./publicar";
import { salvarRascunhoNoticia } from "./salvar";
import { edicaoDe } from "@/testes/equipe";

const AGORA = new Date("2026-11-02T12:00:00Z");
/** 03/11/2026 às 08h00 na Bahia (CA-US21.2). */
const TRES_DE_NOVEMBRO_8H = new Date("2026-11-03T11:00:00Z");

describe("agendarNoticia (CA-US21.2, RF39, RN10)", () => {
  it("rascunho completo fica Agendado para a data, com quem agendou, Atividade e o pedido na fila", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    const { fila, pedidos } = filaEmMemoria();

    const resultado = await agendarNoticia({ id, revisaoBase: revisao, para: TRES_DE_NOVEMBRO_8H }, { quem, fila, agora: AGORA });

    expect(resultado).toEqual({ tipo: "agendada", para: TRES_DE_NOVEMBRO_8H });
    expect(await carregarNoticia(id, { quem })).toMatchObject({
      estado: "agendado",
      agendadoPara: TRES_DE_NOVEMBRO_8H,
      agendadoPor: quem.id,
      jaPublicado: false,
      versao: 0,
    });
    expect(pedidos).toEqual([{ conteudoId: id, para: "2026-11-03T11:00:00.000Z" }]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.agendar",
      atorId: quem.id,
      detalhe: { para: "2026-11-03T11:00:00.000Z" },
    });
  });

  it("data que já passou (ou agora) é recusada e nada muda", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    const { fila, pedidos } = filaEmMemoria();

    for (const para of [AGORA, new Date(AGORA.getTime() - 60_000)]) {
      const erro = await agendarNoticia({ id, revisaoBase: revisao, para }, { quem, fila, agora: AGORA }).catch((e) => e);
      expect(erro).toBeInstanceOf(ErroConteudo);
      expect(erro).toMatchObject({ codigo: "invalido", campo: "agendadoPara" });
    }
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", agendadoPara: null });
    expect(pedidos).toEqual([]);
  });

  it("faltando obrigatório, não agenda e diz o que falta", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta({ assinatura: "" }));
    const { fila, pedidos } = filaEmMemoria();

    const erro = await agendarNoticia({ id, revisaoBase: revisao, para: TRES_DE_NOVEMBRO_8H }, { quem, fila, agora: AGORA }).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroFaltamCampos);
    expect(erro.campos).toEqual(["assinatura"]);
    expect(pedidos).toEqual([]);
  });

  it("Atendimento não agenda notícia (RNF01)", async () => {
    const autor = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(autor, await noticiaCompleta());
    const atd = await pessoaDaEquipe("ATD");

    await expect(
      agendarNoticia({ id, revisaoBase: revisao, para: TRES_DE_NOVEMBRO_8H }, { quem: atd, fila: filaEmMemoria().fila, agora: AGORA }),
    ).rejects.toBeInstanceOf(SemPermissao);
  });

  it("notícia que já está no ar não é agendada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    await expect(
      agendarNoticia({ id, revisaoBase: revisao, para: TRES_DE_NOVEMBRO_8H }, { quem, fila: filaEmMemoria().fila, agora: AGORA }),
    ).rejects.toMatchObject({ codigo: "invalido" });
  });

  it("se alguém salvou depois, devolve o conflito e não agenda", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: await noticiaCompleta({ titulo: "Outro título" }) }, edicaoDe(quem));

    const resultado = await agendarNoticia({ id, revisaoBase: revisao, para: TRES_DE_NOVEMBRO_8H }, { quem, fila: filaEmMemoria().fila, agora: AGORA });

    expect(resultado.tipo).toBe("conflito");
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho" });
  });
});

async function agendada(quem: Awaited<ReturnType<typeof pessoaDaEquipe>>) {
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta());
  await agendarNoticia({ id, revisaoBase: revisao, para: TRES_DE_NOVEMBRO_8H }, { quem, fila: filaEmMemoria().fila, agora: AGORA });
  return { id, revisao: (await carregarNoticia(id, { quem }))!.revisao };
}

describe("reagendarConteudo (arrastar no calendário, Edição rápida)", () => {
  it("muda a data, registra a anterior e a nova na Atividade e põe um pedido novo na fila", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await agendada(quem);
    const outra = await pessoaDaEquipe("ADM");
    const { fila, pedidos } = filaEmMemoria();
    const cincoDeNovembro = new Date("2026-11-05T11:00:00Z");

    const resultado = await reagendarConteudo({ id, para: cincoDeNovembro }, { quem: outra, fila, agora: AGORA });

    expect(resultado).toEqual({ tipo: "agendada", para: cincoDeNovembro });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado", agendadoPara: cincoDeNovembro, agendadoPor: outra.id });
    expect(pedidos).toEqual([{ conteudoId: id, para: "2026-11-05T11:00:00.000Z" }]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.reagendar",
      atorId: outra.id,
      detalhe: { de: "2026-11-03T11:00:00.000Z", para: "2026-11-05T11:00:00.000Z" },
    });
  });

  it("só reagenda o que está agendado, e para o futuro", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await rascunhoSalvo(quem, await noticiaCompleta());
    const { fila } = filaEmMemoria();
    await expect(reagendarConteudo({ id, para: TRES_DE_NOVEMBRO_8H }, { quem, fila, agora: AGORA })).rejects.toMatchObject({
      codigo: "invalido",
    });

    const ag = await agendada(quem);
    await expect(reagendarConteudo({ id: ag.id, para: AGORA }, { quem, fila, agora: AGORA })).rejects.toMatchObject({
      campo: "agendadoPara",
    });
  });
});

describe("cancelarAgendamento", () => {
  it("volta a notícia a Rascunho, sem data, e registra na Atividade", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await agendada(quem);

    const resultado = await cancelarAgendamento({ id }, { quem });

    expect(resultado).toEqual({ tipo: "cancelado" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", agendadoPara: null, agendadoPor: null });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.cancelar_agendamento",
      atorId: quem.id,
      detalhe: { de: "2026-11-03T11:00:00.000Z" },
    });
  });

  it("Atendimento não cancela (RNF01)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id } = await agendada(quem);
    await expect(cancelarAgendamento({ id }, { quem: await pessoaDaEquipe("ATD") })).rejects.toBeInstanceOf(SemPermissao);
  });
});

describe("notícia agendada continua editável (E44)", () => {
  it("salvar a cópia mantém o estado Agendado e a data", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await agendada(quem);

    await salvarRascunhoNoticia({ id, revisaoBase: revisao, dados: await noticiaCompleta({ titulo: "Plantão jurídico muda de horário" }) }, edicaoDe(quem));

    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado", agendadoPara: TRES_DE_NOVEMBRO_8H });
  });

  it("“Publicar agora” numa agendada publica e tira da agenda", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { id, revisao } = await agendada(quem);

    await publicarNoticia({ id, revisaoBase: revisao }, { quem });

    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "publicado", agendadoPara: null, versao: 1 });
  });
});
