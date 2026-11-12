import { and, eq, ne, sql } from "drizzle-orm";

import type { Transacao } from "@/lib/db";
import { categoria, documento, midia } from "@/lib/db/schema";
import { ErroConteudo } from "@/lib/conteudos/erros";
import { palavrasDo } from "@/lib/conteudos/tipo-do-conteudo";

import { conferirDocumento, normalizarNumero } from "./conferir";
import type { DadosDocumento, TipoDocumento } from "./dados";

/**
 * Confere o documento vindo da tela (formato e limites, sem o banco) e, no banco: a categoria é de
 * Documentos, o arquivo oficial é um PDF da Mídia (RN12) e o número não se repete no tipo (E46).
 */
export async function validarDocumento(
  tx: Transacao,
  tipo: TipoDocumento,
  entrada: DadosDocumento,
  /** O próprio documento, que pode manter o número que já tem. */
  id?: string,
): Promise<DadosDocumento> {
  const dados = conferirDocumento(tipo, entrada);

  if (dados.categoriaId) {
    const [deDocumentos] = await tx
      .select({ id: categoria.id })
      .from(categoria)
      .where(and(eq(categoria.id, dados.categoriaId), sql`'documentos' = any(${categoria.escopos})`));
    if (!deDocumentos) throw new ErroConteudo("invalido", "Escolha uma categoria de Documentos.", "categoriaId");
  }

  if (dados.pdfMidiaId) {
    const [arquivo] = await tx.select({ tipo: midia.tipo }).from(midia).where(eq(midia.id, dados.pdfMidiaId));
    if (!arquivo) throw new ErroConteudo("invalido", "O PDF escolhido não está mais na Mídia. Envie de novo.", "pdfMidiaId");
    if (arquivo.tipo !== "pdf") throw new ErroConteudo("invalido", "O arquivo oficial precisa ser um PDF.", "pdfMidiaId");
  }

  const normalizado = normalizarNumero(dados.numero);
  if (normalizado) {
    const [repetido] = await tx
      .select({ numero: documento.numero })
      .from(documento)
      .where(
        and(
          eq(documento.tipo, tipo),
          eq(documento.numeroNormalizado, normalizado),
          id ? ne(documento.conteudoId, id) : undefined,
        ),
      );
    if (repetido) throw numeroRepetido(tipo, repetido.numero);
  }
  return dados;
}

export function numeroRepetido(tipo: TipoDocumento, numero: string) {
  return new ErroConteudo("invalido", `Já existe ${palavrasDo(tipo).um} com o número “${numero}”.`, "numero");
}
