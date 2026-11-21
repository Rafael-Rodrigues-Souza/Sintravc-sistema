"use server";

import { z } from "zod";

import { listarNoticiasDoSite, type NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import { BUSCA_MAXIMA } from "@/lib/noticias-do-site/filtros";
import { exigir } from "@/lib/permissoes";

const esquema = z.object({
  categoriaId: z.uuid().optional(),
  busca: z.string().max(BUSCA_MAXIMA).optional(),
  ordem: z.enum(["recentes", "antigas"]),
  pagina: z.number().int().min(2).max(10_000),
  excluir: z.uuid().optional(),
});

export type PedidoMaisNoticias = z.infer<typeof esquema>;
export type RespostaMaisNoticias = { tipo: "ok"; itens: NoticiaDoSite[]; paginas: number } | { tipo: "erro" };

/**
 * “Carregar mais notícias” no celular (Figma 81:995; E59): a página seguinte, com os mesmos filtros
 * e a mesma ordem da URL, sem repetir o Destaque. É pública, mas passa por `pode()` como toda server
 * action (spec §11 T2): o visitante pode ver o site.
 */
export async function acaoMaisNoticias(pedido: PedidoMaisNoticias): Promise<RespostaMaisNoticias> {
  exigir({ tipo: "visitante" }, "ver", { tipo: "site_publico" });
  const validado = esquema.safeParse(pedido);
  if (!validado.success) return { tipo: "erro" };
  const { itens, paginas, pagina } = await listarNoticiasDoSite(validado.data);
  // Pedido além da última página: nada novo (listarNoticiasDoSite devolveria a última de novo).
  if (pagina < validado.data.pagina) return { tipo: "ok", itens: [], paginas };
  return { tipo: "ok", itens, paginas };
}
