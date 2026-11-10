import { and, desc, eq, like, or } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { conteudo, conteudoVersao, pessoaEquipe } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { lerNoticia, retratoNoAr, type NoticiaAberta, type RetratoDaNoticia } from "./carregar";
import type { DadosNoticia } from "./dados";
import { ErroConteudo } from "./erros";
import { faltasParaPublicar, type CampoObrigatorio } from "./obrigatorios";
import { gravarPorCima, gravarUsos, registrarAtividadeNoticia, travarNoticia } from "./salvar";

export type DepsDaPublicacao = {
  quem: QuemDaEquipe;
  /** Sessão do editor, só para a Atividade (E40). */
  sessaoEdicao?: string;
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
    if (atual.estado !== "rascunho" && atual.estado !== "publicado") {
      throw new ErroConteudo("invalido", "Esta notícia não pode ser publicada no estado em que está. Atualize a página.");
    }
    if (atual.estado === "publicado" && atual.revisaoPublicada === atual.revisao) {
      return publicada(atual);
    }

    const noticia = (await lerNoticia(tx, entrada.id))!;
    const faltas = faltasParaPublicar(noticia.dados);
    if (faltas.length > 0) throw new ErroFaltamCampos(faltas.map((f) => f.campo));

    const primeira = atual.estado === "rascunho" && !atual.jaPublicado;
    const versao = atual.versao + 1;
    const [gravado] = await tx
      .update(conteudo)
      .set({
        estado: "publicado",
        slug: atual.slug ?? (await slugLivre(tx, noticia.dados.titulo)),
        publicadoEm: atual.publicadoEm ?? new Date(),
        jaPublicado: true,
        versao,
        revisaoPublicada: atual.revisao,
      })
      .where(eq(conteudo.id, entrada.id))
      .returning();

    const retrato: RetratoDaNoticia = { formato: 1, dados: noticia.dados };
    await tx.insert(conteudoVersao).values({ conteudoId: entrada.id, versao, snapshot: retrato, criadoPor: deps.quem.id });
    // A versão anterior saiu do ar: o que só ela usava deixa de contar como uso da Mídia.
    await gravarUsos(tx, entrada.id, noticia.dados);
    await registrarAtividadeNoticia(
      tx,
      primeira ? "noticia.publicar" : "noticia.publicar_alteracoes",
      entrada.id,
      noticia.dados.titulo,
      { quem: deps.quem, sessaoEdicao: deps.sessaoEdicao },
      { versao },
    );
    return publicada(gravado!);
  });
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
  deps: DepsDaPublicacao,
): Promise<ResultadoDescartar> {
  exigir(deps.quem, "editar", { tipo: "noticia" });
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, entrada.id);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, entrada.id))! };
    }
    const noAr = atual.estado === "publicado" ? await retratoNoAr(tx, entrada.id) : null;
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
  constructor(readonly campos: CampoObrigatorio[]) {
    super(
      "invalido",
      campos.length === 1 ? "Falta 1 item obrigatório para publicar." : `Faltam ${campos.length} itens obrigatórios para publicar.`,
      campos[0],
    );
  }
}

/** Endereço da notícia a partir da manchete (P2): sem acento, minúsculo, com hífens. */
export function slugificar(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || "noticia";
}

/** Slug ainda não usado por outra notícia: "x", "x-2", "x-3"... */
async function slugLivre(tx: Transacao, titulo: string) {
  const base = slugificar(titulo);
  const usados = new Set(
    (
      await tx
        .select({ slug: conteudo.slug })
        .from(conteudo)
        .where(and(eq(conteudo.tipo, "noticia"), or(eq(conteudo.slug, base), like(conteudo.slug, `${base}-%`))))
    ).map((l) => l.slug),
  );
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type VersaoPublicada = { versao: number; criadoPor: string; criadoPorNome: string; criadoEm: Date; dados: DadosNoticia };

/** Versões publicadas da notícia, da mais nova para a mais antiga (E31). */
export async function versoesDaNoticia(id: string, deps: { quem: QuemDaEquipe }): Promise<VersaoPublicada[]> {
  exigir(deps.quem, "ver_versoes", { tipo: "noticia" });
  const linhas = await banco()
    .select({ v: conteudoVersao, nome: pessoaEquipe.nome })
    .from(conteudoVersao)
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudoVersao.criadoPor))
    .where(eq(conteudoVersao.conteudoId, id))
    .orderBy(desc(conteudoVersao.versao));
  return linhas.map(({ v, nome }) => ({
    versao: v.versao,
    criadoPor: v.criadoPor,
    criadoPorNome: nome,
    criadoEm: v.criadoEm,
    dados: (v.snapshot as RetratoDaNoticia).dados,
  }));
}
