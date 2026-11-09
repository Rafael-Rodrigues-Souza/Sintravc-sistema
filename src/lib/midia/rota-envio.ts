import { conferirSessaoDaEquipe, sessaoRecusada } from "@/lib/acesso/sessao-da-equipe";
import type { Armazenamento } from "@/lib/armazenamento";
import { pode, SemPermissao } from "@/lib/permissoes";

import { enviarMidia, limitesDaMidia } from "./enviar";
import { erroDeTamanho, ErroMidia } from "./erros";

/** Folga para os cabeçalhos do multipart além do arquivo em si. */
const FOLGA_DO_FORMULARIO = 64 * 1024;

const json = (status: number, corpo: unknown) => Response.json(corpo, { status });

/**
 * POST /api/midia: o envio da tela Mídia, com barra de progresso (XHR). Fica fora de /painel porque
 * o proxy (src/proxy.ts) corta corpos acima de 10 MB (E39).
 *
 * Um Route Handler não tem a proteção de origem das Server Actions: o Origin precisa ser o do
 * próprio site (URL_SITE). Depois vêm a sessão (com as regras do E05), a permissão e o tamanho.
 */
export async function tratarEnvioMidia(
  request: Request,
  deps: { urlSite: string; armazenamento?: Armazenamento; agora?: Date },
): Promise<Response> {
  if (request.headers.get("origin") !== new URL(deps.urlSite).origin) {
    return json(403, { erro: "Envio recusado. Abra o painel pelo endereço oficial e tente de novo." });
  }

  const pessoa = await conferirSessaoDaEquipe(request.headers, deps.agora);
  if (sessaoRecusada(pessoa)) {
    return json(401, { erro: "Sua sessão expirou. Entre de novo para enviar arquivos." });
  }
  if (!pode(pessoa.quem, "enviar", { tipo: "midia" })) {
    return json(403, { erro: "Seu perfil não pode enviar arquivos para a Mídia." });
  }

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

  try {
    const { id } = await enviarMidia(
      { bytes: new Uint8Array(await arquivo.arrayBuffer()), nome: arquivo.name },
      { quem: pessoa.quem, armazenamento: deps.armazenamento },
    );
    return json(201, { id });
  } catch (erro) {
    if (erro instanceof ErroMidia) return json(erro.codigo === "tamanho" ? 413 : 422, { erro: erro.message });
    if (erro instanceof SemPermissao) return json(403, { erro: "Seu perfil não pode enviar arquivos para a Mídia." });
    console.error("[midia] Falha no envio.", erro);
    return json(500, { erro: "Não foi possível enviar agora. Tente de novo em alguns minutos." });
  }
}
