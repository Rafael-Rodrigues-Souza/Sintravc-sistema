import { urlPublica } from "@/lib/armazenamento";
import type { ArquivoConhecido } from "@/lib/conteudos/dados";
import { listarCategorias } from "@/lib/conteudos/listar";
import { lerEnvArmazenamento } from "@/lib/env";
import { limitesDaMidia } from "@/lib/midia/enviar";
import { erroDeTamanho } from "@/lib/midia/erros";
import { detalharMidia } from "@/lib/midia/listar";
import { lerParametro } from "@/lib/parametros";
import type { QuemDaEquipe } from "@/lib/permissoes";



/** O que as duas páginas do editor (nova e existente) carregam do servidor. */
export async function prepararEditor(quem: QuemDaEquipe, idsDeArquivos: string[]) {
  const env = lerEnvArmazenamento();
  const [categorias, segundos, limites, detalhes] = await Promise.all([
    listarCategorias(["noticias"], { quem }),
    lerParametro("editor.salvamento_automatico_segundos"),
    limitesDaMidia(),
    Promise.all([...new Set(idsDeArquivos)].map((id) => detalharMidia(id))),
  ]);
  const arquivos: Record<string, ArquivoConhecido> = {};
  for (const arquivo of detalhes) {
    if (arquivo) arquivos[arquivo.id] = { nomeArquivo: arquivo.nomeArquivo, url: urlPublica(arquivo.chaveR2, env) };
  }
  return {
    categorias: categorias.map(({ id, nome }) => ({ id, nome })),
    intervaloMs: segundos * 1000,
    limites: {
      tamanhoMaximoBytes: limites.tamanhoMaximoBytes,
      mensagemDeTamanho: erroDeTamanho(limites.tamanhoMaximoBytes).message,
    },
    arquivos,
  };
}
