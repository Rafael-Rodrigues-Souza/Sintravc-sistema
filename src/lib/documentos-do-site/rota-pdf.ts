import type { Armazenamento } from "@/lib/armazenamento";
import { respostaDeTexto, responderPdfDaMidia, type ModoPdf } from "@/lib/midia/responder-pdf";
import { pode } from "@/lib/permissoes";

import { documentoPeloSlug } from "./consultas";
import { ABAS, abaDoSegmento } from "./filtros";

const NAO_ENCONTRADO = "Este documento não está disponível no site.";
const SEM_PERMISSAO = "Você não tem permissão para ver este documento.";

/**
 * O PDF de um documento no site (CA-US03.2, E60): `/documentos/{aba}/[slug]/pdf?modo=abrir|baixar`.
 * Serve só o que está no ar, pelo PDF da versão publicada; o resto é 404, sem dizer se existe.
 * `private, no-cache`: nenhum cache compartilhado guarda o arquivo, então ocultar ou arquivar tira
 * o PDF do ar na hora.
 */
export async function tratarPdfPublico(
  pedido: { aba: string; slug: string; modo: ModoPdf },
  deps: { armazenamento?: Armazenamento } = {},
): Promise<Response> {
  if (!pode({ tipo: "visitante" }, "ver", { tipo: "site_publico" })) return respostaDeTexto(403, SEM_PERMISSAO);
  const aba = abaDoSegmento(pedido.aba);
  if (!aba) return respostaDeTexto(404, NAO_ENCONTRADO);
  const doc = await documentoPeloSlug(ABAS[aba].tipo, pedido.slug);
  if (!doc?.dados.pdfMidiaId) return respostaDeTexto(404, NAO_ENCONTRADO);
  return responderPdfDaMidia({ midiaId: doc.dados.pdfMidiaId, modo: pedido.modo, semPdf: NAO_ENCONTRADO, cache: "private, no-cache" }, deps);
}
