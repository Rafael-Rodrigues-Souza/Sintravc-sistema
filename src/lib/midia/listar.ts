import { and, count, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";

import { banco } from "@/lib/db";
import { midia, midiaUso, pessoaEquipe } from "@/lib/db/schema";

import type { UsoDaMidia } from "./erros";
import type { TipoMidia } from "./preparar";
import { usosDasMidias } from "./usos";

export const FILTROS = ["todos", "imagens", "pdfs", "documentos", "sem_alt"] as const;
export type FiltroMidia = (typeof FILTROS)[number];

export type ItemMidia = {
  id: string;
  chaveR2: string;
  nomeArquivo: string;
  tipo: TipoMidia;
  mime: string;
  largura: number | null;
  altura: number | null;
  bytes: number;
  paginas: number | null;
  alt: string | null;
  legenda: string | null;
  criadoEm: Date;
  enviadoPor: string;
  usos: number;
};

/** Imagem sem texto alternativo (vazio ou só espaços): não pode ser publicada (RN15). */
const semAlt = and(eq(midia.tipo, "imagem"), or(isNull(midia.alt), sql`btrim(${midia.alt}) = ''`));

const CONDICAO: Record<FiltroMidia, SQL | undefined> = {
  todos: undefined,
  imagens: eq(midia.tipo, "imagem"),
  pdfs: eq(midia.tipo, "pdf"),
  documentos: eq(midia.tipo, "documento"),
  sem_alt: semAlt,
};

/** Busca no nome, no texto alternativo e na legenda, sem diferença de acento nem de maiúsculas. */
function condicaoDaBusca(busca: string | undefined): SQL | undefined {
  const termo = busca?.trim();
  if (!termo) return undefined;
  const padrao = `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const campo = sql`unaccent(concat_ws(' ', ${midia.nomeArquivo}, ${midia.alt}, ${midia.legenda}))`;
  return sql`${campo} ilike unaccent(${padrao})`;
}

/** Colunas da grade e dos detalhes (com o nome de quem enviou, via join em pessoa_equipe). */
const COLUNAS = {
  id: midia.id,
  chaveR2: midia.chaveR2,
  nomeArquivo: midia.nomeArquivo,
  tipo: midia.tipo,
  mime: midia.mime,
  largura: midia.largura,
  altura: midia.altura,
  bytes: midia.bytes,
  paginas: midia.paginas,
  alt: midia.alt,
  legenda: midia.legenda,
  criadoEm: midia.criadoEm,
  enviadoPor: pessoaEquipe.nome,
};

export const POR_PAGINA = 48;

/** A grade da Mídia: do mais novo para o mais antigo, com filtro, busca e páginas. */
export async function listarMidia(
  opcoes: { filtro?: FiltroMidia; busca?: string; pagina?: number; porPagina?: number } = {},
): Promise<{ itens: ItemMidia[]; total: number }> {
  const porPagina = opcoes.porPagina ?? POR_PAGINA;
  const pagina = Math.max(1, opcoes.pagina ?? 1);
  const onde = and(CONDICAO[opcoes.filtro ?? "todos"], condicaoDaBusca(opcoes.busca));
  const usosPorMidia = banco()
    .$with("usos_por_midia")
    .as(banco().select({ midiaId: midiaUso.midiaId, total: count().as("total") }).from(midiaUso).groupBy(midiaUso.midiaId));

  const [linhas, [contagem]] = await Promise.all([
    banco()
      .with(usosPorMidia)
      .select({ ...COLUNAS, usos: sql<number>`coalesce(${usosPorMidia.total}, 0)::int` })
      .from(midia)
      .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, midia.enviadoPor))
      .leftJoin(usosPorMidia, eq(usosPorMidia.midiaId, midia.id))
      .where(onde)
      .orderBy(desc(midia.criadoEm), desc(midia.id))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
    banco().select({ total: count() }).from(midia).where(onde),
  ]);
  return { itens: linhas, total: contagem?.total ?? 0 };
}

/** Os números das abas: Todos, Imagens, PDFs, Documentos e Sem texto alternativo. */
export async function contarMidia() {
  const [linha] = await banco()
    .select({
      todos: count(),
      imagens: count(sql`case when ${midia.tipo} = 'imagem' then 1 end`),
      pdfs: count(sql`case when ${midia.tipo} = 'pdf' then 1 end`),
      documentos: count(sql`case when ${midia.tipo} = 'documento' then 1 end`),
      semAlt: count(sql`case when ${semAlt} then 1 end`),
    })
    .from(midia);
  return linha ?? { todos: 0, imagens: 0, pdfs: 0, documentos: 0, semAlt: 0 };
}

/** O painel "Detalhes do arquivo", com a lista "Usado em". */
export async function detalharMidia(id: string): Promise<(Omit<ItemMidia, "usos"> & { usos: UsoDaMidia[] }) | undefined> {
  const [linha] = await banco()
    .select(COLUNAS)
    .from(midia)
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, midia.enviadoPor))
    .where(eq(midia.id, id));
  if (!linha) return undefined;
  const usos = (await usosDasMidias([id])).get(id) ?? [];
  return { ...linha, usos };
}
