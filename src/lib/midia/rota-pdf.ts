import { z } from "zod";

import { conferirSessaoDaEquipe, sessaoRecusada } from "@/lib/acesso/sessao-da-equipe";
import type { Armazenamento } from "@/lib/armazenamento";
import { pode } from "@/lib/permissoes";

import { respostaDeTexto as texto, responderPdfDaMidia } from "./responder-pdf";

/**
 * GET /painel/midia/[id]/pdf?modo=abrir: o "Abrir PDF" dos detalhes da Mídia (E53). Abre o PDF no
 * leitor do navegador (`inline`); o "Copiar link" continua dando o endereço público, que baixa (E39).
 * Só abre: a tela não baixa por aqui, então qualquer outro modo é recusado (400).
 * Confere a sessão e a permissão de ver a Mídia a cada pedido (RNF01).
 */
export async function tratarPdfDaMidia(
  request: Request,
  pedido: { id: string; modo: string | null },
  deps: { armazenamento?: Armazenamento; agora?: Date } = {},
): Promise<Response> {
  const pessoa = await conferirSessaoDaEquipe(request.headers, deps.agora);
  if (sessaoRecusada(pessoa)) return texto(401, "Sua sessão expirou. Entre de novo no painel para abrir o PDF.");
  if (!pode(pessoa.quem, "ver", { tipo: "midia" })) return texto(403, "Seu perfil não pode abrir arquivos da Mídia.");
  if (pedido.modo !== "abrir") return texto(400, "Este endereço só abre o PDF (?modo=abrir).");

  const semPdf = "Este arquivo não é um PDF da Mídia.";
  if (!z.uuid().safeParse(pedido.id).success) return texto(404, semPdf);
  return responderPdfDaMidia(pedido.id, "abrir", { armazenamento: deps.armazenamento, semPdf });
}
