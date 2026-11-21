import { and, eq, inArray } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { conteudo, conteudoVersao, midiaUso } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { lerNoticia, type NoticiaAberta, type RetratoDaNoticia } from "./carregar";
import { ErroConteudo } from "./erros";
import { desafixarAoSairDoAr } from "./fixar";
import { conferirMotivo } from "./motivo";
import { gravarPorCima, registrarAtividadeNoticia, travarNoticia } from "./salvar";
import {
  exigirEmAlgumTipo,
  exigirNoConteudo,
  familiaDo,
  palavrasDo,
  podeNoConteudo,
  registrarAtividadeConteudo,
  rotuloDoConteudo,
  travarConteudo,
  type LinhaDoConteudo,
} from "./tipo-do-conteudo";
import { validarNoticia, type UrlDoArquivo } from "./validar";

/**
 * Ciclo de vida do conteúdo, notícia ou documento oficial (RN10, RN11, RN54, E07, E31, E45, E46):
 * ocultar, mostrar no site, arquivar (também em lote, com desfazer), restaurar como rascunho,
 * excluir o rascunho que nunca foi ao ar e restaurar uma versão. Cada ação roda numa transação só,
 * com a linha travada, e registra a Atividade nessa mesma transação (spec §11 T1). Em lote, cada
 * item ganha a sua linha na Atividade, para o histórico de cada um ficar completo. A permissão é
 * conferida item a item: edital e acordo só o ADM altera (RN08).
 */

type Linha = LinhaDoConteudo;
type Deps = { quem: QuemDaEquipe; sessaoEdicao?: string };

/** Edital e acordo só o ADM altera (RN08): a COM recebe esta explicação no lote. */
const SO_ADM_DOCUMENTO = "Só o Administrador geral altera documentos oficiais.";

/** Resultado de uma ação em lote: as que mudaram e as que ficaram de fora (com o porquê). */
export type ResultadoLote = { feitos: string[]; ignorados: { id: string; titulo: string; motivo: string }[] };

/** Ocultar (RN11): só o que está publicado; o motivo é obrigatório e fica na Atividade. */
export async function ocultarConteudos(entrada: { ids: string[]; motivo: string }, deps: { quem: QuemDaEquipe }): Promise<ResultadoLote> {
  exigirEmAlgumTipo(deps.quem, "ocultar");
  const motivo = conferirMotivo(entrada.motivo);
  return emLote(entrada.ids, async (tx, atual) => {
    if (!podeNoConteudo(deps.quem, "ocultar", atual)) return SO_ADM_DOCUMENTO;
    if (atual.estado !== "publicado") return "Só o que está publicado pode ser ocultado.";
    await ocultarNaTransacao(tx, atual, motivo, deps);
  });
}

/** Ocultar dentro de uma transação já aberta, com o conteúdo travado e publicado (também usada pela Edição rápida). */
export async function ocultarNaTransacao(tx: Transacao, atual: Linha, motivoDigitado: string, deps: Deps) {
  exigirNoConteudo(deps.quem, "ocultar", atual);
  const motivo = conferirMotivo(motivoDigitado);
  if (atual.estado !== "publicado") throw new ErroConteudo("invalido", "Só o que está publicado pode ser ocultado. Atualize a página.");
  await tx.update(conteudo).set({ estado: "oculto", motivoOculto: motivo, ocultadoEm: new Date() }).where(eq(conteudo.id, atual.id));
  // A oculta sai do topo de Notícias e não volta fixada com "Mostrar no site" (E59).
  const desafixada = atual.tipo === "noticia" && (await desafixarAoSairDoAr(tx, atual.id));
  await registrarAtividadeConteudo(tx, atual, "ocultar", deps, desafixada ? { desafixada: true } : {}, motivo);
}

/**
 * "Mostrar no site" (Oculto → Publicado, RN10, E45): volta a versão que estava no ar, sem gerar
 * versão nova. O que foi editado enquanto estava oculto continua na cópia de trabalho, com o aviso
 * "Há alterações que ainda não estão no site" (E42).
 */
export async function mostrarNoSite(entrada: { id: string }, deps: Deps): Promise<void> {
  exigirEmAlgumTipo(deps.quem, "publicar");
  await banco().transaction(async (tx) => mostrarNaTransacao(tx, await travarConteudo(tx, entrada.id), deps));
}

/** "Mostrar no site" dentro de uma transação já aberta, com o conteúdo travado (também usada pela Edição rápida). */
export async function mostrarNaTransacao(tx: Transacao, atual: Linha, deps: Deps) {
  exigirNoConteudo(deps.quem, "publicar", atual);
  if (atual.estado !== "oculto") {
    const p = palavrasDo(atual.tipo);
    throw new ErroConteudo("invalido", `${p.este} não está ${p.o("ocult")}. Atualize a página.`);
  }
  await tx.update(conteudo).set({ estado: "publicado", motivoOculto: null, ocultadoEm: null }).where(eq(conteudo.id, atual.id));
  await registrarAtividadeConteudo(tx, atual, "mostrar", deps, { versao: atual.versao });
}

