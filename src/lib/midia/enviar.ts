import { sql } from "drizzle-orm";

import { armazenamentoS3, type Armazenamento } from "@/lib/armazenamento";
import { registrarAtividade } from "@/lib/atividade";
import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { ErroMidia } from "./erros";
import { prepararArquivo, type ArquivoPreparado, type Limites } from "./preparar";

/** Limites da Mídia, do Parametro (R7, RN15, E39). */
export async function limitesDaMidia(): Promise<Limites> {
  const [tamanhoMaximoBytes, ladoMaximoPx, jpgQualidade] = await Promise.all([
    lerParametro("midia.tamanho_maximo_bytes"),
    lerParametro("midia.imagem_lado_maximo_px"),
    lerParametro("midia.jpg_qualidade"),
  ]);
  return { tamanhoMaximoBytes, ladoMaximoPx, jpgQualidade };
}

/**
 * Envia um arquivo para a Mídia (RF48, RN15). Confere a permissão, detecta o formato pelos bytes,
 * converte o HEIC, reduz a imagem e grava no S3, no banco e na Atividade.
 *
 * O S3 recebe o arquivo dentro da transação: se ele falhar, nada é gravado no banco. Se o banco
 * falhar depois do S3, o objeto é apagado (melhor esforço).
 */
export async function enviarMidia(
  entrada: { bytes: Uint8Array; nome: string },
  deps: {
    quem: QuemDaEquipe;
    armazenamento?: Armazenamento;
    /** Aceita só este tipo (ex.: o PDF oficial do documento, RN12); o resto é recusado antes do S3. */
    somente?: { tipo: ArquivoPreparado["tipo"]; mensagem: string };
  },
): Promise<{ id: string }> {
  exigir(deps.quem, "enviar", { tipo: "midia" });
  const armazenamento = deps.armazenamento ?? armazenamentoS3;
  const pronto = await prepararArquivo(entrada, await limitesDaMidia());
  if (deps.somente && pronto.tipo !== deps.somente.tipo) throw new ErroMidia("formato", deps.somente.mensagem);

  let chaveEnviada: string | undefined;
  try {
    return await banco().transaction(async (tx) => {
      const [linha] = await tx.execute<{ id: string }>(sql`select uuidv7() as id`);
      const id = linha!.id;
      const chave = chaveDoArquivo(id, pronto.extensao);

      await armazenamento.enviar({
        chave,
        conteudo: pronto.conteudo,
        tipo: pronto.mime,
        disposicao: pronto.tipo === "imagem" ? undefined : { tipo: "attachment", nome: pronto.nomeArquivo },
      });
      chaveEnviada = chave;

      await tx.insert(midia).values({
        id,
        chaveR2: chave,
        nomeArquivo: pronto.nomeArquivo,
        tipo: pronto.tipo,
        mime: pronto.mime,
        largura: pronto.largura,
        altura: pronto.altura,
        bytes: pronto.bytes,
        paginas: pronto.paginas,
        enviadoPor: deps.quem.id,
      });
      await registrarAtividade(tx, {
        ator: { tipo: "pessoa", id: deps.quem.id },
        acao: "midia.enviar",
        area: "midia",
        alvo: { tipo: "midia", id, rotulo: pronto.nomeArquivo },
        detalhe: detalheDoEnvio(entrada.nome, pronto),
      });
      return { id };
    });
  } catch (erro) {
    if (chaveEnviada) await armazenamento.apagar(chaveEnviada).catch(() => undefined);
    throw erro;
  }
}

/** `midia/2026/11/<id>.jpg`: o nome original não entra na chave (pode ter dados pessoais ou acentos). */
function chaveDoArquivo(id: string, extensao: string, agora = new Date()) {
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, "0");
  return `midia/${ano}/${mes}/${id}.${extensao}`;
}

function detalheDoEnvio(nomeOriginal: string, pronto: ArquivoPreparado) {
  return {
    tipo: pronto.tipo,
    mime: pronto.mime,
    bytes: pronto.bytes,
    ...(pronto.convertidoDe ? { convertidoDe: pronto.convertidoDe, nomeOriginal } : {}),
  };
}
