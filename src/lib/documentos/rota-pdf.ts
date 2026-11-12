import { eq } from "drizzle-orm";
import { z } from "zod";

import { conferirSessaoDaEquipe, sessaoRecusada } from "@/lib/acesso/sessao-da-equipe";
import { armazenamentoS3, contentDisposition, type Armazenamento } from "@/lib/armazenamento";
import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import { pode } from "@/lib/permissoes";

import { lerDocumento, retratoDoDocumento } from "./carregar";

const texto = (status: number, corpo: string) =>
  new Response(corpo, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" } });

/**
 * GET /painel/documentos/[id]/pdf: o PDF oficial no painel (RF42, E46). Na Mídia, o PDF é gravado
 * para baixar (`attachment`, E39); aqui o painel escolhe: "Visualizar" abre no navegador (`inline`)
 * e "Baixar PDF" baixa com o nome do arquivo. Confere a sessão e a permissão a cada pedido (RNF01):
 * a Comunicação vê e baixa só o PDF publicado; o da cópia de trabalho e o de uma versão antiga, só o ADM.
 */
export async function tratarPdfDoDocumento(
  request: Request,
  pedido: { id: string; modo: "abrir" | "baixar"; versao?: number },
  deps: { armazenamento?: Armazenamento; agora?: Date } = {},
): Promise<Response> {
  const pessoa = await conferirSessaoDaEquipe(request.headers, deps.agora);
  if (sessaoRecusada(pessoa)) return texto(401, "Sua sessão expirou. Entre de novo no painel para abrir o PDF.");
  const acao = pedido.modo === "abrir" ? "ver" : "baixar";
  if (!pode(pessoa.quem, acao, { tipo: "documento" })) return texto(403, "Seu perfil não pode abrir documentos oficiais.");
  if (pedido.versao !== undefined && !pode(pessoa.quem, "ver_versoes", { tipo: "documento" })) {
    return texto(403, "Seu perfil não pode abrir versões antigas de documentos oficiais.");
  }

  if (!z.uuid().safeParse(pedido.id).success) return texto(404, "Este documento não existe.");
  // O PDF da cópia de trabalho ainda não foi confirmado como oficial: só quem edita (o ADM) vê.
  // Quem só vê e baixa (a COM) recebe o da versão publicada (RN12, E46).
  const pdfMidiaId =
    pedido.versao !== undefined
      ? (await retratoDoDocumento(banco(), pedido.id, pedido.versao))?.dados.pdfMidiaId
      : pode(pessoa.quem, "editar", { tipo: "documento" })
        ? (await lerDocumento(banco(), pedido.id))?.dados.pdfMidiaId
        : (await retratoDoDocumento(banco(), pedido.id))?.dados.pdfMidiaId;
  if (!pdfMidiaId) return texto(404, "Este documento não tem PDF.");

  const [arquivo] = await banco()
    .select({ chave: midia.chaveR2, nome: midia.nomeArquivo, bytes: midia.bytes, tipo: midia.tipo })
    .from(midia)
    .where(eq(midia.id, pdfMidiaId));
  if (!arquivo || arquivo.tipo !== "pdf") return texto(404, "Este documento não tem PDF.");
  const corpo = await (deps.armazenamento ?? armazenamentoS3).ler(arquivo.chave);
  if (!corpo) return texto(404, "O PDF não foi encontrado no armazenamento.");

  return new Response(corpo, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(arquivo.bytes),
      "content-disposition": contentDisposition({ tipo: pedido.modo === "abrir" ? "inline" : "attachment", nome: arquivo.nome }),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
