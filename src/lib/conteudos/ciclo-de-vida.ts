import { and, eq, inArray } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { conteudo, conteudoVersao, midiaUso } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { lerNoticia, type NoticiaAberta, type RetratoDaNoticia } from "./carregar";
import { rotuloDaNoticia } from "./dados";
import { ErroConteudo } from "./erros";
import { gravarPorCima, registrarAtividadeNoticia, travarNoticia } from "./salvar";
import { validarNoticia, type UrlDoArquivo } from "./validar";

/**
 * Ciclo de vida da notícia (RN10, RN11, RN54, E07, E31, E45): ocultar, mostrar no site, arquivar
 * (também em lote, com desfazer), restaurar como rascunho, excluir o rascunho que nunca foi ao ar e
 * restaurar uma versão. Cada ação roda numa transação só, com a linha travada, e registra a
 * Atividade nessa mesma transação (spec §11 T1). Em lote, cada notícia ganha a sua linha na
 * Atividade, para o histórico de cada uma ficar completo.
 */

type Linha = typeof conteudo.$inferSelect;

/** Resultado de uma ação em lote: as que mudaram e as que ficaram de fora (com o porquê). */
export type ResultadoLote = { feitos: string[]; ignorados: { id: string; titulo: string; motivo: string }[] };

export const MOTIVO_OCULTAR_MAXIMO = 500;

/** Ocultar (RN11): só o que está publicado; o motivo é obrigatório e fica na Atividade. */
export async function ocultarNoticias(entrada: { ids: string[]; motivo: string }, deps: { quem: QuemDaEquipe }): Promise<ResultadoLote> {
  exigir(deps.quem, "ocultar", { tipo: "noticia" });
  const motivo = conferirMotivo(entrada.motivo);
  return emLote(entrada.ids, async (tx, atual) => {
    if (atual.estado !== "publicado") return "Só o que está publicado pode ser ocultado.";
    await ocultarNaTransacao(tx, atual, motivo, deps);
  });
}

/** Ocultar dentro de uma transação já aberta, com a notícia travada e publicada (também usada pela Edição rápida). */
export async function ocultarNaTransacao(tx: Transacao, atual: Linha, motivoDigitado: string, deps: { quem: QuemDaEquipe; sessaoEdicao?: string }) {
  exigir(deps.quem, "ocultar", { tipo: "noticia" });
  const motivo = conferirMotivo(motivoDigitado);
  if (atual.estado !== "publicado") throw new ErroConteudo("invalido", "Só o que está publicado pode ser ocultado. Atualize a página.");
  await tx.update(conteudo).set({ estado: "oculto", motivoOculto: motivo, ocultadoEm: new Date() }).where(eq(conteudo.id, atual.id));
  await registrarAtividadeNoticia(tx, "noticia.ocultar", atual.id, atual.titulo, deps, {}, motivo);
}

/**
 * "Mostrar no site" (Oculto → Publicado, RN10, E45): volta a versão que estava no ar, sem gerar
 * versão nova. O que foi editado enquanto estava oculta continua na cópia de trabalho, com o aviso
 * "Há alterações que ainda não estão no site" (E42).
 */
export async function mostrarNoSite(entrada: { id: string }, deps: { quem: QuemDaEquipe; sessaoEdicao?: string }): Promise<void> {
  exigir(deps.quem, "publicar", { tipo: "noticia" });
  await banco().transaction(async (tx) => mostrarNaTransacao(tx, await travarNoticia(tx, entrada.id), deps));
}

/** "Mostrar no site" dentro de uma transação já aberta, com a notícia travada (também usada pela Edição rápida). */
export async function mostrarNaTransacao(tx: Transacao, atual: Linha, deps: { quem: QuemDaEquipe; sessaoEdicao?: string }) {
  exigir(deps.quem, "publicar", { tipo: "noticia" });
  if (atual.estado !== "oculto") {
    throw new ErroConteudo("invalido", "Esta notícia não está oculta. Atualize a página.");
  }
  await tx.update(conteudo).set({ estado: "publicado", motivoOculto: null, ocultadoEm: null }).where(eq(conteudo.id, atual.id));
  await registrarAtividadeNoticia(tx, "noticia.mostrar", atual.id, atual.titulo, deps, { versao: atual.versao });
}

/**
 * Arquivar (RN10, E45): sai do site e das listas e vai para Arquivados, com histórico e anexos
 * (a `midia_uso` continua). Vale para qualquer estado, menos o arquivado. O estado de antes fica
 * guardado para o "Desfazer". A agendada sai da agenda: a data fica guardada, mas o pedido da
 * fila não faz nada, porque o estado não é mais agendado (aindaAgendada, E44).
 */
export async function arquivarNoticias(entrada: { ids: string[] }, deps: { quem: QuemDaEquipe }): Promise<ResultadoLote> {
  exigir(deps.quem, "arquivar", { tipo: "noticia" });
  return emLote(entrada.ids, async (tx, atual) => {
    if (atual.estado === "arquivado") return "Já está arquivado.";
    await tx
      .update(conteudo)
      .set({ estado: "arquivado", estadoAntesDeArquivar: atual.estado })
      .where(eq(conteudo.id, atual.id));
    await registrarAtividadeNoticia(tx, "noticia.arquivar", atual.id, atual.titulo, deps, { estado_anterior: atual.estado });
  });
}

/**
 * "Desfazer" do aviso de arquivamento (E45): cada notícia volta ao estado de antes, com o que tinha
 * (a oculta, com o mesmo motivo). A agendada volta para a agenda, com um pedido novo na fila, se a
 * data ainda não passou; se passou, volta como rascunho, sem data.
 */
