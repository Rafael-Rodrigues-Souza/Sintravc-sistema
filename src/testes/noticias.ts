import { eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { atividade, categoria } from "@/lib/db/schema";
import { noticiaVazia, type DadosNoticia } from "@/lib/conteudos/dados";
import { salvarRascunhoNoticia } from "@/lib/conteudos/salvar";
import type { QuemDaEquipe } from "@/lib/permissoes";

import { edicaoDe } from "./equipe";

export async function idDaCategoria(nome: string) {
  const [linha] = await banco().select({ id: categoria.id }).from(categoria).where(eq(categoria.nome, nome));
  return linha!.id;
}

/** Notícia com todos os obrigatórios preenchidos (pode ir ao ar). */
export async function noticiaCompleta(mudancas: Partial<DadosNoticia> = {}): Promise<DadosNoticia> {
  return {
    ...noticiaVazia(),
    titulo: "Assembleia da categoria no sábado",
    lide: "A partir de segunda, o plantão funciona das 8h às 17h.",
    corpo: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Leve seus contracheques." }] }] },
    categoriaId: await idDaCategoria("Jurídico"),
    assinatura: "Redação SINTRAVC",
    ...mudancas,
  };
}

/** Rascunho salvo pelo editor, como a tela faria. */
export async function rascunhoSalvo(quem: QuemDaEquipe, dados: DadosNoticia) {
  const r = await salvarRascunhoNoticia({ dados }, edicaoDe(quem));
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  return r;
}

/** Atividade de um alvo, na ordem em que aconteceu (id é uuidv7). */
export async function atividadesDe(id: string) {
  return banco()
    .select({ acao: atividade.acao, atorTipo: atividade.atorTipo, atorId: atividade.atorId, detalhe: atividade.detalhe, motivo: atividade.motivo })
    .from(atividade)
    .where(eq(atividade.alvoId, id))
    .orderBy(atividade.id);
}
