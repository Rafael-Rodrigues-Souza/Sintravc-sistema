import { and, eq, or } from "drizzle-orm";

import { enviarSemFalhar } from "@/lib/acesso/avisos";
import { banco, type Transacao } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { notificacaoEquipe, pessoaEquipe } from "@/lib/db/schema";
import { quandoNaBahia } from "@/lib/datas";
import type { Enviar } from "@/lib/email";
import { mensagemPublicacaoAgendadaFalhou } from "@/lib/email/modelos";
import { lerEnvSite } from "@/lib/env";
import { revalidarNoticiasDoSite } from "@/lib/noticias-do-site/revalidar";
import type { Fila, PedidoPublicacao } from "@/lib/tarefas/fila";

import { voltarARascunho } from "./agendar";
import { copiaDeTrabalho } from "./copia-de-trabalho";
import { ErroConteudo } from "./erros";
import { aplicarFixacaoAoPublicar } from "./fixar";
import { detalheDaFixacao, irAoAr } from "./publicar";
import { editorDo, familiaDo, rotuloDoConteudo, travarConteudo } from "./tipo-do-conteudo";

export type ResultadoPublicacaoAgendada = { tipo: "publicada"; versao: number } | { tipo: "ignorada" };

/**
 * T01 · Publicar agendados, notícia ou documento (spec §6; CA-US21.2, RF71, RNF13, E46). Roda na fila,
 * no horário marcado.
 *
 * - **Idempotente:** se a notícia não está mais agendada para esta hora (já foi ao ar, foi
 *   reagendada ou cancelada), não faz nada.
 * - Vai ao ar a **cópia atual** (E44). Se faltar um obrigatório, dá erro: o pg-boss tenta de novo
 *   e, esgotadas as tentativas, a falha é registrada (registrarFalhaDaPublicacao).
 * - Se o servidor estava fora do ar na hora, publica quando volta; a Atividade guarda o atraso.
 */
export async function executarPublicacaoAgendada(
  pedido: PedidoPublicacao,
  deps: { agora?: Date; fila: Fila },
): Promise<ResultadoPublicacaoAgendada> {
  const marcadoPara = new Date(pedido.para);
  const resultado = await banco().transaction(async (tx): Promise<ResultadoPublicacaoAgendada> => {
    const atual = await travarSeAindaExiste(tx, pedido.conteudoId);
    if (!atual || !aindaAgendada(atual, marcadoPara)) return { tipo: "ignorada" };

    const agora = deps.agora ?? new Date();
    const copia = await copiaDeTrabalho(tx, atual);
    const agendadoPor = atual.agendadoPor ?? atual.autorId;
    const { versao } = await irAoAr(tx, atual, copia, { criadoPor: agendadoPor, agora });
    // Notícia com intenção de fixar: vale agora; vencida, publica sem fixar (E59).
    const fixacao =
      atual.tipo === "noticia"
        ? await aplicarFixacaoAoPublicar(tx, atual.id, { agora, ator: { tipo: "sistema" }, fila: deps.fila, jaEstavaNoAr: false })
        : null;
    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao: `${familiaDo(atual.tipo)}.publicar_agendado`,
      area: "conteudos",
      alvo: { tipo: atual.tipo, id: atual.id, rotulo: rotuloDoConteudo(atual.tipo, copia.titulo) },
      detalhe: {
        versao,
        agendado_por: agendadoPor,
        marcado_para: marcadoPara.toISOString(),
        publicado_em: agora.toISOString(),
        atraso_segundos: Math.max(0, Math.round((agora.getTime() - marcadoPara.getTime()) / 1000)),
        ...(fixacao ? detalheDaFixacao(fixacao) : {}),
      },
    });
    return { tipo: "publicada", versao };
  });
  // Fora de um pedido o Next recusa; o site dinâmico já mostra a notícia na próxima visita (E59).
  if (resultado.tipo === "publicada") revalidarNoticiasDoSite();
  return resultado;
}

