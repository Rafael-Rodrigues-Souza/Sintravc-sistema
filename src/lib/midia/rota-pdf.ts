import type { Armazenamento } from "@/lib/armazenamento";
import { pode } from "@/lib/permissoes";

import { conferirPedidoDePdf, respostaDeTexto, responderPdfDaMidia } from "./responder-pdf";

/**
 * GET /painel/midia/[id]/pdf?modo=abrir: o "Abrir PDF" dos detalhes da Mídia (E53). Abre o PDF no
 * leitor do navegador (`inline`); o "Copiar link" continua dando o endereço público, que baixa (E39).
 * Só abre: a tela não baixa por aqui, então qualquer outro modo é recusado (400).
 */
export async function tratarPdfDaMidia(
  request: Request,
  pedido: { id: string; modo: string | null },
  deps: { armazenamento?: Armazenamento } = {},
): Promise<Response> {
  const semPdf = "Este arquivo não é um PDF da Mídia.";
  const conferido = await conferirPedidoDePdf(request, {
    id: pedido.id,
    recusaDoPerfil: (quem) => (pode(quem, "ver", { tipo: "midia" }) ? null : "Seu perfil não pode abrir arquivos da Mídia."),
    naoExiste: semPdf,
  });
  if ("recusa" in conferido) return conferido.recusa;
  if (pedido.modo !== "abrir") return respostaDeTexto(400, "Este endereço só abre o PDF (?modo=abrir).");
  return responderPdfDaMidia({ midiaId: pedido.id, modo: "abrir", semPdf }, deps);
}
