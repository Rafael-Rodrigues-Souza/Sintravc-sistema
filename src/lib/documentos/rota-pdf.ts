import type { Armazenamento } from "@/lib/armazenamento";
import { banco } from "@/lib/db";
import { conferirPedidoDePdf, respostaDeTexto, responderPdfDaMidia, type ModoPdf } from "@/lib/midia/responder-pdf";
import { pode } from "@/lib/permissoes";

import { lerDocumento, retratoDoDocumento } from "./carregar";

/**
 * GET /painel/documentos/[id]/pdf: o PDF oficial no painel (RF42, E46). Na Mídia, o PDF é gravado
 * para baixar (`attachment`, E39); aqui o painel escolhe: "Visualizar" abre no navegador (`inline`)
 * e "Baixar PDF" baixa com o nome do arquivo. Confere a sessão e a permissão a cada pedido (RNF01):
 * a Comunicação vê e baixa só o PDF publicado; o da cópia de trabalho e o de uma versão antiga, só o ADM.
 */
export async function tratarPdfDoDocumento(
  request: Request,
  pedido: { id: string; modo: ModoPdf; versao?: number },
  deps: { armazenamento?: Armazenamento; agora?: Date } = {},
): Promise<Response> {
  const conferido = await conferirPedidoDePdf(
    request,
    {
      id: pedido.id,
      recusaDoPerfil: (quem) => {
        if (!pode(quem, pedido.modo === "abrir" ? "ver" : "baixar", { tipo: "documento" })) {
          return "Seu perfil não pode abrir documentos oficiais.";
        }
        if (pedido.versao !== undefined && !pode(quem, "ver_versoes", { tipo: "documento" })) {
          return "Seu perfil não pode abrir versões antigas de documentos oficiais.";
        }
        return null;
      },
      naoExiste: "Este documento não existe.",
    },
    deps.agora,
  );
  if ("recusa" in conferido) return conferido.recusa;
  const { quem } = conferido;

  // O PDF da cópia de trabalho ainda não foi confirmado como oficial: só quem edita (o ADM) vê.
  // Quem só vê e baixa (a COM) recebe o da versão publicada (RN12, E46).
  const pdfMidiaId =
    pedido.versao !== undefined
      ? (await retratoDoDocumento(banco(), pedido.id, pedido.versao))?.dados.pdfMidiaId
      : pode(quem, "editar", { tipo: "documento" })
        ? (await lerDocumento(banco(), pedido.id))?.dados.pdfMidiaId
        : (await retratoDoDocumento(banco(), pedido.id))?.dados.pdfMidiaId;
  const semPdf = "Este documento não tem PDF.";
  if (!pdfMidiaId) return respostaDeTexto(404, semPdf);

  return responderPdfDaMidia({ midiaId: pdfMidiaId, modo: pedido.modo, semPdf }, { armazenamento: deps.armazenamento });
}
