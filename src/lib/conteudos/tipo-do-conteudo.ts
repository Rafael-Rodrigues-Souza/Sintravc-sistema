/**
 * O que muda entre notícia, edital e acordo nas ações comuns do ciclo de vida (RN10, E46): o recurso
 * da permissão, o nome da ação na Atividade e as palavras das mensagens. O resto do ciclo de vida
 * é igual para todos os tipos.
 */
import { and, eq } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import type { Transacao } from "@/lib/db";
import { conteudo } from "@/lib/db/schema";
import { rotuloDoDocumento } from "@/lib/documentos/dados";
import { pode, SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";

import { rotuloDaNoticia } from "./dados";
import { ErroConteudo } from "./erros";

export type TipoDeConteudo = (typeof conteudo.$inferSelect)["tipo"];
export type LinhaDoConteudo = typeof conteudo.$inferSelect;

/** Ações que notícia e documento têm em comum (spec §4). */
export type AcaoDoConteudo =
  | "ver"
  | "editar"
  | "publicar"
  | "agendar"
  | "ocultar"
  | "arquivar"
  | "restaurar"
  | "excluir"
  | "ver_versoes"
  | "restaurar_versao";

type DadosDaPermissao = Pick<LinhaDoConteudo, "tipo" | "autorId" | "jaPublicado">;

/** pode() com o recurso de cada tipo: edital e acordo são "documento", só do ADM (RN08). */
export function podeNoConteudo(quem: QuemDaEquipe, acao: AcaoDoConteudo, linha: DadosDaPermissao): boolean {
  return linha.tipo === "noticia"
    ? pode(quem, acao, { tipo: "noticia", autorId: linha.autorId, jaPublicado: linha.jaPublicado })
    : pode(quem, acao, { tipo: "documento", jaPublicado: linha.jaPublicado });
}

export function exigirNoConteudo(quem: QuemDaEquipe, acao: AcaoDoConteudo, linha: DadosDaPermissao): void {
  if (!podeNoConteudo(quem, acao, linha)) throw new SemPermissao(acao, linha.tipo === "noticia" ? "noticia" : "documento");
}

/** Nega se a pessoa não pode fazer a ação em nenhum tipo (antes de saber quais itens vêm). */
export function exigirEmAlgumTipo(quem: QuemDaEquipe, acao: Exclude<AcaoDoConteudo, "excluir">): void {
  if (!pode(quem, acao, { tipo: "noticia" }) && !pode(quem, acao, { tipo: "documento" })) throw new SemPermissao(acao, "noticia");
}

/** Prefixo da ação na Atividade e dono na `midia_uso`: "noticia" ou "documento". */
export function familiaDo(tipo: TipoDeConteudo): "noticia" | "documento" {
  return tipo === "noticia" ? "noticia" : "documento";
}

export function rotuloDoConteudo(tipo: TipoDeConteudo, titulo: string): string {
  return tipo === "noticia" ? rotuloDaNoticia(titulo) : rotuloDoDocumento(tipo, titulo);
}

/** Endereço do editor no painel. */
export function editorDo(tipo: TipoDeConteudo, id: string): string {
  return `/painel/conteudos/${familiaDo(tipo)}/${id}`;
}

/** Palavras das mensagens: "Esta notícia está arquivada", "Este edital está arquivado". */
export function palavrasDo(tipo: TipoDeConteudo) {
  const feminino = tipo === "noticia";
  return {
    este: { noticia: "Esta notícia", edital: "Este edital", acordo: "Este acordo" }[tipo],
    /** "arquivad" → "arquivada" ou "arquivado". */
    o: (radical: string) => `${radical}${feminino ? "a" : "o"}`,
    um: { noticia: "uma notícia", edital: "um edital", acordo: "um acordo" }[tipo],
  };
}

export const conteudoArquivado = (tipo: TipoDeConteudo) => {
  const p = palavrasDo(tipo);
  return new ErroConteudo("invalido", `${p.este} está ${p.o("arquivad")}. Restaure como rascunho para editar.`);
};

export const conteudoNaoEncontrado = (tipo: TipoDeConteudo) => {
  const p = palavrasDo(tipo);
  return new ErroConteudo("nao_encontrada", `${p.este} não existe mais. Volte para Conteúdos e atualize a lista.`);
};

/** Trava a linha do conteúdo (de qualquer tipo, ou só do tipo pedido) até o fim da transação. */
export async function travarConteudo(tx: Transacao, id: string, tipos?: readonly TipoDeConteudo[]): Promise<LinhaDoConteudo> {
  const [atual] = await tx.select().from(conteudo).where(eq(conteudo.id, id)).for("update");
  if (!atual || (tipos && !tipos.includes(atual.tipo))) {
    throw tipos?.length === 1 ? conteudoNaoEncontrado(tipos[0]!) : new ErroConteudo("nao_encontrada", "Este conteúdo não existe mais. Volte para Conteúdos e atualize a lista.");
  }
  return atual;
}

/** Busca sem travar, para conferir o tipo antes de escolher a regra. */
export async function tipoDe(tx: Transacao, id: string): Promise<TipoDeConteudo | null> {
  const [linha] = await tx.select({ tipo: conteudo.tipo }).from(conteudo).where(and(eq(conteudo.id, id)));
  return linha?.tipo ?? null;
}

/** Registro na Atividade (na transação da ação, T1): "noticia.ocultar", "documento.publicar"… */
export async function registrarAtividadeConteudo(
  tx: Transacao,
  alvo: { id: string; tipo: TipoDeConteudo; titulo: string },
  verbo: string,
  deps: { quem: QuemDaEquipe; sessaoEdicao?: string },
  detalhe: Record<string, unknown> = {},
  motivo?: string,
) {
  await registrarAtividade(tx, {
    ator: { tipo: "pessoa", id: deps.quem.id },
    acao: `${familiaDo(alvo.tipo)}.${verbo}`,
    area: "conteudos",
    alvo: { tipo: alvo.tipo, id: alvo.id, rotulo: rotuloDoConteudo(alvo.tipo, alvo.titulo) },
    detalhe: deps.sessaoEdicao ? { ...detalhe, sessao: deps.sessaoEdicao } : detalhe,
    motivo,
  });
}
