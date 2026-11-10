import { desc, eq, sql } from "drizzle-orm";

import { banco } from "@/lib/db";
import { atividade, pessoaEquipe } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { agendarNaTransacao, cancelarNaTransacao, reagendarNaTransacao, type DepsDoAgendamento } from "./agendar";
import { lerNoticia, type NoticiaAberta } from "./carregar";
import { ErroConteudo } from "./erros";
import { temAlteracoesNaoPublicadas } from "./publicacao";
import { publicarNaTransacao } from "./publicar";
import { gravarPorCima, registrarAtividadeNoticia, travarNoticia } from "./salvar";
import { validarNoticia, type UrlDoArquivo } from "./validar";

/** "Situação no site" da Edição rápida. Oculto chega no #11. */
export type SituacaoEdicaoRapida = "rascunho" | "agendado" | "publicado";

export type EntradaEdicaoRapida = {
  id: string;
  revisaoBase: number;
  titulo: string;
  categoriaId: string | null;
  situacao: SituacaoEdicaoRapida;
  /** Com "agendado": a data e hora (a tela converte do horário da Bahia). */
  para: Date | null;
};

export type ResultadoEdicaoRapida =
  | {
      tipo: "salva";
      estado: NoticiaAberta["estado"];
      agendadoPara: Date | null;
      revisao: number;
      /** Publicada com o título ou a categoria mudados só na cópia de trabalho (E42, E44). */
      temAlteracoesNaoPublicadas: boolean;
    }
  | { tipo: "conflito"; servidor: NoticiaAberta };

/**
 * Edição rápida (RF36, Figma 115:2324): título, categoria, situação e data sem sair da lista.
 * Tudo numa transação só: se não der para agendar ou publicar, o título também não é gravado.
 * Na notícia publicada, título e categoria vão para a cópia de trabalho e só chegam ao site com
 * "Publicar alterações" (E42, E44).
 */
export async function salvarEdicaoRapida(
  entrada: EntradaEdicaoRapida,
  deps: DepsDoAgendamento & { urlDoArquivo: UrlDoArquivo },
): Promise<ResultadoEdicaoRapida> {
  exigir(deps.quem, "editar", { tipo: "noticia" });
  return banco().transaction(async (tx) => {
    let atual = await travarNoticia(tx, entrada.id);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, entrada.id))! };
    }
    if (atual.estado === "publicado" && entrada.situacao !== "publicado") {
      throw new ErroConteudo("invalido", "Para tirar do site, use Ocultar ou Arquivar no editor.", "situacao");
    }
    if (atual.estado !== "rascunho" && atual.estado !== "agendado" && atual.estado !== "publicado") {
      throw new ErroConteudo("invalido", "Esta notícia não pode ser alterada pela Edição rápida. Abra o editor completo.");
    }

    const noticia = (await lerNoticia(tx, entrada.id))!;
    if (noticia.dados.titulo !== entrada.titulo || noticia.dados.categoriaId !== entrada.categoriaId) {
      const dados = await validarNoticia(tx, { ...noticia.dados, titulo: entrada.titulo, categoriaId: entrada.categoriaId }, deps.urlDoArquivo);
      await gravarPorCima(tx, entrada.id, dados, deps.quem);
      await registrarAtividadeNoticia(tx, "noticia.editar", entrada.id, dados.titulo, deps, { origem: "edicao_rapida" });
      atual = await travarNoticia(tx, entrada.id);
    }

    if (entrada.situacao === "agendado") {
      if (!entrada.para) throw new ErroConteudo("invalido", "Escolha a data e a hora.", "agendadoPara");
      if (atual.estado === "rascunho") await agendarNaTransacao(tx, atual, entrada.para, deps);
      else if (atual.agendadoPara?.getTime() !== entrada.para.getTime()) await reagendarNaTransacao(tx, atual, entrada.para, deps);
    } else if (entrada.situacao === "rascunho") {
      if (atual.estado === "agendado") await cancelarNaTransacao(tx, atual, deps);
    } else if (atual.estado !== "publicado") {
      await publicarNaTransacao(tx, atual, deps);
    }

    const final = await travarNoticia(tx, entrada.id);
    return {
      tipo: "salva",
      estado: final.estado,
      agendadoPara: final.agendadoPara,
      revisao: final.revisao,
      temAlteracoesNaoPublicadas: temAlteracoesNaoPublicadas(final),
    };
  });
}

export type AcaoRecente = { acao: string; quemNome: string | null; quando: Date; detalhe: Record<string, unknown> };

/** "Últimas ações" da Edição rápida: as mais recentes primeiro (id é uuidv7). */
export async function ultimasAcoes(id: string, deps: { quem: QuemDaEquipe }, limite = 5): Promise<AcaoRecente[]> {
  exigir(deps.quem, "ver", { tipo: "noticia" });
  const linhas = await banco()
    .select({ acao: atividade.acao, quemNome: pessoaEquipe.nome, quando: atividade.quando, detalhe: atividade.detalhe })
    .from(atividade)
    .leftJoin(pessoaEquipe, eq(sql`${pessoaEquipe.id}::text`, atividade.atorId))
    .where(eq(atividade.alvoId, id))
    .orderBy(desc(atividade.id))
    .limit(limite);
  return linhas;
}
