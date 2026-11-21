import { eq } from "drizzle-orm";
import { z } from "zod";

import { conferirSessaoDaEquipe, sessaoRecusada } from "@/lib/acesso/sessao-da-equipe";
import { armazenamentoS3, contentDisposition, type Armazenamento } from "@/lib/armazenamento";
import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import type { Quem } from "@/lib/permissoes";

/**
 * O que é comum às rotas de PDF do painel: o PDF do documento oficial (E46) e o "Abrir PDF" da
 * Mídia (E53). Cada rota diz quem pode e as mensagens; a conferência e a resposta ficam aqui.
 */

/** "abrir" responde `inline` (o leitor do navegador); "baixar", `attachment`. */
export type ModoPdf = "abrir" | "baixar";

/** Resposta curta em texto, sem cache: as recusas das rotas de PDF do painel. */
export const respostaDeTexto = (status: number, corpo: string) =>
  new Response(corpo, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" } });

/**
 * A abertura de toda rota de PDF do painel, conferida a cada pedido no servidor (RNF01): sem sessão,
 * 401; perfil recusado, 403; id que não é um uuid, 404. `recusaDoPerfil` devolve a mensagem do 403,
 * ou null se a pessoa pode. Devolve a pessoa, ou a resposta de recusa.
 */
export async function conferirPedidoDePdf(
  request: Request,
  pedido: { id: string; recusaDoPerfil: (quem: Quem) => string | null; naoExiste: string },
  agora?: Date,
): Promise<{ quem: Quem } | { recusa: Response }> {
  const pessoa = await conferirSessaoDaEquipe(request.headers, agora);
  if (sessaoRecusada(pessoa)) {
    return { recusa: respostaDeTexto(401, "Sua sessão expirou. Entre de novo no painel para abrir o PDF.") };
  }
  const recusa = pedido.recusaDoPerfil(pessoa.quem);
  if (recusa) return { recusa: respostaDeTexto(403, recusa) };
  if (!z.uuid().safeParse(pedido.id).success) return { recusa: respostaDeTexto(404, pedido.naoExiste) };
  return { quem: pessoa.quem };
}

/**
 * Serve um PDF da Mídia pelo painel. O objeto no armazenamento é gravado para baixar (`attachment`,
 * E39); aqui quem chama escolhe o modo, e o nome do arquivo vai junto. Quem chama já passou pelo
 * `conferirPedidoDePdf` (ou, no site, conferiu que o documento está no ar). `semPdf` é a mensagem
 * do 404 quando o arquivo não existe ou não é PDF. `cache` troca o padrão `private, no-store`.
 */
export async function responderPdfDaMidia(
  pedido: { midiaId: string; modo: ModoPdf; semPdf: string; cache?: string },
  deps: { armazenamento?: Armazenamento } = {},
): Promise<Response> {
  const [arquivo] = await banco()
    .select({ chave: midia.chaveR2, nome: midia.nomeArquivo, bytes: midia.bytes, tipo: midia.tipo })
    .from(midia)
    .where(eq(midia.id, pedido.midiaId));
  if (!arquivo || arquivo.tipo !== "pdf") return respostaDeTexto(404, pedido.semPdf);
  const corpo = await (deps.armazenamento ?? armazenamentoS3).ler(arquivo.chave);
  if (!corpo) return respostaDeTexto(404, "O PDF não foi encontrado no armazenamento.");

  return new Response(corpo, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(arquivo.bytes),
      "content-disposition": contentDisposition({ tipo: pedido.modo === "abrir" ? "inline" : "attachment", nome: arquivo.nome }),
      "cache-control": pedido.cache ?? "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
