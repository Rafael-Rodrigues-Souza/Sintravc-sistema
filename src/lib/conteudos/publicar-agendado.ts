import { and, eq, or } from "drizzle-orm";

import { enviarSemFalhar } from "@/lib/acesso/avisos";
import { banco, type Transacao } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { notificacaoEquipe, pessoaEquipe } from "@/lib/db/schema";
import { quandoNaBahia } from "@/lib/datas";
import type { Enviar } from "@/lib/email";
import { mensagemPublicacaoAgendadaFalhou } from "@/lib/email/modelos";
import { lerEnvSite } from "@/lib/env";
import type { PedidoPublicacao } from "@/lib/tarefas/fila";

import { voltarARascunho } from "./agendar";
import { lerNoticia } from "./carregar";
import { rotuloDaNoticia } from "./dados";
import { ErroConteudo } from "./erros";
import { irAoAr } from "./publicar";
import { travarNoticia } from "./salvar";

/** Editor da notícia no painel (link da notificação e do e-mail). */
const enderecoDoEditor = (id: string) => `/painel/conteudos/noticia/${id}`;

export type ResultadoPublicacaoAgendada = { tipo: "publicada"; versao: number } | { tipo: "ignorada" };

/**
 * T01 · Publicar agendados (spec §6; CA-US21.2, RF71, RNF13). Roda na fila, no horário marcado.
 *
 * - **Idempotente:** se a notícia não está mais agendada para esta hora (já foi ao ar, foi
 *   reagendada ou cancelada), não faz nada.
 * - Vai ao ar a **cópia atual** (E44). Se faltar um obrigatório, dá erro: o pg-boss tenta de novo
 *   e, esgotadas as tentativas, a falha é registrada (registrarFalhaDaPublicacao).
 * - Se o servidor estava fora do ar na hora, publica quando volta; a Atividade guarda o atraso.
 */
export async function executarPublicacaoAgendada(
  pedido: PedidoPublicacao,
  deps: { agora?: Date } = {},
): Promise<ResultadoPublicacaoAgendada> {
  const marcadoPara = new Date(pedido.para);
  return banco().transaction(async (tx) => {
    const atual = await travarSeAindaExiste(tx, pedido.conteudoId);
    if (!atual || !aindaAgendada(atual, marcadoPara)) return { tipo: "ignorada" };

    const agora = deps.agora ?? new Date();
    const noticia = (await lerNoticia(tx, atual.id))!;
    const agendadoPor = atual.agendadoPor ?? atual.autorId;
    const { versao } = await irAoAr(tx, atual, noticia.dados, { criadoPor: agendadoPor, agora });
    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao: "noticia.publicar_agendado",
      area: "conteudos",
      alvo: { tipo: "noticia", id: atual.id, rotulo: rotuloDaNoticia(noticia.dados.titulo) },
      detalhe: {
        versao,
        agendado_por: agendadoPor,
        marcado_para: marcadoPara.toISOString(),
        publicado_em: agora.toISOString(),
        atraso_segundos: Math.max(0, Math.round((agora.getTime() - marcadoPara.getTime()) / 1000)),
      },
    });
    return { tipo: "publicada", versao };
  });
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
    const titulo = rotuloDaNoticia(atual.titulo);
    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao: "noticia.agendamento_falhou",
      area: "conteudos",
      alvo: { tipo: "noticia", id: atual.id, rotulo: titulo },
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
    const link = enderecoDoEditor(atual.id);
    if (destinatarios.length > 0) {
      await tx.insert(notificacaoEquipe).values(
        destinatarios.map((p) => ({
          pessoaId: p.id,
          tipo: "noticia.agendamento_falhou",
          texto: `A publicação agendada de “${titulo}” falhou. A notícia voltou para os rascunhos.`,
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
    return await travarNoticia(tx, id);
  } catch (erro) {
    if (erro instanceof ErroConteudo && erro.codigo === "nao_encontrada") return null;
    throw erro;
  }
}
