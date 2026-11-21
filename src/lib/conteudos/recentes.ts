import { listarNoticiasDoSite } from "@/lib/noticias-do-site/consultas";

export type NoticiaRecente = {
  id: string;
  titulo: string;
  /** Endereço da notícia aberta. */
  href: string;
  publicadoEm: Date;
  capa: { url: string; alt: string } | null;
};

/**
 * As últimas notícias publicadas, para a coluna “Notícias recentes” da página Comunicados (E58).
 * Usa a mesma leitura da página Notícias (retrato no ar, E42, E59): o que está em edição no painel
 * não aparece antes de publicar. É pública, como o resto do site.
 */
export async function noticiasRecentes(limite = 4): Promise<NoticiaRecente[]> {
  const { itens } = await listarNoticiasDoSite({ porPagina: limite, ordem: "recentes" });
  return itens.map(({ id, titulo, href, publicadoEm, capa }) => ({ id, titulo, href, publicadoEm, capa }));
}
