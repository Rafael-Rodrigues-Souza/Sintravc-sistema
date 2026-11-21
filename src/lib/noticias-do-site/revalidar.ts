import { revalidatePath } from "next/cache";

/**
 * Revalida as páginas públicas das notícias (RNF08, E59): a lista e todas as notícias abertas. O
 * site já é renderizado a cada visita (MolduraSite lê os cookies), então isto é uma garantia para
 * quando alguma página passar a ter cache (#24, SEO). Chamado ao publicar, fixar, desafixar,
 * ocultar, mostrar e arquivar.
 *
 * Fora de um pedido (a T01 e a T05 rodam no trabalhador da fila), o Next recusa a chamada: aí não
 * há o que fazer, e o site dinâmico já mostra o que mudou na próxima visita.
 */
export function revalidarNoticiasDoSite(): void {
  try {
    revalidatePath("/noticias");
    revalidatePath("/noticias/[slug]", "page");
  } catch {
    // Sem pedido em andamento (trabalhador da fila, testes): o site dinâmico cobre.
  }
}