/**
 * Arquivar (RN10, E45): sai do site e das listas e vai para Arquivados, com histórico e anexos
 * (a `midia_uso` continua). Vale para qualquer estado, menos o arquivado. O estado de antes fica
 * guardado para o "Desfazer". O agendado sai da agenda: a data fica guardada, mas o pedido da
 * fila não faz nada, porque o estado não é mais agendado (aindaAgendada, E44).
 */
export async function arquivarConteudos(entrada: { ids: string[] }, deps: { quem: QuemDaEquipe }): Promise<ResultadoLote> {
  exigirEmAlgumTipo(deps.quem, "arquivar");
  return emLote(entrada.ids, async (tx, atual) => {
    if (!podeNoConteudo(deps.quem, "arquivar", atual)) return SO_ADM_DOCUMENTO;
    if (atual.estado === "arquivado") return "Já está arquivado.";
    await tx
      .update(conteudo)
      .set({ estado: "arquivado", estadoAntesDeArquivar: atual.estado })
      .where(eq(conteudo.id, atual.id));
    // Arquivada perde a fixação ou a intenção de fixar; o "Desfazer" não a devolve (E59).
    const desafixada = atual.tipo === "noticia" && (await desafixarAoSairDoAr(tx, atual.id));
    await registrarAtividadeConteudo(tx, atual, "arquivar", deps, {
      estado_anterior: atual.estado,
      ...(desafixada ? { desafixada: true } : {}),
    });
  });
}

/**
 * "Desfazer" do aviso de arquivamento (E45): cada item volta ao estado de antes, com o que tinha
 * (o oculto, com o mesmo motivo). O agendado volta para a agenda, com um pedido novo na fila, se a
 * data ainda não passou; se passou, volta como rascunho, sem data.
 */
export async function desfazerArquivamento(
  entrada: { ids: string[] },
  deps: { quem: QuemDaEquipe; fila: Fila; agora?: Date },
): Promise<ResultadoLote> {
  exigirEmAlgumTipo(deps.quem, "arquivar");
  const agora = deps.agora ?? new Date();
  return emLote(entrada.ids, async (tx, atual) => {
    if (!podeNoConteudo(deps.quem, "arquivar", atual)) return SO_ADM_DOCUMENTO;
    if (atual.estado !== "arquivado" || !atual.estadoAntesDeArquivar) return "Não está mais arquivado.";
    let estado = atual.estadoAntesDeArquivar;
    if (estado === "agendado" && !(atual.agendadoPara && atual.agendadoPara.getTime() > agora.getTime())) estado = "rascunho";
    const agenda = estado === "agendado" ? {} : { agendadoPara: null, agendadoPor: null };
    await tx
      .update(conteudo)
      .set({ estado, estadoAntesDeArquivar: null, ...agenda })
      .where(eq(conteudo.id, atual.id));
    if (estado === "agendado") await deps.fila.agendarPublicacao(tx, { conteudoId: atual.id, para: atual.agendadoPara! });
    await registrarAtividadeConteudo(tx, atual, "desfazer_arquivamento", deps, { estado });
  });
}

/**
 * "Restaurar como rascunho" (Arquivado → Rascunho, RN10): fica fora do site até alguém publicar.
 * Guarda as versões, o endereço e a marca de já publicado (por isso não pode ser excluído, RN54).
 */
export async function restaurarComoRascunho(entrada: { id: string }, deps: { quem: QuemDaEquipe }): Promise<void> {
  exigirEmAlgumTipo(deps.quem, "restaurar");
  await banco().transaction(async (tx) => {
    const atual = await travarConteudo(tx, entrada.id);
    exigirNoConteudo(deps.quem, "restaurar", atual);
    if (atual.estado !== "arquivado") {
      const p = palavrasDo(atual.tipo);
      throw new ErroConteudo("invalido", `${p.este} não está mais ${p.o("arquivad")}. Atualize a página.`);
    }
    await tx
      .update(conteudo)
      .set({
        estado: "rascunho",
        estadoAntesDeArquivar: null,
        motivoOculto: null,
        ocultadoEm: null,
        agendadoPara: null,
        agendadoPor: null,
      })
      .where(eq(conteudo.id, atual.id));
    await registrarAtividadeConteudo(tx, atual, "restaurar", deps, { estado_anterior: atual.estadoAntesDeArquivar });
  });
}

/**
 * Excluir de vez (RN54, E07, CA-US22.3): só o rascunho que nunca foi ao ar. Notícia: pelo autor ou
 * pelo Administrador geral; documento: só o ADM. Na mesma transação: a `midia_uso` do conteúdo (não
 * tem chave estrangeira para `conteudo`; sem isso os arquivos ficariam "em uso" para sempre, RN16),
 * o conteúdo (a cascata leva o resto) e o registro na Atividade.
 */
