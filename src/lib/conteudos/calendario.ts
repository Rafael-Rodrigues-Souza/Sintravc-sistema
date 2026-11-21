import { and, asc, between, count, desc, eq, isNull, or } from "drizzle-orm";

import { banco } from "@/lib/db";
import { conteudo } from "@/lib/db/schema";
import { bahiaParaUtc } from "@/lib/datas";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { diaNoCalendario, gradeDoMes } from "./grade-do-mes";
import type { EstadoConteudo, TipoConteudo } from "./listar";

export type ItemDoCalendario = {
  id: string;
  tipo: TipoConteudo;
  titulo: string;
  estado: Extract<EstadoConteudo, "publicado" | "agendado">;
  /** Quando foi ao ar (publicado) ou quando vai ao ar (agendado). */
  quando: Date;
  revisao: number;
};

/** Do primeiro instante do primeiro dia ao último instante do último dia da grade (horário da Bahia). */
export function intervaloDaGrade(ano: number, mes: number): { de: Date; ate: Date } {
  const grade = gradeDoMes(ano, mes);
  const de = bahiaParaUtc(grade[0]!.data, "00:00")!;
  const ate = new Date(bahiaParaUtc(grade.at(-1)!.data, "00:00")!.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { de, ate };
}

/** Quantos rascunhos sem data aparecem ao lado do calendário. */
export const RASCUNHOS_NA_LATERAL = 20;

/**
 * Calendário de publicações (RF36, Figma 115:2992): os publicados pela data em que foram ao ar
 * e os agendados pela data marcada, agrupados pelo dia da Bahia (RNF06), nos 42 dias da grade.
 * Os comunicados (E17) vêm de comunicadosDoCalendario(), na mesma grade.
 */
export async function itensDoCalendario(
  filtros: { ano: number; mes: number; tipo?: TipoConteudo },
  deps: { quem: QuemDaEquipe },
): Promise<{ dias: Record<string, ItemDoCalendario[]> }> {
  exigir(deps.quem, "ver", { tipo: "noticia" });
  const { de, ate } = intervaloDaGrade(filtros.ano, filtros.mes);

  const linhas = await banco()
    .select({
      id: conteudo.id,
      tipo: conteudo.tipo,
      titulo: conteudo.titulo,
      estado: conteudo.estado,
      publicadoEm: conteudo.publicadoEm,
      agendadoPara: conteudo.agendadoPara,
      revisao: conteudo.revisao,
    })
    .from(conteudo)
    .where(
      and(
        filtros.tipo ? eq(conteudo.tipo, filtros.tipo) : undefined,
        or(
          and(eq(conteudo.estado, "publicado"), between(conteudo.publicadoEm, de, ate)),
          and(eq(conteudo.estado, "agendado"), between(conteudo.agendadoPara, de, ate)),
        ),
      ),
    );

  const dias: Record<string, ItemDoCalendario[]> = {};
  for (const l of linhas) {
    const quando = l.estado === "publicado" ? l.publicadoEm! : l.agendadoPara!;
    const item: ItemDoCalendario = {
      id: l.id,
      tipo: l.tipo,
      titulo: l.titulo,
      estado: l.estado as ItemDoCalendario["estado"],
      quando,
      revisao: l.revisao,
    };
    (dias[diaNoCalendario(quando)] ??= []).push(item);
  }
  for (const itens of Object.values(dias)) itens.sort((a, b) => a.quando.getTime() - b.quando.getTime());
  return { dias };
}

export type RascunhoSemData = { id: string; tipo: TipoConteudo; titulo: string; revisao: number };

/**
 * "Rascunhos sem data", do mais recente para o mais antigo: arraste para um dia para agendar.
 * Só notícias, já na consulta: a lista mostra até 20 e o total conta só notícias (editais e
 * acordos chegam no #12).
 */
export async function rascunhosSemData(deps: { quem: QuemDaEquipe }): Promise<{ itens: RascunhoSemData[]; total: number }> {
  exigir(deps.quem, "ver", { tipo: "noticia" });
  const onde = and(eq(conteudo.tipo, "noticia"), eq(conteudo.estado, "rascunho"), isNull(conteudo.agendadoPara));
  const [itens, [contagem]] = await Promise.all([
    banco()
      .select({ id: conteudo.id, tipo: conteudo.tipo, titulo: conteudo.titulo, revisao: conteudo.revisao })
      .from(conteudo)
      .where(onde)
      .orderBy(desc(conteudo.atualizadoEm), asc(conteudo.id))
      .limit(RASCUNHOS_NA_LATERAL),
    banco().select({ total: count() }).from(conteudo).where(onde),
  ]);
  return { itens, total: contagem?.total ?? 0 };
}
