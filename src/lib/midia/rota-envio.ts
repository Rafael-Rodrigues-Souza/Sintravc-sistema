import { conferirSessaoDaEquipe, sessaoRecusada } from "@/lib/acesso/sessao-da-equipe";
import type { Armazenamento } from "@/lib/armazenamento";
import { pode, SemPermissao, type QuemDaEquipe } from "@/lib/permissoes";

import { enviarMidia, limitesDaMidia } from "./enviar";
import { erroDeTamanho, ErroMidia } from "./erros";

/** Folga para os cabeçalhos do multipart além do arquivo em si. */
const FOLGA_DO_FORMULARIO = 64 * 1024;

const json = (status: number, corpo: unknown) => Response.json(corpo, { status });

/**
 * O que toda rota de envio de arquivo confere antes de ler o arquivo (E39): o Origin precisa ser o
 * do próprio site (um Route Handler não tem a proteção de origem das Server Actions), depois a
 * sessão (com as regras do E05), a permissão e o tamanho. Devolve a resposta de recusa ou quem
 * envia e o arquivo.
 */
export async function receberEnvio(
  request: Request,
  deps: { urlSite: string; agora?: Date },
  permissao: { pode: (quem: QuemDaEquipe) => boolean; recusa: string },
): Promise<Response | { quem: QuemDaEquipe; arquivo: File }> {
  if (request.headers.get("origin") !== new URL(deps.urlSite).origin) {
    return json(403, { erro: "Envio recusado. Abra o painel pelo endereço oficial e tente de novo." });
  }

  const pessoa = await conferirSessaoDaEquipe(request.headers, deps.agora);
  if (sessaoRecusada(pessoa)) {
    return json(401, { erro: "Sua sessão expirou. Entre de novo para enviar arquivos." });
  }
  if (!permissao.pode(pessoa.quem)) return json(403, { erro: permissao.recusa });

  const limites = await limitesDaMidia();
  const tamanho = Number(request.headers.get("content-length") ?? 0);
  if (tamanho > limites.tamanhoMaximoBytes + FOLGA_DO_FORMULARIO) {
    return json(413, { erro: erroDeTamanho(limites.tamanhoMaximoBytes).message });
  }

  const arquivo = await request
    .formData()
    .then((dados) => dados.get("arquivo"))
    .catch(() => null);
  if (!(arquivo instanceof File)) return json(400, { erro: "Escolha um arquivo para enviar." });
  return { quem: pessoa.quem, arquivo };
}

/** Resposta de erro esperado do envio (formato, tamanho), ou null se o erro é outro. */
export function respostaDoErroDeEnvio(erro: unknown, recusa: string): Response | null {
  if (erro instanceof ErroMidia) return json(erro.codigo === "tamanho" ? 413 : 422, { erro: erro.message });
  if (erro instanceof SemPermissao) return json(403, { erro: recusa });
  return null;
}

const SEM_PERMISSAO_MIDIA = "Seu perfil não pode enviar arquivos para a Mídia.";

/** POST /api/midia: o envio da tela Mídia, com barra de progresso (XHR). Fica fora de /painel porque
 * o proxy (src/proxy.ts) corta corpos acima de 10 MB (E39).
 */
export async function tratarEnvioMidia(
  request: Request,
  deps: { urlSite: string; armazenamento?: Armazenamento; agora?: Date },
): Promise<Response> {
  const recebido = await receberEnvio(request, deps, {
    pode: (quem) => pode(quem, "enviar", { tipo: "midia" }),
    recusa: SEM_PERMISSAO_MIDIA,
  });
  if (recebido instanceof Response) return recebido;

  try {
    const { id } = await enviarMidia(
      { bytes: new Uint8Array(await recebido.arquivo.arrayBuffer()), nome: recebido.arquivo.name },
      { quem: recebido.quem, armazenamento: deps.armazenamento },
    );
    return json(201, { id });
  } catch (erro) {
    const resposta = respostaDoErroDeEnvio(erro, SEM_PERMISSAO_MIDIA);
    if (resposta) return resposta;
    console.error("[midia] Falha no envio.", erro);
    return json(500, { erro: "Não foi possível enviar agora. Tente de novo em alguns minutos." });
  }
}
