import { asc, eq } from "drizzle-orm";

import { banco } from "@/lib/db";
import { comunicado, conteudo } from "@/lib/db/schema";

import { filtroNoAr } from "./comum";
import { enderecoPublicoDoConteudo, type TipoDoLink } from "./regras";

export type ComunicadoDaFaixa = {
  id: string;
  /** O que a faixa mostra. */
  titulo: string;
  /** Texto simples, com as quebras de linha: na janela e na página /comunicados. */
  texto: string;
  /** O “Saiba mais”. Sem link, ou com o conteúdo fora do site, a faixa não mostra o link. */
  link: { href: string; externo: boolean } | null;
  /** Quando sai do ar (o “No ar até…” da página Comunicados). */
  fim: Date;
};

/**
 * Os comunicados no ar agora, na ordem da fila (RF08, RN14, CA-US01.1, CA-US01.2). Decide pelo
 * relógio, não pelo `estado` (E58): a faixa entra e sai na hora certa mesmo se a tarefa T02 atrasar,
 * e o site não precisa ser publicado de novo. Serve a faixa e a página /comunicados. É pública: não
 * passa por `pode()`, como o resto do site.
 */
export async function comunicadosNoAr(agora: Date = new Date()): Promise<ComunicadoDaFaixa[]> {
  const linhas = await banco()
    .select({
      id: comunicado.id,
      titulo: comunicado.titulo,
      texto: comunicado.texto,
      linkUrl: comunicado.linkUrl,
      fim: comunicado.fim,
      alvoTipo: conteudo.tipo,
      alvoSlug: conteudo.slug,
      alvoEstado: conteudo.estado,
    })
    .from(comunicado)
    .leftJoin(conteudo, eq(conteudo.id, comunicado.linkConteudoId))
    .where(filtroNoAr(agora))
    .orderBy(asc(comunicado.ordemFila), asc(comunicado.id));

  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    texto: l.texto,
    link: linkDaFaixa(l),
    fim: l.fim!, // no ar quer dizer fim > agora: nunca é nulo aqui
  }));
}

function linkDaFaixa(l: { linkUrl: string | null; alvoTipo: TipoDoLink | null; alvoSlug: string | null; alvoEstado: string | null }) {
  if (l.linkUrl) return { href: l.linkUrl, externo: !l.linkUrl.startsWith("/") };
  if (l.alvoTipo && l.alvoSlug && l.alvoEstado === "publicado") {
    return { href: enderecoPublicoDoConteudo(l.alvoTipo, l.alvoSlug), externo: false };
  }
  return null;
}
