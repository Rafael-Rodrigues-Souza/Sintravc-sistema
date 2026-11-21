import { and, desc, eq, like, or } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { conteudo, conteudoVersao, pessoaEquipe } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { lerNoticia, retratoNoAr, type NoticiaAberta, type RetratoDaNoticia } from "./carregar";
import type { DadosNoticia } from "./dados";
import { ErroConteudo } from "./erros";
import { aplicarFixacaoAoPublicar, type FixacaoAoPublicar } from "./fixar";
import { jaFoiAoAr } from "./publicacao";
import { copiaDeTrabalho, type CopiaDeTrabalho } from "./copia-de-trabalho";
import { gravarPorCima, registrarAtividadeNoticia, travarNoticia } from "./salvar";
import type { TipoDeConteudo } from "./tipo-do-conteudo";
import { resumirMudancas } from "./versoes";

export type DepsDaPublicacao = {
  quem: QuemDaEquipe;
  /** Sessão do editor, só para a Atividade (E40). */
  sessaoEdicao?: string;
  /** Para a T05 da notícia fixada (E59): a intenção de fixar vale ao publicar. */
  fila: Fila;
  agora?: Date;
};

export type ResultadoPublicar =
  | { tipo: "publicada"; versao: number; revisaoPublicada: number; publicadoEm: Date; slug: string }
  /** Alguém salvou depois da `revisaoBase`: nada foi publicado; a pessoa escolhe a versão (N4). */
  | { tipo: "conflito"; servidor: NoticiaAberta };

/**
 * Publica agora a notícia (RF39, RN10, E42). Confere a permissão, a revisão (a pessoa publica o
 * que está vendo) e os obrigatórios. Gera a versão e o registro na Atividade na mesma transação.
 * Publicar de novo sem nada novo não gera outra versão (duplo clique, nova tentativa).
 */
export async function publicarNoticia(
  entrada: { id: string; revisaoBase: number },
  deps: DepsDaPublicacao,
): Promise<ResultadoPublicar> {
  exigir(deps.quem, "publicar", { tipo: "noticia" });
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, entrada.id))! };
    }
    return publicarNaTransacao(tx, atual, deps);
  });
}

/** "Publicar agora" dentro de uma transação já aberta, com a notícia travada (também usada pela Edição rápida). */
export async function publicarNaTransacao(
  tx: Transacao,
  atual: typeof conteudo.$inferSelect,
  deps: DepsDaPublicacao,
): Promise<Extract<ResultadoPublicar, { tipo: "publicada" }>> {
  exigir(deps.quem, "publicar", { tipo: "noticia" });
  if (atual.estado !== "rascunho" && atual.estado !== "agendado" && atual.estado !== "publicado") {
    throw new ErroConteudo("invalido", "Esta notícia não pode ser publicada no estado em que está. Atualize a página.");
  }
  if (atual.estado === "publicado" && atual.revisaoPublicada === atual.revisao) {
    return publicada(atual);
  }
  const agora = deps.agora ?? new Date();
  const copia = await copiaDeTrabalho(tx, atual);
  const { gravado, versao, primeira } = await irAoAr(tx, atual, copia, { criadoPor: deps.quem.id, agora });
  const fixacao = await aplicarFixacaoAoPublicar(tx, atual.id, {
    agora,
    ator: { tipo: "pessoa", id: deps.quem.id },
    fila: deps.fila,
    jaEstavaNoAr: atual.estado === "publicado",
  });
  await registrarAtividadeNoticia(
    tx,
    primeira ? "noticia.publicar" : "noticia.publicar_alteracoes",
    atual.id,
    copia.titulo,
    { quem: deps.quem, sessaoEdicao: deps.sessaoEdicao },
    { versao, ...detalheDaFixacao(fixacao) },
  );
  return publicada(gravado);
}

/**
 * Põe no ar a cópia de trabalho de um conteúdo já travado, de qualquer tipo (E42, E46): confere os
 * obrigatórios, grava o estado, o slug, a data e a versão, e o retrato. O mesmo núcleo serve ao
 * "Publicar agora" e à publicação agendada (T01, E44). Quem chama registra a Atividade.
 */
export async function irAoAr(
  tx: Transacao,
  atual: typeof conteudo.$inferSelect,
  copia: CopiaDeTrabalho,
  opcoes: { criadoPor: string; agora: Date },
) {
  if (copia.faltas.length > 0) {
    throw new ErroFaltamCampos(
      copia.faltas.map((f) => f.campo),
      atual.tipo === "noticia" ? undefined : copia.faltas.map((f) => f.rotulo),
    );
  }

  const primeira = !atual.jaPublicado;
  const versao = atual.versao + 1;
  const [gravado] = await tx
    .update(conteudo)
    .set({
      estado: "publicado",
      slug: atual.slug ?? (await slugLivre(tx, atual.tipo, copia.titulo)),
      publicadoEm: atual.publicadoEm ?? opcoes.agora,
      jaPublicado: true,
      versao,
      revisaoPublicada: atual.revisao,
      // "Publicar agora" numa agendada tira da agenda (E44).
      agendadoPara: null,
      agendadoPor: null,
    })
    .where(eq(conteudo.id, atual.id))
    .returning();

  await tx.insert(conteudoVersao).values({ conteudoId: atual.id, versao, snapshot: copia.retrato, criadoPor: opcoes.criadoPor });
  // A versão anterior saiu do ar: o que só ela usava deixa de contar como uso da Mídia.
  await copia.gravarUsos(tx);
  return { gravado: gravado!, versao, primeira };
}

