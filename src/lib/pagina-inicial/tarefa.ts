import { and, eq, sql } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import { banco } from "@/lib/db";
import { atividade, destaqueHome } from "@/lib/db/schema";
import { revalidarSitePublico } from "@/lib/site/revalidar";
import type { PedidoDestaque } from "@/lib/tarefas/fila";

import { detalhesDosItens } from "./itens";
import { chaveDoItem, type TipoDoItem } from "./regras";

export type ResultadoVirada = { tipo: "feita" } | { tipo: "ignorada" };

/**
 * T04 · Destaques da Home (spec §6, E62). Roda na fila, em `entra_em` e `sai_em` de cada item do
 * carrossel publicado. O site já segue o relógio; esta tarefa só grava a Atividade (ator sistema,
 * com o atraso) e revalida a Home.
 *
 * Idempotente: se o item não está mais no publicado com esta hora (republicado com outra data,
 * removido, tirado do ar antes), ou se a virada já foi registrada, não faz nada.
 */
export async function executarViradaDoDestaque(pedido: PedidoDestaque, deps: { agora?: Date } = {}): Promise<ResultadoVirada> {
  const marcadoPara = new Date(pedido.para);
  const agora = deps.agora ?? new Date();
  const acao = pedido.virada === "entrar" ? "destaque.entrar_no_ar" : "destaque.sair_do_ar";

  const resultado = await banco().transaction(async (tx) => {
    const publicados = await tx
      .select()
      .from(destaqueHome)
      .where(and(eq(destaqueHome.versao, "publicado"), eq(destaqueHome.area, "carrossel")))
      .for("update");
    const linha = publicados.find((l) => l.itemTipo && chaveDoItem({ tipo: l.itemTipo, itemId: l.itemId }) === pedido.chave);
    const hora = pedido.virada === "entrar" ? linha?.entraEm : linha?.saiEm;
    if (!linha || hora?.getTime() !== marcadoPara.getTime()) return { tipo: "ignorada" } as const;

    const [jaFeita] = await tx
      .select({ id: atividade.id })
      .from(atividade)
      .where(and(eq(atividade.acao, acao), sql`${atividade.detalhe} ->> 'item' = ${pedido.chave}`, sql`${atividade.detalhe} ->> 'marcado_para' = ${marcadoPara.toISOString()}`))
      .limit(1);
    if (jaFeita) return { tipo: "ignorada" } as const;

    const detalhes = await detalhesDosItens([{ tipo: linha.itemTipo as TipoDoItem, itemId: linha.itemId }], agora);
    await registrarAtividade(tx, {
      ator: { tipo: "sistema" },
      acao,
      area: "pagina_inicial",
      alvo: { tipo: "destaque", id: linha.id, rotulo: (detalhes[pedido.chave]?.titulo ?? "Destaque da Home").slice(0, 200) },
      detalhe: {
        item: pedido.chave,
        marcado_para: marcadoPara.toISOString(),
        atraso_segundos: Math.max(0, Math.round((agora.getTime() - marcadoPara.getTime()) / 1000)),
      },
    });
    return { tipo: "feita" } as const;
  });
  if (resultado.tipo === "feita") revalidarSitePublico();
  return resultado;
}
