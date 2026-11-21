import { describe, expect, it } from "vitest";

import { filaEmMemoria } from "@/lib/tarefas/fila";
import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { agendarNoticia, reagendarConteudo, cancelarAgendamento } from "./agendar";
import { carregarNoticia } from "./carregar";
import type { DadosNoticia } from "./dados";
import { executarPublicacaoAgendada } from "./publicar-agendado";
import { ErroFaltamCampos, versoesDaNoticia } from "./publicar";
import { salvarRascunhoNoticia } from "./salvar";

const ANTES = new Date("2026-11-02T12:00:00Z");
const PARA = new Date("2026-11-03T11:00:00Z");
const PEDIDO_PARA = PARA.toISOString();

async function agendada(dados?: Partial<DadosNoticia>) {
  const quem = await pessoaDaEquipe("COM");
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta(dados));
  await agendarNoticia({ id, revisaoBase: revisao, para: PARA }, { quem, fila: filaEmMemoria().fila, agora: ANTES });
  return { quem, id };
}

describe("executarPublicacaoAgendada: T01 (CA-US21.2, RF71, RNF13)", () => {
  it("na hora marcada, a notícia vai ao ar sozinha: versão, slug e Atividade do sistema", async () => {
    const { quem, id } = await agendada({ titulo: "Mutirão de exames no sindicato" });

    const resultado = await executarPublicacaoAgendada({ conteudoId: id, para: PEDIDO_PARA }, { agora: PARA, fila: filaEmMemoria().fila });

    expect(resultado).toEqual({ tipo: "publicada", versao: 1 });
    expect(await carregarNoticia(id, { quem })).toMatchObject({
      estado: "publicado",
      publicadoEm: PARA,
      jaPublicado: true,
      versao: 1,
      slug: "mutirao-de-exames-no-sindicato",
      agendadoPara: null,
    });
    expect(await versoesDaNoticia(id, { quem })).toEqual([expect.objectContaining({ versao: 1, criadoPor: quem.id })]);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.publicar_agendado",
      atorTipo: "sistema",
      atorId: null,
      detalhe: {
        versao: 1,
        agendado_por: quem.id,
        marcado_para: PEDIDO_PARA,
        publicado_em: PEDIDO_PARA,
        atraso_segundos: 0,
      },
    });
  });

  it("vai ao ar a cópia atual, com o que foi editado depois de agendar (E44)", async () => {
    const { quem, id } = await agendada();
    const atual = (await carregarNoticia(id, { quem }))!;
    await salvarRascunhoNoticia({ id, revisaoBase: atual.revisao, dados: { ...atual.dados, lide: "Lide revisado." } }, edicaoDe(quem));

    await executarPublicacaoAgendada({ conteudoId: id, para: PEDIDO_PARA }, { agora: PARA, fila: filaEmMemoria().fila });

    const [versao] = await versoesDaNoticia(id, { quem });
    expect(versao!.dados.lide).toBe("Lide revisado.");
  });

  it("é idempotente: rodar de novo não gera outra versão nem outro registro", async () => {
    const { quem, id } = await agendada();
    await executarPublicacaoAgendada({ conteudoId: id, para: PEDIDO_PARA }, { agora: PARA, fila: filaEmMemoria().fila });
    const registros = (await atividadesDe(id)).length;

    const segunda = await executarPublicacaoAgendada({ conteudoId: id, para: PEDIDO_PARA }, { agora: PARA, fila: filaEmMemoria().fila });

    expect(segunda).toEqual({ tipo: "ignorada" });
    expect(await versoesDaNoticia(id, { quem })).toHaveLength(1);
    expect(await atividadesDe(id)).toHaveLength(registros);
  });

  it("pedido velho (reagendada ou cancelada depois) não faz nada", async () => {
    const { quem, id } = await agendada();
    const depois = new Date("2026-11-04T11:00:00Z");
    await reagendarConteudo({ id, para: depois }, { quem, fila: filaEmMemoria().fila, agora: ANTES });

    expect(await executarPublicacaoAgendada({ conteudoId: id, para: PEDIDO_PARA }, { agora: PARA, fila: filaEmMemoria().fila })).toEqual({ tipo: "ignorada" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado", agendadoPara: depois });

    await cancelarAgendamento({ id }, { quem });
    expect(await executarPublicacaoAgendada({ conteudoId: id, para: depois.toISOString() }, { agora: depois, fila: filaEmMemoria().fila })).toEqual({ tipo: "ignorada" });
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "rascunho", versao: 0 });
  });

  it("servidor fora do ar na hora: publica quando volta e registra o atraso (E44)", async () => {
    const { id } = await agendada();
    const quandoVoltou = new Date(PARA.getTime() + 10 * 60_000);

    await executarPublicacaoAgendada({ conteudoId: id, para: PEDIDO_PARA }, { agora: quandoVoltou, fila: filaEmMemoria().fila });

    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.publicar_agendado",
      detalhe: { marcado_para: PEDIDO_PARA, publicado_em: quandoVoltou.toISOString(), atraso_segundos: 600 },
    });
  });

  it("se falta um obrigatório na hora, dá erro (o pg-boss tenta de novo) e nada muda", async () => {
    const { quem, id } = await agendada();
    const atual = (await carregarNoticia(id, { quem }))!;
    await salvarRascunhoNoticia({ id, revisaoBase: atual.revisao, dados: { ...atual.dados, assinatura: "" } }, edicaoDe(quem));

    await expect(executarPublicacaoAgendada({ conteudoId: id, para: PEDIDO_PARA }, { agora: PARA, fila: filaEmMemoria().fila })).rejects.toBeInstanceOf(ErroFaltamCampos);
    expect(await carregarNoticia(id, { quem })).toMatchObject({ estado: "agendado", versao: 0 });
  });
});
