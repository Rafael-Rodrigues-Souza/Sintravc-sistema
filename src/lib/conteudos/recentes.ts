import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { urlPublica } from "@/lib/armazenamento";
import { enderecoPublicoDoConteudo } from "@/lib/comunicados/regras";
import { banco } from "@/lib/db";
import { conteudo, conteudoVersao, midia } from "@/lib/db/schema";
import { lerEnvArmazenamento } from "@/lib/env";

export type NoticiaRecente = {
  id: string;
  titulo: string;
  /** Endereço da notícia aberta (a página chega na #15). */
  href: string;
  publicadoEm: Date;
  capa: { url: string; alt: string } | null;
};

/**
 * As últimas notícias publicadas, para a coluna “Notícias recentes” da página Comunicados (E58).
 * Lê o retrato da versão no ar (E42), não a cópia de trabalho: o que está em edição no painel não
 * aparece antes de publicar. É pública: não passa por `pode()`, como o resto do site.
 */
export async function noticiasRecentes(limite = 4): Promise<NoticiaRecente[]> {
  const dados = sql`${conteudoVersao.snapshot} -> 'dados'`;
  const linhas = await banco()
    .select({
      id: conteudo.id,
      slug: conteudo.slug,
      publicadoEm: conteudo.publicadoEm,
      titulo: sql<string>`${dados} ->> 'titulo'`,
      capaAlt: sql<string | null>`${dados} ->> 'capaAlt'`,
      capaChave: midia.chaveR2,
    })
    .from(conteudo)
    .innerJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
    .leftJoin(midia, sql`${midia.id}::text = ${dados} ->> 'capaMidiaId'`)
    .where(and(eq(conteudo.tipo, "noticia"), eq(conteudo.estado, "publicado"), isNotNull(conteudo.slug), isNotNull(conteudo.publicadoEm)))
    .orderBy(desc(conteudo.publicadoEm), desc(conteudo.id))
    .limit(limite);

  const env = linhas.some((l) => l.capaChave) ? lerEnvArmazenamento() : null;
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    href: enderecoPublicoDoConteudo("noticia", l.slug!),
    publicadoEm: l.publicadoEm!,
    capa: l.capaChave && env ? { url: urlPublica(l.capaChave, env), alt: l.capaAlt ?? "" } : null,
  }));
}
