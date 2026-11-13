import { eq } from "drizzle-orm";
import { z } from "zod";

import type { Armazenamento } from "@/lib/armazenamento";
import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import { enviarMidia } from "@/lib/midia/enviar";
import { receberEnvio, respostaDoErroDeEnvio } from "@/lib/midia/rota-envio";
import { lerParametro } from "@/lib/parametros";
import { pode } from "@/lib/permissoes";

import { lerDocumento } from "./carregar";
import { acaoDoEnvioDoPdf } from "./envio-do-pdf";
import { extrairTextoDoPdf, type TextoExtraido } from "./extrair-texto";

const SO_ADM = "Só o Administrador geral envia documentos oficiais.";
const SO_PDF = "O arquivo oficial precisa ser um PDF. Envie o edital ou acordo em PDF.";

export type PdfEnviado = { id: string; nomeArquivo: string; bytes: number; paginas: number | null } & Pick<
  TextoExtraido,
  "texto" | "temTexto"
>;

/**
 * POST /api/documentos/pdf: o PDF oficial do editor de documento (RF41, RN12). Só o ADM (RN08) e
 * só PDF, detectado pelos bytes. Vai para a Mídia como qualquer arquivo e, no mesmo envio, o texto
 * pesquisável é lido do PDF (P3, T08). A leitura nunca impede o envio: sem texto, a tela pede as
 * palavras principais (E46).
 */
export async function tratarEnvioDoPdf(
  request: Request,
  deps: { urlSite: string; armazenamento?: Armazenamento; agora?: Date },
): Promise<Response> {
  // Antes de ler o arquivo: quem não pode criar nem substituir documento já é recusado.
  const recebido = await receberEnvio(request, deps, {
    pode: (quem) => pode(quem, "criar", { tipo: "documento" }) || pode(quem, "substituir", { tipo: "documento" }),
    recusa: SO_ADM,
  });
  if (recebido instanceof Response) return recebido;
  // O primeiro PDF do documento é "criar"; trocar o que já existe é "substituir" (RN08).
  const documentoId = z.uuid().safeParse(recebido.formulario.get("documentoId"));
  const atual = documentoId.success ? await lerDocumento(banco(), documentoId.data) : null;
  if (!pode(recebido.quem, acaoDoEnvioDoPdf(atual ? atual.dados : null), { tipo: "documento" })) {
    return Response.json({ erro: SO_ADM }, { status: 403 });
  }

  try {
    const bytes = new Uint8Array(await recebido.arquivo.arrayBuffer());
    const { id } = await enviarMidia(
      { bytes, nome: recebido.arquivo.name },
      { quem: recebido.quem, armazenamento: deps.armazenamento, somente: { tipo: "pdf", mensagem: SO_PDF } },
    );
    const [arquivo] = await banco()
      .select({ id: midia.id, nomeArquivo: midia.nomeArquivo, bytes: midia.bytes, paginas: midia.paginas })
      .from(midia)
      .where(eq(midia.id, id));
    const [tempoMaximoMs, paginasMaximas] = await Promise.all([
      lerParametro("documento.extracao_tempo_maximo_ms"),
      lerParametro("documento.extracao_paginas_maximas"),
    ]);
    const { texto, temTexto } = await extrairTextoDoPdf(bytes, { tempoMaximoMs, paginasMaximas });
    const corpo: PdfEnviado = { ...arquivo!, texto, temTexto };
    return Response.json(corpo, { status: 201 });
  } catch (erro) {
    const resposta = respostaDoErroDeEnvio(erro, SO_ADM);
    if (resposta) return resposta;
    console.error("[documentos] Falha no envio do PDF.", erro);
    return Response.json({ erro: "Não foi possível enviar agora. Tente de novo em alguns minutos." }, { status: 500 });
  }
}
