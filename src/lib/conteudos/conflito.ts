import { banco } from "@/lib/db";
import { exigir } from "@/lib/permissoes";

import { lerNoticia } from "./carregar";
import type { DadosNoticia } from "./dados";
import { gravarPorCima, registrarAtividadeNoticia, travarNoticia, type DepsDoSalvamento, type ResultadoSalvar } from "./salvar";
import { validarNoticia } from "./validar";

/**
 * Escolha no modal "Há duas versões do rascunho" (N4, E02). A versão não escolhida é descartada e
 * a escolha vai para a Atividade. Se alguém salvou de novo enquanto a pessoa decidia, devolve o
 * conflito com a versão mais nova, sem gravar nada.
 */
export async function resolverConflitoNoticia(
  entrada: { id: string; escolha: "minha" | "servidor"; revisaoServidor: number; dados: DadosNoticia },
  deps: DepsDoSalvamento,
): Promise<ResultadoSalvar> {
  exigir(deps.quem, "editar", { tipo: "noticia" });
  const { id, escolha } = entrada;
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, id);
    if (atual.revisao !== entrada.revisaoServidor) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, id))! };
    }
    if (escolha === "servidor") {
      await registrarAtividadeNoticia(tx, "noticia.resolver_conflito", id, atual.titulo, deps, { escolha });
      return { tipo: "salvo", id, revisao: atual.revisao, salvoEm: atual.atualizadoEm, revisaoPublicada: atual.revisaoPublicada };
    }
    const dados = await validarNoticia(tx, entrada.dados, deps.urlDoArquivo);
    const salvo = await gravarPorCima(tx, id, dados, deps.quem);
    await registrarAtividadeNoticia(tx, "noticia.resolver_conflito", id, dados.titulo, deps, { escolha });
    return salvo;
  });
}
