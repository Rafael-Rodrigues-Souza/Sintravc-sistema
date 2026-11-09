import { eq } from "drizzle-orm";
import { z } from "zod";

import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { ErroMidia } from "./erros";

const opcional = (maximo: number, mensagem: string) =>
  z
    .string()
    .trim()
    .max(maximo, { error: mensagem })
    .transform((valor) => valor || null);

export const esquemaDetalhes = z.object({
  nomeArquivo: z.string().trim().min(1, { error: "Informe o nome do arquivo." }).max(200, {
    error: "Use até 200 caracteres no nome do arquivo.",
  }),
  alt: opcional(250, "Use até 250 caracteres no texto alternativo."),
  legenda: opcional(300, "Use até 300 caracteres na legenda e crédito."),
});

export type CampoDosDetalhes = keyof typeof esquemaDetalhes.shape;

/**
 * Nome, texto alternativo e "Legenda e crédito" de um arquivo (RF48). O texto alternativo não é
 * obrigatório para guardar: ele é exigido ao publicar (RN15), e a aba "Sem texto alternativo" mostra o que falta.
 */
export async function salvarDetalhesMidia(
  id: string,
  dados: Record<CampoDosDetalhes, string>,
  deps: { quem: QuemDaEquipe },
): Promise<void> {
  exigir(deps.quem, "editar_alt", { tipo: "midia" });
  const validado = esquemaDetalhes.safeParse(dados);
  if (!validado.success) {
    const problema = validado.error.issues[0]!;
    throw new ErroMidia("invalido", problema.message, [], String(problema.path[0]));
  }
  const atualizados = await banco()
    .update(midia)
    .set(validado.data)
    .where(eq(midia.id, id))
    .returning({ id: midia.id });
  if (atualizados.length === 0) {
    throw new ErroMidia("nao_encontrada", "Este arquivo não está mais na Mídia. Atualize a página.");
  }
}