export async function excluirRascunho(entrada: { id: string }, deps: { quem: QuemDaEquipe }): Promise<void> {
  await banco().transaction(async (tx) => {
    const atual = await travarConteudo(tx, entrada.id);
    exigirNoConteudo(deps.quem, "excluir", atual);
    if (atual.estado !== "rascunho") {
      throw new ErroConteudo("invalido", "Só um rascunho pode ser excluído. Cancele o agendamento antes.");
    }
    await tx.delete(midiaUso).where(and(eq(midiaUso.donoTipo, familiaDo(atual.tipo)), eq(midiaUso.donoId, atual.id)));
    await tx.delete(conteudo).where(eq(conteudo.id, atual.id));
    await registrarAtividadeConteudo(tx, atual, "excluir", deps, { autor_id: atual.autorId });
  });
}

export type ResultadoRestaurarVersao =
  | { tipo: "restaurada"; noticia: NoticiaAberta }
  /** Alguém salvou depois da `revisaoBase`: nada mudou; a pessoa escolhe a versão (N4). */
  | { tipo: "conflito"; servidor: NoticiaAberta };

/**
 * "Restaurar como rascunho" no Histórico da notícia (CA-US21.9, E31, E42): a versão escolhida vira a
 * cópia de trabalho. Não publica nada: o estado e a versão no ar não mudam, e o editor mostra "Há
 * alterações que ainda não estão no site". Sobe a revisão, como um salvamento, e fica na Atividade.
 * O do documento está em documentos/versoes.ts.
 */
export async function restaurarVersao(
  entrada: { id: string; versao: number; revisaoBase: number },
  deps: { quem: QuemDaEquipe; urlDoArquivo: UrlDoArquivo; sessaoEdicao?: string },
): Promise<ResultadoRestaurarVersao> {
  exigir(deps.quem, "restaurar_versao", { tipo: "noticia" });
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, entrada.id))! };
    }
    if (atual.estado === "arquivado") {
      throw new ErroConteudo("invalido", "Restaure a notícia como rascunho antes de escolher uma versão.");
    }
    const [linha] = await tx
      .select({ snapshot: conteudoVersao.snapshot })
      .from(conteudoVersao)
      .where(and(eq(conteudoVersao.conteudoId, entrada.id), eq(conteudoVersao.versao, entrada.versao)));
    if (!linha) throw new ErroConteudo("nao_encontrada", "Esta versão não existe. Feche o Histórico e abra de novo.");

    // A versão antiga pode usar um arquivo que já saiu da Mídia (só a versão no ar conta como uso).
    const dados = await validarNoticia(tx, (linha.snapshot as RetratoDaNoticia).dados, deps.urlDoArquivo).catch((erro) => {
      if (erro instanceof ErroConteudo && erro.campo === "midia") {
        throw new ErroConteudo("invalido", "Esta versão usa um arquivo que já foi excluído da Mídia. Não dá para restaurá-la.");
      }
      throw erro;
    });
    await gravarPorCima(tx, entrada.id, dados, deps.quem);
    await registrarAtividadeNoticia(tx, "noticia.restaurar_versao", entrada.id, dados.titulo, deps, { versao: entrada.versao });
    return { tipo: "restaurada", noticia: (await lerNoticia(tx, entrada.id))! };
  });
}

/**
 * Aplica a ação a cada conteúdo, numa transação só. As linhas são travadas na ordem dos ids, para
 * dois lotes ao mesmo tempo não se travarem um ao outro. A ação devolve um texto quando o item
 * não pode recebê-la: ele fica de fora, e os outros seguem.
 */
async function emLote(
  ids: string[],
  acao: (tx: Transacao, atual: Linha) => Promise<string | void>,
): Promise<ResultadoLote> {
  const unicos = [...new Set(ids)].sort();
  if (unicos.length === 0) throw new ErroConteudo("invalido", "Escolha pelo menos um conteúdo.");
  return banco().transaction(async (tx) => {
    const linhas = await tx.select().from(conteudo).where(inArray(conteudo.id, unicos)).orderBy(conteudo.id).for("update");
    const resultado: ResultadoLote = { feitos: [], ignorados: [] };
    for (const id of unicos) {
      const atual = linhas.find((l) => l.id === id);
      if (!atual) {
        resultado.ignorados.push({ id, titulo: "", motivo: "Este conteúdo não existe mais." });
        continue;
      }
      const recusa = await acao(tx, atual);
      if (recusa) resultado.ignorados.push({ id, titulo: rotuloDoConteudo(atual.tipo, atual.titulo), motivo: recusa });
      else resultado.feitos.push(id);
    }
    return resultado;
  });
}
