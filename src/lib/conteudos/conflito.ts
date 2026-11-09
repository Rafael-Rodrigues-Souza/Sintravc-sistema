import { banco } from "@/lib/db";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { lerNoticia } from "./carregar";
import type { DadosNoticia } from "./dados";
import { gravarPorCima, registrar, travarNoticia, type ResultadoSalvar } from "./salvar";
import { validarNoticia } from "./validar";

/**
 * Escolha no modal "Há duas versões do rascunho" (N4, E02). A versão não escolhida é descartada e
 * a escolha vai para a Atividade. Se alguém salvou de novo enquanto a pessoa decidia, devolve o
 * conflito com a versão mais nova, sem gravar nada.
 */
export async function resolverConflitoNoticia(
  entrada: { id: string; escolha: "minha" | "servidor"; revisaoServidor: number; dados: DadosNoticia },
  deps: { quem: QuemDaEquipe; sessaoEdicao: string },
): Promise<ResultadoSalvar> {
  exigir(deps.quem, "editar", { tipo: "noticia" });
  const { id, escolha } = entrada;
  return banco().transaction(async (tx) => {
    const atual = await travarNoticia(tx, id);
    if (atual.revisao !== entrada.revisaoServidor) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, id))! };
    }
    if (escolha === "servidor") {
      await registrar(tx, "noticia.resolver_conflito", id, atual.titulo, deps, { escolha });
      return { tipo: "salvo", id, revisao: atual.revisao, salvoEm: atual.atualizadoEm };
    }
    const dados = await validarNoticia(tx, entrada.dados);
    const salvo = await gravarPorCima(tx, id, dados, deps.quem);
    await registrar(tx, "noticia.resolver_conflito", id, dados.titulo, deps, { escolha });
    return salvo;
  });
}
