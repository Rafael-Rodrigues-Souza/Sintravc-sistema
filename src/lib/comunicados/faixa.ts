import { and, asc, eq, gt, inArray, lte } from "drizzle-orm";

import { banco } from "@/lib/db";
import { comunicado, conteudo } from "@/lib/db/schema";

import { enderecoPublicoDoConteudo } from "./regras";

export type ComunicadoDaFaixa = {
  id: string;
  mensagem: string;
  /** O “Saiba mais”. Sem link, ou com o conteúdo fora do site, a faixa não mostra o link. */
  link: { href: string; externo: boolean } | null;
};

/**
 * Os comunicados no ar agora, na ordem da fila (RF08, RN14, CA-US01.1, CA-US01.2). Decide pelo
 * relógio, não pelo `estado` (E58): a faixa entra e sai na hora certa mesmo se a tarefa T02 atrasar,
 * e o site não precisa ser publicado de novo. É pública: não passa por `pode()`, como o resto do site.
 */
export async function comunicadosNoAr(agora: Date = new Date()): Promise<ComunicadoDaFaixa[]> {
  const linhas = await banco()
    .select({
      id: comunicado.id,
      mensagem: comunicado.mensagem,
      linkUrl: comunicado.linkUrl,
      alvoTipo: conteudo.tipo,
      alvoSlug: conteudo.slug,
      alvoEstado: conteudo.estado,
    })
    .from(comunicado)
    .leftJoin(conteudo, eq(conteudo.id, comunicado.linkConteudoId))
    .where(and(inArray(comunicado.estado, ["agendado", "publicado"]), lte(comunicado.inicio, agora), gt(comunicado.fim, agora)))
    .orderBy(asc(comunicado.ordemFila), asc(comunicado.id));

  return linhas.map((l) => ({
    id: l.id,
    mensagem: l.mensagem,
    link: linkDaFaixa(l),
  }));
}

function linkDaFaixa(l: { linkUrl: string | null; alvoTipo: "noticia" | "edital" | "acordo" | null; alvoSlug: string | null; alvoEstado: string | null }) {
  if (l.linkUrl) return { href: l.linkUrl, externo: !l.linkUrl.startsWith("/") };
  if (l.alvoTipo && l.alvoSlug && l.alvoEstado === "publicado") {
    return { href: enderecoPublicoDoConteudo(l.alvoTipo, l.alvoSlug), externo: false };
  }
  return null;
}
