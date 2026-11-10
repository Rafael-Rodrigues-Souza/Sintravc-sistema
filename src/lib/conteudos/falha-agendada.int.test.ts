import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { notificacaoEquipe, pessoaEquipe } from "@/lib/db/schema";
import type { Enviar, Mensagem } from "@/lib/email";
import type { QuemDaEquipe } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { agendarNoticia } from "./agendar";
import { carregarNoticia } from "./carregar";
import { registrarFalhaDaPublicacao } from "./publicar-agendado";

/** Uma hora que não é a marcada: pedido velho. */
const ANTES = new Date("2026-10-28T12:00:00Z");
const PARA = new Date("2026-10-28T19:00:00Z"); // 28/10/2026 · 16h00 na Bahia
const DEPOIS = new Date("2026-10-28T19:05:00Z");

function caixaDeSaida() {
  const enviadas: Mensagem[] = [];
  const enviar: Enviar = async (m) => {
    enviadas.push(m);
    return { idMensagem: String(enviadas.length) };
  };
  return { enviar, enviadas };
}

async function emailDe(quem: QuemDaEquipe) {
  const [linha] = await banco().select({ email: pessoaEquipe.email }).from(pessoaEquipe).where(eq(pessoaEquipe.id, quem.id));
  return linha!.email;
}

async function desativar(quem: QuemDaEquipe) {
  await banco().update(pessoaEquipe).set({ situacao: "desativada" }).where(eq(pessoaEquipe.id, quem.id));
}

async function notificacoesDe(quem: QuemDaEquipe) {
  return banco()
    .select({ tipo: notificacaoEquipe.tipo, texto: notificacaoEquipe.texto, link: notificacaoEquipe.link })
    .from(notificacaoEquipe)
    .where(eq(notificacaoEquipe.pessoaId, quem.id));
}

async function agendadaPor(quem: QuemDaEquipe) {
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: "Horário especial de atendimento no feriado" }));
  await agendarNoticia({ id, revisaoBase: revisao, para: PARA }, { quem, fila: filaEmMemoria().fila, agora: new Date("2026-10-27T12:00:00Z") });
  return id;
}

const FALHA = { motivo: "Falta preencher: Assinatura." };

describe("registrarFalhaDaPublicacao (CA-US21.11, RN59, E21, E44)", () => {
  it("volta a notícia a Rascunho, registra na Atividade e avisa por e-mail e no painel", async () => {
    const com = await pessoaDaEquipe("COM");
    const id = await agendadaPor(com);
    const { enviar, enviadas } = caixaDeSaida();

    await registrarFalhaDaPublicacao({ conteudoId: id, para: PARA.toISOString() }, { ...FALHA, enviar, agora: DEPOIS });

    expect(await carregarNoticia(id, { quem: com })).toMatchObject({ estado: "rascunho", agendadoPara: null, agendadoPor: null });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "noticia.agendamento_falhou",
      atorTipo: "sistema",
      motivo: "Falta preencher: Assinatura.",
      detalhe: { agendado_por: com.id, marcado_para: PARA.toISOString() },
    });

    const email = await emailDe(com);
    const recebidas = enviadas.filter((m) => m.para === email);
    expect(recebidas).toHaveLength(1);
    expect(recebidas[0]!.assunto).toBe("Não foi possível publicar “Horário especial de atendimento no feriado”");
    expect(recebidas[0]!.texto).toContain("28/10/2026 · 16h00");
    expect(recebidas[0]!.html).toContain(`/painel/conteudos/noticia/${id}`);

    expect(await notificacoesDe(com)).toEqual([
      {
        tipo: "noticia.agendamento_falhou",
        texto: "A publicação agendada de “Horário especial de atendimento no feriado” falhou. A notícia voltou para os rascunhos.",
        link: `/painel/conteudos/noticia/${id}`,
      },
    ]);
  });

  it("os administradores gerais ativos também recebem; o desativado, não", async () => {
    const com = await pessoaDaEquipe("COM");
    const adm = await pessoaDaEquipe("ADM");
    const admDesativado = await pessoaDaEquipe("ADM");
    await desativar(admDesativado);
    const id = await agendadaPor(com);
    const { enviar, enviadas } = caixaDeSaida();

    await registrarFalhaDaPublicacao({ conteudoId: id, para: PARA.toISOString() }, { ...FALHA, enviar, agora: DEPOIS });

    const para = enviadas.map((m) => m.para);
    expect(para).toContain(await emailDe(com));
    expect(para).toContain(await emailDe(adm));
    expect(para).not.toContain(await emailDe(admDesativado));
    expect(await notificacoesDe(adm)).toHaveLength(1);
    expect(await notificacoesDe(admDesativado)).toHaveLength(0);
  });

  it("ADM que agendou recebe uma vez só", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const id = await agendadaPor(adm);
    const { enviar, enviadas } = caixaDeSaida();

    await registrarFalhaDaPublicacao({ conteudoId: id, para: PARA.toISOString() }, { ...FALHA, enviar, agora: DEPOIS });

    const email = await emailDe(adm);
    expect(enviadas.filter((m) => m.para === email)).toHaveLength(1);
    expect(await notificacoesDe(adm)).toHaveLength(1);
  });

  it("quem agendou foi desativado: os ADMs recebem mesmo assim", async () => {
    const com = await pessoaDaEquipe("COM");
    const adm = await pessoaDaEquipe("ADM");
    const id = await agendadaPor(com);
    await desativar(com);
    const { enviar, enviadas } = caixaDeSaida();

    await registrarFalhaDaPublicacao({ conteudoId: id, para: PARA.toISOString() }, { ...FALHA, enviar, agora: DEPOIS });

    const para = enviadas.map((m) => m.para);
    expect(para).not.toContain(await emailDe(com));
    expect(para).toContain(await emailDe(adm));
    expect(await notificacoesDe(com)).toHaveLength(0);
  });

  it("pedido velho (notícia já reagendada, publicada ou cancelada) não faz nada", async () => {
    const com = await pessoaDaEquipe("COM");
    const id = await agendadaPor(com);
    const { enviar, enviadas } = caixaDeSaida();

    await registrarFalhaDaPublicacao({ conteudoId: id, para: ANTES.toISOString() }, { ...FALHA, enviar, agora: DEPOIS });

    expect(await carregarNoticia(id, { quem: com })).toMatchObject({ estado: "agendado" });
    expect(enviadas).toEqual([]);
    expect(await notificacoesDe(com)).toEqual([]);
  });

  it("e-mail fora do ar não desfaz o registro da falha", async () => {
    const com = await pessoaDaEquipe("COM");
    const id = await agendadaPor(com);
    const enviar: Enviar = async () => {
      throw new Error("SMTP fora do ar");
    };

    await registrarFalhaDaPublicacao({ conteudoId: id, para: PARA.toISOString() }, { ...FALHA, enviar, agora: DEPOIS });

    expect(await carregarNoticia(id, { quem: com })).toMatchObject({ estado: "rascunho" });
    expect(await notificacoesDe(com)).toHaveLength(1);
  });
});