export async function desfazerArquivamento(
  entrada: { ids: string[] },
  deps: { quem: QuemDaEquipe; fila: Fila; agora?: Date },
): Promise<ResultadoLote> {
  exigir(deps.quem, "arquivar", { tipo: "noticia" });
  const agora = deps.agora ?? new Date();
  return emLote(entrada.ids, async (tx, atual) => {
    if (atual.estado !== "arquivado" || !atual.estadoAntesDeArquivar) return "Não está mais arquivado.";
    let estado = atual.estadoAntesDeArquivar;
    if (estado === "agendado" && !(atual.agendadoPara && atual.agendadoPara.getTime() > agora.getTime())) estado = "rascunho";
    const agenda = estado === "agendado" ? {} : { agendadoPara: null, agendadoPor: null };
    await tx
      .update(conteudo)
      .set({ estado, estadoAntesDeArquivar: null, ...agenda })
      .where(eq(conteudo.id, atual.id));
    if (estado === "agendado") await deps.fila.agendarPublicacao(tx, { conteudoId: atual.id, para: atual.agendadoPara! });
    await registrarAtividadeNoticia(tx, "noticia.desfazer_arquivamento", atual.id, atual.titulo, deps, { estado });
  });
}

/**
 * "Restaurar como rascunho" (Arquivado → Rascunho, RN10): fica fora do site até alguém publicar.
 * Guarda as versões, o endereço e a marca de já publicado (por isso não pode ser excluída, RN54).
 */
export async function restaurarComoRascunho(entrada: { id: string }, deps: { quem: QuemDaEquipe }): Promise<void> {
  exigir(deps.quem, "restaurar", { tipo: "noticia" });
  await banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    if (atual.estado !== "arquivado") {
      throw new ErroConteudo("invalido", "Esta notícia não está mais arquivada. Atualize a página.");
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
    await registrarAtividadeNoticia(tx, "noticia.restaurar", atual.id, atual.titulo, deps, {
      estado_anterior: atual.estadoAntesDeArquivar,
    });
  });
}

/**
 * Excluir de vez (RN54, E07, CA-US22.3): só o rascunho que nunca foi ao ar, pelo autor ou pelo
 * Administrador geral. Na mesma transação: a `midia_uso` da notícia (não tem chave estrangeira
 * para `conteudo`; sem isso os arquivos ficariam "em uso" para sempre, RN16), a notícia (a
 * cascata leva o texto e os links) e o registro na Atividade.
 */
export async function excluirRascunho(entrada: { id: string }, deps: { quem: QuemDaEquipe }): Promise<void> {
  await banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    exigir(deps.quem, "excluir", { tipo: "noticia", autorId: atual.autorId, jaPublicado: atual.jaPublicado });
    if (atual.estado !== "rascunho") {
      throw new ErroConteudo("invalido", "Só um rascunho pode ser excluído. Cancele o agendamento antes.");
    }
    await tx.delete(midiaUso).where(and(eq(midiaUso.donoTipo, "noticia"), eq(midiaUso.donoId, atual.id)));
    await tx.delete(conteudo).where(eq(conteudo.id, atual.id));
    await registrarAtividadeNoticia(tx, "noticia.excluir", atual.id, atual.titulo, deps, { autor_id: atual.autorId });
  });
}

export type ResultadoRestaurarVersao =
  | { tipo: "restaurada"; noticia: NoticiaAberta }
  /** Alguém salvou depois da `revisaoBase`: nada mudou; a pessoa escolhe a versão (N4). */
  | { tipo: "conflito"; servidor: NoticiaAberta };

/**
 * "Restaurar como rascunho" no Histórico (CA-US21.9, E31, E42): a versão escolhida vira a cópia de
 * trabalho. Não publica nada: o estado e a versão no ar não mudam, e o editor mostra "Há alterações
 * que ainda não estão no site". Sobe a revisão, como um salvamento, e fica na Atividade.
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

/** O motivo do ocultar, sem espaços nas pontas: obrigatório e com limite (RN11). */
export function conferirMotivo(motivo: string) {
  const limpo = motivo.trim();
  if (!limpo) throw new ErroConteudo("invalido", "Escreva o motivo para ocultar.", "motivo");
  if (limpo.length > MOTIVO_OCULTAR_MAXIMO) {
    throw new ErroConteudo("invalido", `O motivo pode ter até ${MOTIVO_OCULTAR_MAXIMO} caracteres.`, "motivo");
  }
  return limpo;
}

/**
 * Aplica a ação a cada notícia, numa transação só. As linhas são travadas na ordem dos ids, para
 * dois lotes ao mesmo tempo não se travarem um ao outro. A ação devolve um texto quando a notícia
 * não pode recebê-la: ela fica de fora, e as outras seguem.
 */
async function emLote(
  ids: string[],
  acao: (tx: Transacao, atual: Linha) => Promise<string | void>,
): Promise<ResultadoLote> {
  const unicos = [...new Set(ids)].sort();
  if (unicos.length === 0) throw new ErroConteudo("invalido", "Escolha pelo menos um conteúdo.");
  return banco().transaction(async (tx) => {
    const linhas = await tx
      .select()
      .from(conteudo)
      .where(and(inArray(conteudo.id, unicos), eq(conteudo.tipo, "noticia")))
      .orderBy(conteudo.id)
      .for("update");
    const resultado: ResultadoLote = { feitos: [], ignorados: [] };
    for (const id of unicos) {
      const atual = linhas.find((l) => l.id === id);
      if (!atual) {
        resultado.ignorados.push({ id, titulo: "", motivo: "Este conteúdo não existe mais." });
        continue;
      }
      const recusa = await acao(tx, atual);
      if (recusa) resultado.ignorados.push({ id, titulo: rotuloDaNoticia(atual.titulo), motivo: recusa });
      else resultado.feitos.push(id);
    }
    return resultado;
  });
}