/** O pedido ainda vale: a notícia está agendada exatamente para esta hora. */
export function aindaAgendada(atual: { estado: string; agendadoPara: Date | null }, marcadoPara: Date) {
  return atual.estado === "agendado" && atual.agendadoPara?.getTime() === marcadoPara.getTime();
}

/**
 * Esgotadas as tentativas (RNF13), registra a falha (CA-US21.11, E21, E44):
 * - a notícia volta a Rascunho, sem data, e a Atividade guarda o motivo (ator sistema);
 * - quem agendou (se ainda estiver ativo) e os administradores gerais ativos, sem repetir,
 *   recebem a notificação do painel e, depois do commit, o e-mail M06.
 * Idempotente: se a notícia não está mais agendada para esta hora, não faz nada.
 */
export async function registrarFalhaDaPublicacao(
  pedido: PedidoPublicacao,
  deps: { motivo: string; enviar: Enviar; agora?: Date },
): Promise<void> {
  const marcadoPara = new Date(pedido.para);
  const aviso = await banco().transaction(async (tx) => {
    const atual = await travarSeAindaExiste(tx, pedido.conteudoId);
    if (!atual || !aindaAgendada(atual, marcadoPara)) return null;

    await voltarARascunho(tx, atual.id);
    const titulo = rotuloDoConteudo(atual.tipo, atual.titulo);
    const familia = familiaDo(atual.tipo);
    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao: `${familia}.agendamento_falhou`,
      area: "conteudos",
      alvo: { tipo: atual.tipo, id: atual.id, rotulo: titulo },
      motivo: deps.motivo,
      detalhe: { agendado_por: atual.agendadoPor, marcado_para: marcadoPara.toISOString() },
    });

    const destinatarios = await tx
      .select({ id: pessoaEquipe.id, email: pessoaEquipe.email })
      .from(pessoaEquipe)
      .where(
        and(
          eq(pessoaEquipe.situacao, "ativa"),
          atual.agendadoPor ? or(eq(pessoaEquipe.perfil, "ADM"), eq(pessoaEquipe.id, atual.agendadoPor)) : eq(pessoaEquipe.perfil, "ADM"),
        ),
      );
    const link = editorDo(atual.tipo, atual.id);
    const quemVoltou = { noticia: "A notícia voltou", edital: "O edital voltou", acordo: "O acordo voltou" }[atual.tipo];
    if (destinatarios.length > 0) {
      await tx.insert(notificacaoEquipe).values(
        destinatarios.map((p) => ({
          pessoaId: p.id,
          tipo: `${familia}.agendamento_falhou`,
          texto: `A publicação agendada de “${titulo}” falhou. ${quemVoltou} para os rascunhos.`,
          link,
        })),
      );
    }
    return { titulo, link, emails: destinatarios.map((p) => p.email) };
  });
  if (!aviso || aviso.emails.length === 0) return;

  // O e-mail vai depois do commit: se o SMTP falhar, a falha continua registrada (E38).
  try {
    const { URL_SITE } = lerEnvSite();
    const dados = {
      titulo: aviso.titulo,
      agendadaPara: quandoNaBahia(marcadoPara),
      motivo: deps.motivo,
      link: `${URL_SITE}${aviso.link}`,
      urlSite: URL_SITE,
    };
    const mensagens = await Promise.all(aviso.emails.map((email) => mensagemPublicacaoAgendadaFalhou(email, dados)));
    await enviarSemFalhar(deps.enviar, mensagens, "publicação agendada falhou");
  } catch (erro) {
    console.error("Não consegui preparar o e-mail de publicação agendada que falhou:", erro);
  }
}

/**
 * Trava a notícia do pedido. Só "não existe mais" vira null (o pedido é ignorado). Qualquer outro
 * erro (tempo de lock esgotado, banco fora do ar) sobe: o pg-boss tenta de novo e, esgotadas as
 * tentativas, a falha é registrada e avisada (RNF13). Assim nada fica Agendado sem aviso.
 */
async function travarSeAindaExiste(tx: Transacao, id: string) {
  try {
    return await travarConteudo(tx, id);
  } catch (erro) {
    if (erro instanceof ErroConteudo && erro.codigo === "nao_encontrada") return null;
    throw erro;
  }
}