/** O que a fixação aplicada ao publicar acrescenta ao registro da publicação na Atividade (E59). */
export function detalheDaFixacao(fixacao: FixacaoAoPublicar): Record<string, unknown> {
  if (fixacao.tipo === "fixada") return { fixada_ate: fixacao.fixadaAte.toISOString() };
  if (fixacao.tipo === "vencida") return { fixacao_vencida: true };
  return {};
}

function publicada(linha: typeof conteudo.$inferSelect): Extract<ResultadoPublicar, { tipo: "publicada" }> {
  return {
    tipo: "publicada",
    versao: linha.versao,
    revisaoPublicada: linha.revisaoPublicada!,
    publicadoEm: linha.publicadoEm!,
    slug: linha.slug!,
  };
}

export type ResultadoDescartar = { tipo: "descartada"; noticia: NoticiaAberta } | { tipo: "conflito"; servidor: NoticiaAberta };

/**
 * "Descartar alterações" (E42): a cópia de trabalho volta a ser igual à versão no ar. Não gera
 * versão; sobe a revisão (o editor passa a trabalhar sobre ela) e fica na Atividade.
 */
export async function descartarAlteracoes(
  entrada: { id: string; revisaoBase: number },
  deps: Omit<DepsDaPublicacao, "fila" | "agora">,
): Promise<ResultadoDescartar> {
  exigir(deps.quem, "editar", { tipo: "noticia" });
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, entrada.id))! };
    }
    // Publicada ou oculta: a cópia de trabalho volta à versão que foi ao ar (E42, E45).
    const noAr = jaFoiAoAr(atual.estado) ? await retratoNoAr(tx, entrada.id) : null;
    if (!noAr) {
      throw new ErroConteudo("invalido", "Esta notícia não está no ar, então não há alterações para descartar.");
    }
    const { revisao } = await gravarPorCima(tx, entrada.id, noAr.dados, deps.quem);
    await tx.update(conteudo).set({ revisaoPublicada: revisao }).where(eq(conteudo.id, entrada.id));
    await registrarAtividadeNoticia(tx, "noticia.descartar_alteracoes", entrada.id, noAr.dados.titulo, deps, {
      versao: atual.versao,
    });
    return { tipo: "descartada", noticia: (await lerNoticia(tx, entrada.id))! };
  });
}

/** Faltam campos obrigatórios para publicar (CA-US21.3). A tela indica cada um. */
export class ErroFaltamCampos extends ErroConteudo {
  constructor(
    readonly campos: string[],
    /** Nomes dos campos para o aviso de falha (M06), quando não são os da notícia (documento). */
    readonly rotulos?: string[],
  ) {
    super(
      "invalido",
      campos.length === 1 ? "Falta 1 item obrigatório para publicar." : `Faltam ${campos.length} itens obrigatórios para publicar.`,
      campos[0],
    );
  }
}

/** Endereço do conteúdo a partir do título (P2): sem acento, minúsculo, com hífens. */
export function slugificar(titulo: string, seVazio = "noticia"): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || seVazio;
}

/** Slug ainda não usado por outro conteúdo do mesmo tipo: "x", "x-2", "x-3"... */
async function slugLivre(tx: Transacao, tipo: TipoDeConteudo, titulo: string) {
  const base = slugificar(titulo, tipo === "noticia" ? "noticia" : tipo);
  const usados = new Set(
    (
      await tx
        .select({ slug: conteudo.slug })
        .from(conteudo)
        .where(and(eq(conteudo.tipo, tipo), or(eq(conteudo.slug, base), like(conteudo.slug, `${base}-%`))))
    ).map((l) => l.slug),
  );
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type VersaoPublicada = {
  versao: number;
  criadoPor: string;
  criadoPorNome: string;
  criadoEm: Date;
  /** É a versão que o site mostra agora (a notícia está publicada e esta é a `versao` atual). */
  noAr: boolean;
  /** A notícia está oculta e esta é a versão que volta com "Mostrar no site" (E45). */
  voltaAoSite: boolean;
  /** O que mudou em relação à versão anterior (N14). */
  resumo: string;
  dados: DadosNoticia;
};

/** Versões publicadas da notícia, da mais nova para a mais antiga (E31, N14). */
export async function versoesDaNoticia(id: string, deps: { quem: QuemDaEquipe }): Promise<VersaoPublicada[]> {
  exigir(deps.quem, "ver_versoes", { tipo: "noticia" });
  const [linhas, [atual]] = await Promise.all([
    banco()
      .select({ v: conteudoVersao, nome: pessoaEquipe.nome })
      .from(conteudoVersao)
      .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudoVersao.criadoPor))
      .where(eq(conteudoVersao.conteudoId, id))
      .orderBy(desc(conteudoVersao.versao)),
    banco().select({ estado: conteudo.estado, versao: conteudo.versao }).from(conteudo).where(eq(conteudo.id, id)),
  ]);
  return linhas.map(({ v, nome }, i) => {
    const dados = (v.snapshot as RetratoDaNoticia).dados;
    const anterior = linhas[i + 1];
    return {
      versao: v.versao,
      criadoPor: v.criadoPor,
      criadoPorNome: nome,
      criadoEm: v.criadoEm,
      noAr: atual?.estado === "publicado" && atual.versao === v.versao,
      voltaAoSite: atual?.estado === "oculto" && atual.versao === v.versao,
      resumo: resumirMudancas(anterior ? (anterior.v.snapshot as RetratoDaNoticia).dados : null, dados),
      dados,
    };
  });
}
