import { listarCategorias } from "@/lib/conteudos/listar";
import { limitesDaMidia } from "@/lib/midia/enviar";
import { lerParametro } from "@/lib/parametros";
import type { QuemDaEquipe } from "@/lib/permissoes";

/** O que as páginas do editor de documento carregam do servidor (categorias de Documentos e limites). */
export async function prepararEditorDocumento(quem: QuemDaEquipe) {
  const [categorias, segundos, limites] = await Promise.all([
    listarCategorias(["documentos"], { quem }),
    lerParametro("editor.salvamento_automatico_segundos"),
    limitesDaMidia(),
  ]);
  return {
    categorias: categorias.map(({ id, nome }) => ({ id, nome })),
    intervaloMs: segundos * 1000,
    limiteBytes: limites.tamanhoMaximoBytes,
  };
}
