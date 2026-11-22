import { revalidatePath } from "next/cache";

/**
 * Revalida as páginas públicas que mostram conteúdo (RNF08, E59, E60): a lista de notícias e as
 * notícias abertas, as abas de Documentos e os documentos abertos, e o Rádio Chofer (E61). O site já é renderizado a cada
 * visita (MolduraSite lê os cookies), então isto é uma garantia para quando alguma página passar a
 * ter cache (#24, SEO). Chamado ao publicar (notícia e documento, inclusive publicar alterações e
 * a publicação agendada), fixar, desafixar, ocultar, mostrar e arquivar.
 *
 * Fora de um pedido (a T01 e a T05 rodam no trabalhador da fila), o Next recusa a chamada: aí não
 * há o que fazer, e o site dinâmico já mostra o que mudou na próxima visita.
 */
export function revalidarSitePublico(): void {
  try {
    revalidatePath("/noticias");
    revalidatePath("/noticias/[slug]", "page");
    revalidatePath("/documentos/editais");
    revalidatePath("/documentos/acordos-coletivos");
    revalidatePath("/documentos/[aba]/[slug]", "page");
    revalidatePath("/radio-chofer");
  } catch {
    // Sem pedido em andamento (trabalhador da fila, testes): o site dinâmico cobre.
  }
}
