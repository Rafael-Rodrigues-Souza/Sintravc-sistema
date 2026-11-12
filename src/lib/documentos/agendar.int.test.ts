import { describe, expect, it } from "vitest";

import { cancelarAgendamento, reagendarConteudo } from "@/lib/conteudos/agendar";
import { executarPublicacaoAgendada } from "@/lib/conteudos/publicar-agendado";
import { SemPermissao } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { documentoCompleto, documentoSalvo } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe } from "@/testes/noticias";

import { agendarDocumento } from "./agendar";
import { carregarDocumento, retratoDoDocumento } from "./carregar";
import { documentoVazio } from "./dados";

const AGORA = new Date("2026-11-02T12:00:00Z");
const PARA = new Date("2026-11-03T11:00:00Z"); // 03/11 às 8h na Bahia

async function erroDe(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("não deu erro");
}

describe("agendarDocumento (RF41, RN12, E44, E46)", () => {
  it("o agendamento também pede a confirmação de versão oficial", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    const { fila, pedidos } = filaEmMemoria();

    const erro = await erroDe(agendarDocumento({ id: salvo.id, revisaoBase: 1, para: PARA, confirmoOficial: false }, { quem: adm, fila, agora: AGORA }));

    expect(erro).toMatchObject({ campo: "confirmoOficial" });
    expect(pedidos).toEqual([]);
  });

  it("confirmado: fica Agendado, guarda quem confirmou, põe o pedido na fila e registra na Atividade", async () => {
    const adm = await pessoaDaEquipe("ADM", "Mariana Souza");
    const salvo = await documentoSalvo(adm, "acordo", await documentoCompleto("acordo", adm));
    const { fila, pedidos } = filaEmMemoria();

    const r = await agendarDocumento({ id: salvo.id, revisaoBase: 1, para: PARA, confirmoOficial: true }, { quem: adm, fila, agora: AGORA });

    expect(r).toEqual({ tipo: "agendado", para: PARA });
    expect(await carregarDocumento(salvo.id, { quem: adm })).toMatchObject({
      estado: "agendado",
      agendadoPara: PARA,
      confirmadoOficialPorNome: "Mariana Souza",
    });
    expect(pedidos).toEqual([{ conteudoId: salvo.id, para: PARA.toISOString() }]);
    expect((await atividadesDe(salvo.id)).at(-1)).toMatchObject({ acao: "documento.agendar", detalhe: { confirmou_versao_oficial: true } });
  });

  it("com faltas, não agenda", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", documentoVazio("edital"));
    const { fila } = filaEmMemoria();
    expect(
      await erroDe(agendarDocumento({ id: salvo.id, revisaoBase: 1, para: PARA, confirmoOficial: true }, { quem: adm, fila, agora: AGORA })),
    ).toMatchObject({ message: "Faltam 7 itens obrigatórios para publicar." });
  });

  it("a Comunicação não agenda, não reagenda e não cancela (RN08)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const com = await pessoaDaEquipe("COM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    const { fila } = filaEmMemoria();
    expect(
      await erroDe(agendarDocumento({ id: salvo.id, revisaoBase: 1, para: PARA, confirmoOficial: true }, { quem: com, fila, agora: AGORA })),
    ).toBeInstanceOf(SemPermissao);

    await agendarDocumento({ id: salvo.id, revisaoBase: 1, para: PARA, confirmoOficial: true }, { quem: adm, fila, agora: AGORA });
    expect(await erroDe(reagendarConteudo({ id: salvo.id, para: new Date(PARA.getTime() + 3600_000) }, { quem: com, fila, agora: AGORA }))).toBeInstanceOf(
      SemPermissao,
    );
    expect(await erroDe(cancelarAgendamento({ id: salvo.id }, { quem: com }))).toBeInstanceOf(SemPermissao);
  });

  it("na hora marcada, a tarefa põe o documento no ar, com a versão e o registro do sistema (T01)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const dados = await documentoCompleto("edital", adm);
    const salvo = await documentoSalvo(adm, "edital", dados);
    const { fila, pedidos } = filaEmMemoria();
    await agendarDocumento({ id: salvo.id, revisaoBase: 1, para: PARA, confirmoOficial: true }, { quem: adm, fila, agora: AGORA });

    const r = await executarPublicacaoAgendada(pedidos[0]!, { agora: PARA });

    expect(r).toEqual({ tipo: "publicada", versao: 1 });
    expect(await carregarDocumento(salvo.id, { quem: adm })).toMatchObject({ estado: "publicado", versao: 1 });
    expect(await retratoDoDocumento((await import("@/lib/db")).banco(), salvo.id)).toEqual({ formato: 1, tipo: "edital", dados });
    expect((await atividadesDe(salvo.id)).at(-1)).toMatchObject({ acao: "documento.publicar_agendado", atorTipo: "sistema" });
  });

  it("cancelar o agendamento devolve o documento ao rascunho", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    const { fila } = filaEmMemoria();
    await agendarDocumento({ id: salvo.id, revisaoBase: 1, para: PARA, confirmoOficial: true }, { quem: adm, fila, agora: AGORA });
    await cancelarAgendamento({ id: salvo.id }, { quem: adm });
    expect(await carregarDocumento(salvo.id, { quem: adm })).toMatchObject({ estado: "rascunho", agendadoPara: null });
    expect((await atividadesDe(salvo.id)).at(-1)).toMatchObject({ acao: "documento.cancelar_agendamento" });
  });
});
