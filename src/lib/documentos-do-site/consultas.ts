import { and, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { banco } from "@/lib/db";
import { conteudo, conteudoVersao, midia } from "@/lib/db/schema";
import type { DadosDocumento, TipoDocumento } from "@/lib/documentos/dados";

import type { DocumentoNoAr } from "./pagina";

/**
 * Leituras públicas dos documentos oficiais (RF04, E60). Tudo vem do **retrato da versão no ar**
 * (E42, E46): o que está em edição no painel não aparece antes de publicar. Só o publicado, com
 * endereço, aparece: rascunho, agendado, oculto e arquivado ficam de fora.
 *
 * As páginas do site chamam estas funções direto; a rota pública do PDF confere
 * `pode(visitante, "ver", site_publico)` antes.
 */

const dados = sql`${conteudoVersao.snapshot} -> 'dados'`;

/** O documento está no ar: publicado, com endereço e data. */
const noAr = (tipo: TipoDocumento) =>
  and(eq(conteudo.tipo, tipo), eq(conteudo.estado, "publicado"), isNotNull(conteudo.slug), isNotNull(conteudo.publicadoEm));

/** O SELECT base: o retrato no ar (sem o texto pesquisável, que pode ter 200 mil caracteres) e o tamanho do PDF. */
function selecionar(condicao: SQL | undefined) {
  return banco()
    .select({
      id: conteudo.id,
      tipo: conteudo.tipo,
      slug: conteudo.slug,
      publicadoEm: conteudo.publicadoEm,
      dados: sql<DadosDocumento>`(${dados}) - 'textoPesquisavel'`,
      pdfBytes: midia.bytes,
    })
    .from(conteudo)
    .innerJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
    .leftJoin(midia, sql`${midia.id}::text = ${dados} ->> 'pdfMidiaId'`)
    .where(condicao)
    .orderBy(desc(conteudo.publicadoEm), desc(conteudo.id));
}

type Linha = Awaited<ReturnType<typeof selecionar>>[number];

function paraDocumento(l: Linha): DocumentoNoAr {
  return {
    id: l.id,
    tipo: l.tipo as TipoDocumento,
    slug: l.slug!,
    publicadoEm: l.publicadoEm!,
    dados: { ...l.dados, textoPesquisavel: "" },
    pdfBytes: l.pdfBytes ?? null,
  };
}

/** Todos os documentos no ar de um tipo (são dezenas: a página filtra e agrupa em memória). */
export async function documentosNoAr(tipo: TipoDocumento): Promise<DocumentoNoAr[]> {
  return (await selecionar(noAr(tipo))).map(paraDocumento);
}

/**
 * Os ids que combinam com a busca: título, número, resumo, abrangência, partes e o texto
 * pesquisável do PDF (P3), sem diferença de acento nem de maiúsculas. `%` e `_` valem como texto.
 */
export async function idsDaBusca(tipo: TipoDocumento, busca: string): Promise<Set<string>> {
  const termo = busca.trim();
  const padrao = `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const campos = sql`concat_ws(' ', ${dados} ->> 'titulo', ${dados} ->> 'numero', ${dados} ->> 'resumo', ${dados} ->> 'abrangencia', ${dados} ->> 'partesSignatarias', ${dados} ->> 'textoPesquisavel')`;
  const linhas = await banco()
    .select({ id: conteudo.id })
    .from(conteudo)
    .innerJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
    .where(and(noAr(tipo), sql`unaccent(${campos}) ilike unaccent(${padrao})`));
  return new Set(linhas.map((l) => l.id));
}

/** O documento aberto (N18) e a rota pública do PDF: só o que está no ar; senão, nulo (404). */
export async function documentoPeloSlug(tipo: TipoDocumento, slug: string): Promise<DocumentoNoAr | null> {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  const [linha] = await selecionar(and(noAr(tipo), eq(conteudo.slug, slug)));
  return linha ? paraDocumento(linha) : null;
}
