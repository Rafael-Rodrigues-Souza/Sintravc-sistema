import { eq } from "drizzle-orm";

import { armazenamentoS3, contentDisposition, type Armazenamento } from "@/lib/armazenamento";
import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";

/** Resposta curta em texto, sem cache: as recusas das rotas de PDF do painel. */
export const respostaDeTexto = (status: number, corpo: string) =>
  new Response(corpo, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" } });

/**
 * Serve um PDF da Mídia pelo painel. O objeto no armazenamento é gravado para baixar (`attachment`,
 * E39); aqui quem chama escolhe: "abrir" responde `inline` (o leitor do navegador) e "baixar",
 * `attachment`, os dois com o nome do arquivo. Quem chama já conferiu a sessão e a permissão (RNF01).
 * Usado pelo PDF do documento oficial (E46) e pelo "Abrir PDF" da Mídia (E53).
 */
export async function responderPdfDaMidia(
  midiaId: string,
  modo: "abrir" | "baixar",
  deps: { armazenamento?: Armazenamento; semPdf: string },
): Promise<Response> {
  const [arquivo] = await banco()
    .select({ chave: midia.chaveR2, nome: midia.nomeArquivo, bytes: midia.bytes, tipo: midia.tipo })
    .from(midia)
    .where(eq(midia.id, midiaId));
  if (!arquivo || arquivo.tipo !== "pdf") return respostaDeTexto(404, deps.semPdf);
  const corpo = await (deps.armazenamento ?? armazenamentoS3).ler(arquivo.chave);
  if (!corpo) return respostaDeTexto(404, "O PDF não foi encontrado no armazenamento.");

  return new Response(corpo, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(arquivo.bytes),
      "content-disposition": contentDisposition({ tipo: modo === "abrir" ? "inline" : "attachment", nome: arquivo.nome }),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
