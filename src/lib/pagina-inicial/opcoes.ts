import { exigir } from "@/lib/permissoes";

import { buscarOpcoes, type OpcaoDeDestaque } from "./itens";
import type { Deps } from "./rascunho";

/** As opções da janela “Adicionar destaque” e “Trocar” (E62): só o que está no ar. Só quem gerencia a Home. */
export async function opcoesDeDestaque(pedido: { tipo: "noticia" | "episodio"; busca: string }, deps: Deps): Promise<OpcaoDeDestaque[]> {
  exigir(deps.quem, "gerenciar", { tipo: "pagina_inicial" });
  return buscarOpcoes(pedido, deps.agora ?? new Date());
}
