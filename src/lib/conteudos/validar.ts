import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import type { Transacao } from "@/lib/db";
import { categoria, midia } from "@/lib/db/schema";

import { limparCorpo, midiasDoCorpo } from "./corpo";
import { LIMITE_LINHA_FINA, LIMITE_MANCHETE, type DadosNoticia } from "./dados";
import { ErroConteudo } from "./erros";

const texto = (maximo: number, mensagem: string) => z.string().trim().max(maximo, { error: mensagem });

const link = z.object({
  tipo: z.enum(["fonte", "anexo"]),
  titulo: texto(200, "O título do link pode ter até 200 caracteres."),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((u) => /^https?:\/\//i.test(u), { error: "O link precisa começar com http:// ou https://." })
    .nullable(),
  midiaId: z.uuid().nullable(),
  visivel: z.boolean(),
});

/**
 * Formato aceito do rascunho (RF37). No rascunho tudo pode ficar vazio (E40); os limites valem
 * sempre. Os limites de manchete e linha fina são do spec §2.2; os outros só protegem o banco.
 */
const esquema = z.object({
  titulo: texto(LIMITE_MANCHETE, `A manchete pode ter até ${LIMITE_MANCHETE} caracteres.`),
  linhaFina: texto(LIMITE_LINHA_FINA, `A linha fina pode ter até ${LIMITE_LINHA_FINA} caracteres.`),
  lide: texto(2000, "O lide pode ter até 2.000 caracteres."),
  corpo: z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() }),
  capaMidiaId: z.uuid().nullable(),
  capaAlt: texto(250, "O texto alternativo pode ter até 250 caracteres."),
  capaLegenda: texto(300, "A legenda e crédito pode ter até 300 caracteres."),
  assinatura: texto(120, "A assinatura pode ter até 120 caracteres."),
  local: texto(120, "O local pode ter até 120 caracteres."),
  categoriaId: z.uuid().nullable(),
  palavrasChave: z
    .array(texto(50, "Cada palavra-chave pode ter até 50 caracteres."))
    .max(20, { error: "Use até 20 palavras-chave." }),
  links: z.array(link).max(30, { error: "Use até 30 fontes, links e anexos." }),
});

/**
 * Confere os dados vindos da tela (não confiáveis) e devolve a versão limpa. Também confere no
 * banco: a categoria tem de ser de Notícias e as mídias têm de existir.
 */
export async function validarNoticia(tx: Transacao, entrada: DadosNoticia): Promise<DadosNoticia> {
  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    const problema = validado.error.issues[0]!;
    throw new ErroConteudo("invalido", problema.message, String(problema.path[0]));
  }
  const dados = { ...(validado.data as DadosNoticia), corpo: limparCorpo(validado.data.corpo) };
  dados.palavrasChave = [...new Set(dados.palavrasChave.filter(Boolean))];

  if (dados.categoriaId) {
    const [daNoticia] = await tx
      .select({ id: categoria.id })
      .from(categoria)
      .where(and(eq(categoria.id, dados.categoriaId), sql`'noticias' = any(${categoria.escopos})`));
    if (!daNoticia) {
      throw new ErroConteudo("invalido", "Escolha uma categoria de Notícias.", "categoriaId");
    }
  }

  const midias = midiasDaNoticia(dados);
  if (midias.length > 0) {
    const existentes = await tx.select({ id: midia.id }).from(midia).where(inArray(midia.id, midias));
    if (new Set(existentes.map((m) => m.id)).size !== new Set(midias).size) {
      throw new ErroConteudo("invalido", "Um arquivo escolhido não está mais na Mídia. Escolha outro.", "midia");
    }
  }
  return dados;
}

/** Todos os arquivos da Mídia que a notícia usa: capa, imagens do corpo e anexos (RN16). */
export function midiasDaNoticia(dados: DadosNoticia): string[] {
  const ids = [dados.capaMidiaId, ...midiasDoCorpo(dados.corpo), ...dados.links.map((l) => l.midiaId)];
  return [...new Set(ids.filter((id): id is string => !!id))];
}
