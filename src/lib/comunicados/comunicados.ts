import { and, asc, desc, eq, gt, inArray, lte, max, ne, or, sql } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { comunicado, conteudo } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { filtroNoAr, registrar } from "./comum";
import {
  ABAS,
  comunicadoNaoEncontrado,
  conferirDados,
  ErroComunicado,
  NOME_DO_TIPO,
  situacaoDo,
  type Aba,
  type DadosComunicado,
  type LinkComunicado,
  type ModoDeSalvar,
  type Situacao,
  type TipoDoLink,
} from "./regras";

export type LinhaComunicado = typeof comunicado.$inferSelect;

export type Deps = {
  quem: QuemDaEquipe;
  /** Relógio (os testes passam um fixo). */
  agora?: Date;
};
export type DepsComFila = Deps & { fila: Fila };

// --- Peças internas -------------------------------------------------------------------------

async function travar(tx: Transacao, id: string): Promise<LinhaComunicado> {
  const [atual] = await tx.select().from(comunicado).where(eq(comunicado.id, id)).for("update");
  if (!atual) throw comunicadoNaoEncontrado();
  return atual;
}

function linkDaLinha(l: Pick<LinhaComunicado, "linkConteudoId" | "linkUrl">): LinkComunicado {
  if (l.linkConteudoId) return { tipo: "conteudo", id: l.linkConteudoId };
  if (l.linkUrl) return { tipo: "url", url: l.linkUrl };
  return null;
}

function colunasDoLink(link: LinkComunicado) {
  return {
    linkConteudoId: link?.tipo === "conteudo" ? link.id : null,
    linkUrl: link?.tipo === "url" ? link.url : null,
  };
}

/** O “Saiba mais” para um conteúdo só aceita notícia, edital ou acordo publicado. */
async function conferirConteudoDoLink(tx: Transacao, link: LinkComunicado) {
  if (link?.tipo !== "conteudo") return;
  const [alvo] = await tx.select({ estado: conteudo.estado }).from(conteudo).where(eq(conteudo.id, link.id));
  if (alvo?.estado !== "publicado") {
    throw new ErroComunicado("invalido", "Este conteúdo não está no site. Escolha outro ou cole um link.", "link");
  }
}

async function proximaPosicaoNaFila(tx: Transacao): Promise<number> {
  const [linha] = await tx.select({ maior: max(comunicado.ordemFila) }).from(comunicado);
  return (linha?.maior ?? 0) + 1;
}

/** Põe na fila as viradas do período (T02): entrar no início (se ainda não entrou) e sair no fim. */
async function agendarViradas(tx: Transacao, fila: Fila, id: string, situacao: Situacao, inicio: Date, fim: Date) {
  if (situacao === "agendado") await fila.agendarComunicado(tx, { comunicadoId: id, virada: "entrar", para: inicio });
  await fila.agendarComunicado(tx, { comunicadoId: id, virada: "sair", para: fim });
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

// --- Salvar ---------------------------------------------------------------------------------

export type ResultadoSalvar = { id: string; situacao: Situacao };

/**
 * Cria ou salva um comunicado (RF43, RN14, E58).
 * - `rascunho`: fica fora do site. Um agendado que volta a rascunho sai da agenda.
 * - `programar`: com início no futuro, fica Agendado; com início agora ou antes, entra no ar na hora
 *   (o início passa a ser agora). No ar, dá para mudar o título, o texto, o link e o fim, mas não o início.
 * O encerrado não se edita: duplique.
 */
export async function salvarComunicado(
  entrada: { id?: string; dados: DadosComunicado; modo: ModoDeSalvar },
  deps: DepsComFila,
): Promise<ResultadoSalvar> {
  exigir(deps.quem, "gerenciar", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();

  return banco().transaction(async (tx) => {
    const atual = entrada.id ? await travar(tx, entrada.id) : null;
    const situacaoAntes = atual ? situacaoDo(atual, agora) : "rascunho";

    if (situacaoAntes === "encerrado") {
      throw new ErroComunicado("invalido", "Este comunicado já foi encerrado. Use “Duplicar” para publicar de novo.");
    }
    if (situacaoAntes === "no_ar" && entrada.modo === "rascunho") {
      throw new ErroComunicado("invalido", "Este comunicado está no ar. Para tirar do site, use “Encerrar agora”.");
    }

    // No ar, o início não muda (já passou).
    const pedido = situacaoAntes === "no_ar" ? { ...entrada.dados, inicio: atual!.inicio } : entrada.dados;
    const dados = conferirDados(pedido, entrada.modo, agora);
    await conferirConteudoDoLink(tx, dados.link);

    let estado: LinhaComunicado["estado"] = "rascunho";
    let inicio = dados.inicio;
    let situacao: Situacao = "rascunho";
    let entraAgora = false;
    if (entrada.modo === "programar") {
      if (situacaoAntes === "no_ar") {
        estado = "publicado";
        situacao = "no_ar";
      } else if (inicio!.getTime() <= agora.getTime()) {
        estado = "publicado";
        situacao = "no_ar";
        inicio = agora;
        entraAgora = true;
      } else {
        estado = "agendado";
        situacao = "agendado";
      }
    }

    const valores = {
      titulo: dados.titulo,
      texto: dados.texto,
      ...colunasDoLink(dados.link),
      inicio,
      fim: dados.fim,
      estado,
      atualizadoPor: deps.quem.id,
      ...(entraAgora ? { publicadoEm: agora, jaPublicado: true } : {}),
    };

    let id: string;
    if (!atual) {
      const [nova] = await tx
        .insert(comunicado)
        .values({ ...valores, criadoPor: deps.quem.id, ordemFila: await proximaPosicaoNaFila(tx) })
        .returning({ id: comunicado.id });
      id = nova!.id;
      await registrar(tx, deps.quem, { id, titulo: dados.titulo }, "criar", { situacao });
    } else {
      id = atual.id;
      await tx.update(comunicado).set(valores).where(eq(comunicado.id, id));
      const mudou = mudancas(atual, { ...dados, inicio });
      if (Object.keys(mudou).length > 0) await registrar(tx, deps.quem, { id, titulo: dados.titulo }, "editar", mudou);
    }

    const periodo = { inicio: iso(inicio), fim: iso(dados.fim) };
    if (entraAgora) await registrar(tx, deps.quem, { id, titulo: dados.titulo }, "publicar", periodo);
    else if (situacao === "agendado" && situacaoAntes !== "agendado") {
      await registrar(tx, deps.quem, { id, titulo: dados.titulo }, "agendar", periodo);
    } else if (situacao === "rascunho" && situacaoAntes === "agendado") {
      await registrar(tx, deps.quem, { id, titulo: dados.titulo }, "cancelar_agendamento", { inicio: iso(atual!.inicio) });
    }

    if (situacao !== "rascunho") await agendarViradas(tx, deps.fila, id, situacao, inicio!, dados.fim!);
    return { id, situacao };
  });
}

/** O que mudou, para a Atividade (só os campos alterados, com o antes e o depois). */
function mudancas(atual: LinhaComunicado, novo: DadosComunicado): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  if (atual.titulo !== novo.titulo) saida.titulo = { de: atual.titulo, para: novo.titulo };
  if (atual.texto !== novo.texto) saida.texto = { de: atual.texto, para: novo.texto };
  const linkAntes = linkDaLinha(atual);
  if (JSON.stringify(linkAntes) !== JSON.stringify(novo.link)) saida.link = { de: linkAntes, para: novo.link };
  if (iso(atual.inicio) !== iso(novo.inicio)) saida.inicio = { de: iso(atual.inicio), para: iso(novo.inicio) };
  if (iso(atual.fim) !== iso(novo.fim)) saida.fim = { de: iso(atual.fim), para: iso(novo.fim) };
  return saida;
}

// --- Ações do menu ----------------------------------------------------------------------------

/** “Encerrar agora” (CA-US24.2, RF44, RN09): só o que está no ar; a confirmação é da tela. */
export async function encerrarComunicado(entrada: { id: string }, deps: Deps): Promise<void> {
  exigir(deps.quem, "gerenciar", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  await banco().transaction(async (tx) => {
    const atual = await travar(tx, entrada.id);
    if (situacaoDo(atual, agora) !== "no_ar") {
      throw new ErroComunicado("invalido", "Este comunicado não está no ar. Atualize a página.");
    }
    await tx
      .update(comunicado)
      .set({
        estado: "encerrado",
        encerradoEm: agora,
        encerradoPor: deps.quem.id,
        jaPublicado: true,
        publicadoEm: atual.publicadoEm ?? atual.inicio,
        atualizadoPor: deps.quem.id,
      })
      .where(eq(comunicado.id, atual.id));
    await registrar(tx, deps.quem, atual, "encerrar", { fim_previsto: iso(atual.fim), encerrado_em: agora.toISOString() });
  });
}

/** “Cancelar agendamento”: o agendado volta a rascunho, com o período guardado para editar depois. */
export async function cancelarAgendamentoDoComunicado(entrada: { id: string }, deps: Deps): Promise<void> {
  exigir(deps.quem, "gerenciar", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  await banco().transaction(async (tx) => {
    const atual = await travar(tx, entrada.id);
    if (situacaoDo(atual, agora) !== "agendado") {
      throw new ErroComunicado("invalido", "Este comunicado não está agendado. Atualize a página.");
    }
    await tx.update(comunicado).set({ estado: "rascunho", atualizadoPor: deps.quem.id }).where(eq(comunicado.id, atual.id));
    await registrar(tx, deps.quem, atual, "cancelar_agendamento", { inicio: iso(atual.inicio) });
  });
}

/** “Duplicar” (RF44, RN14): só o encerrado. A cópia é um rascunho novo, sem período, no fim da fila. */
export async function duplicarComunicado(entrada: { id: string }, deps: Deps): Promise<{ id: string }> {
  exigir(deps.quem, "gerenciar", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  return banco().transaction(async (tx) => {
    const original = await travar(tx, entrada.id);
    if (situacaoDo(original, agora) !== "encerrado") {
      throw new ErroComunicado("invalido", "Só um comunicado encerrado pode ser duplicado.");
    }
    const [copia] = await tx
      .insert(comunicado)
      .values({
        titulo: original.titulo,
        texto: original.texto,
        linkConteudoId: original.linkConteudoId,
        linkUrl: original.linkUrl,
        ordemFila: await proximaPosicaoNaFila(tx),
        criadoPor: deps.quem.id,
        atualizadoPor: deps.quem.id,
      })
      .returning({ id: comunicado.id });
    await registrar(tx, deps.quem, { id: copia!.id, titulo: original.titulo }, "duplicar", { origem: original.id });
    return { id: copia!.id };
  });
}

/** Excluir de vez: só rascunho nunca publicado, pelo ADM ou por quem criou (E07). */
export async function excluirComunicado(entrada: { id: string }, deps: Deps): Promise<void> {
  await banco().transaction(async (tx) => {
    const atual = await travar(tx, entrada.id);
    exigir(deps.quem, "excluir", { tipo: "comunicado", criadoPorId: atual.criadoPor, jaPublicado: atual.jaPublicado });
    if (atual.estado !== "rascunho") {
      throw new ErroComunicado("invalido", "Só um rascunho pode ser excluído. Atualize a página.");
    }
    await tx.delete(comunicado).where(eq(comunicado.id, atual.id));
    await registrar(tx, deps.quem, atual, "excluir");
  });
}

/**
 * Quantos a aba No ar mostra de uma vez, sem páginas: a fila se reordena inteira (`reordenarFila`).
 * Bem acima do que cabe numa faixa que alterna.
 */
export const MAXIMO_NA_FILA = 100;

/**
 * Muda a ordem da fila (RF43, E58): `ids` tem de ser a lista inteira dos que estão no ar agora, na
 * ordem nova. Com um id fora do ar, faltando um ou sobrando um, recusa sem mudar nada (a fila mudou
 * enquanto a pessoa mexia, ou o pedido foi montado à mão). As posições que eles já ocupavam são
 * redistribuídas nessa ordem; os demais não mudam.
 */
export async function reordenarFila(entrada: { ids: string[] }, deps: Deps): Promise<void> {
  exigir(deps.quem, "gerenciar", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  const ids = [...new Set(entrada.ids)];
  await banco().transaction(async (tx) => {
    const linhas = await tx.select().from(comunicado).where(filtroDaAba("no_ar", agora)).orderBy(asc(comunicado.id)).for("update");
    const noAr = new Set(linhas.map((l) => l.id));
    if (ids.length !== entrada.ids.length || ids.length !== noAr.size || ids.some((id) => !noAr.has(id))) {
      throw new ErroComunicado("invalido", "A fila mudou enquanto você mexia. Atualize a página e tente de novo.");
    }
    if (linhas.length < 2) return;
    const posicoes = linhas.map((l) => l.ordemFila).sort((a, b) => a - b);
    const porId = new Map(linhas.map((l) => [l.id, l]));
    const antes = [...linhas].sort((a, b) => a.ordemFila - b.ordemFila).map((l) => l.id);
    if (antes.join() === ids.join()) return;
    for (const [i, id] of ids.entries()) {
      if (porId.get(id)!.ordemFila !== posicoes[i]) {
        await tx.update(comunicado).set({ ordemFila: posicoes[i]! }).where(eq(comunicado.id, id));
      }
    }
    const primeiro = porId.get(ids[0]!)!;
    await registrar(tx, deps.quem, primeiro, "reordenar", { de: antes, para: ids });
  });
}

// --- Leitura para o painel -------------------------------------------------------------------

export type ComunicadoNaLista = {
  id: string;
  titulo: string;
  texto: string;
  link: LinkComunicado;
  /** O texto do “Saiba mais → …” na lista. */
  rotuloDoLink: string | null;
  inicio: Date | null;
  fim: Date | null;
  situacao: Situacao;
  encerradoEm: Date | null;
  criadoPor: string;
  jaPublicado: boolean;
};

/** Os filtros de cada aba, pelo relógio (E58). */
function filtroDaAba(aba: Aba, agora: Date) {
  const programado = inArray(comunicado.estado, ["agendado", "publicado"]);
  switch (aba) {
    case "no_ar":
      return filtroNoAr(agora);
    case "agendados":
      return and(programado, gt(comunicado.inicio, agora));
    case "rascunhos":
      return eq(comunicado.estado, "rascunho");
    case "encerrados":
      return or(eq(comunicado.estado, "encerrado"), and(programado, lte(comunicado.fim, agora)));
  }
}

function ordemDaAba(aba: Aba) {
  switch (aba) {
    case "no_ar":
      return [asc(comunicado.ordemFila)];
    case "agendados":
      return [asc(comunicado.inicio), asc(comunicado.ordemFila)];
    case "rascunhos":
      return [desc(comunicado.atualizadoEm), desc(comunicado.id)];
    case "encerrados":
      return [desc(sql`coalesce(${comunicado.encerradoEm}, ${comunicado.fim})`), desc(comunicado.id)];
  }
}

/** O comunicado com o conteúdo do “Saiba mais”, como listar e carregar leem. */
const COM_O_CONTEUDO = { c: comunicado, alvoTipo: conteudo.tipo, alvoTitulo: conteudo.titulo };
type LinhaComConteudo = { c: LinhaComunicado; alvoTipo: TipoDoLink | null; alvoTitulo: string | null };

function itemDaLista({ c, alvoTipo, alvoTitulo }: LinhaComConteudo, agora: Date): ComunicadoNaLista {
  const situacao = situacaoDo(c, agora);
  return {
    id: c.id,
    titulo: c.titulo,
    texto: c.texto,
    link: linkDaLinha(c),
    rotuloDoLink: alvoTipo ? `${NOME_DO_TIPO[alvoTipo].toLowerCase()} “${alvoTitulo}”` : c.linkUrl,
    inicio: c.inicio,
    fim: c.fim,
    situacao,
    // Passou do fim sem a T02 rodar: conta como encerrado no fim.
    encerradoEm: c.encerradoEm ?? (situacao === "encerrado" ? c.fim : null),
    criadoPor: c.criadoPor,
    jaPublicado: c.jaPublicado || situacao !== "rascunho",
  };
}

/** Uma página de uma aba da área Comunicados. */
export async function listarComunicados(
  filtros: { aba: Aba; pagina?: number; porPagina?: number },
  deps: Deps,
): Promise<{ itens: ComunicadoNaLista[]; total: number }> {
  exigir(deps.quem, "ver", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  const porPagina = filtros.porPagina ?? 20;
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const onde = filtroDaAba(filtros.aba, agora);

  const [linhas, [contagem]] = await Promise.all([
    banco()
      .select(COM_O_CONTEUDO)
      .from(comunicado)
      .leftJoin(conteudo, eq(conteudo.id, comunicado.linkConteudoId))
      .where(onde)
      .orderBy(...ordemDaAba(filtros.aba))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
    banco().select({ total: sql<number>`count(*)::int` }).from(comunicado).where(onde),
  ]);

  return {
    total: contagem?.total ?? 0,
    itens: linhas.map((l) => itemDaLista(l, agora)),
  };
}

/**
 * Em que página da aba Encerrados está um comunicado (clique no calendário de Conteúdos, E17, E58),
 * na mesma ordem de `listarComunicados`. Nulo se ele não está entre os encerrados.
 */
export async function paginaDoEncerrado(id: string, porPagina: number, deps: Deps): Promise<number | null> {
  exigir(deps.quem, "ver", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  const onde = filtroDaAba("encerrados", agora);
  const [alvo] = await banco().select({ id: comunicado.id }).from(comunicado).where(and(eq(comunicado.id, id), onde));
  if (!alvo) return null;
  // Os que vêm antes dele na ordem da aba: término mais recente, e o id para desempatar.
  const [linha] = await banco()
    .select({ antes: sql<number>`count(*)::int` })
    .from(comunicado)
    .where(
      and(
        onde,
        sql`(coalesce(${comunicado.encerradoEm}, ${comunicado.fim}), ${comunicado.id}) >
          (select coalesce(x.encerrado_em, x.fim), x.id from comunicado x where x.id = ${id})`,
      ),
    );
  return Math.floor((linha?.antes ?? 0) / porPagina) + 1;
}

/** Quantos há em cada aba (os números das abas). */
export async function contarPorAba(deps: Deps): Promise<Record<Aba, number>> {
  exigir(deps.quem, "ver", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  const totais = await Promise.all(
    ABAS.map(async (aba) => {
      const [linha] = await banco().select({ total: sql<number>`count(*)::int` }).from(comunicado).where(filtroDaAba(aba, agora));
      return [aba, linha?.total ?? 0] as const;
    }),
  );
  return Object.fromEntries(totais) as Record<Aba, number>;
}

export type ComunicadoAberto = ComunicadoNaLista & { rotuloDoConteudo: string | null };

/** Um comunicado, para o formulário de edição. */
export async function carregarComunicado(id: string, deps: Deps): Promise<ComunicadoAberto | null> {
  exigir(deps.quem, "ver", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  const [linha] = await banco()
    .select(COM_O_CONTEUDO)
    .from(comunicado)
    .leftJoin(conteudo, eq(conteudo.id, comunicado.linkConteudoId))
    .where(eq(comunicado.id, id));
  if (!linha) return null;
  return { ...itemDaLista(linha, agora), rotuloDoConteudo: linha.alvoTitulo };
}

/** Notícias, editais e acordos publicados, para o “Saiba mais” (busca pelo título). */
export async function conteudosParaOLink(busca: string, deps: Deps): Promise<{ id: string; tipo: TipoDoLink; titulo: string }[]> {
  exigir(deps.quem, "gerenciar", { tipo: "comunicado" });
  const termo = busca.trim();
  return banco()
    .select({ id: conteudo.id, tipo: conteudo.tipo, titulo: conteudo.titulo })
    .from(conteudo)
    .where(
      and(
        eq(conteudo.estado, "publicado"),
        ne(conteudo.titulo, ""),
        termo ? sql`unaccent(${conteudo.titulo}) ILIKE unaccent(${`%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`})` : undefined,
      ),
    )
    .orderBy(desc(conteudo.publicadoEm), desc(conteudo.id))
    .limit(8);
}

// --- Calendário de Conteúdos (E17, C3) --------------------------------------------------------

export type ComunicadoNoCalendario = {
  id: string;
  titulo: string;
  situacao: Exclude<Situacao, "rascunho">;
  /** Primeiro e último dia ("AAAA-MM-DD", horário da Bahia) em que esteve ou estará no ar. */
  primeiroDia: string;
  ultimoDia: string;
};

/**
 * Os comunicados com período dentro de um intervalo, para as barras do calendário (E17): só para
 * consulta. Vai até o encerramento, se foi encerrado antes do fim. Rascunho não aparece.
 */
export async function comunicadosDoCalendario(
  intervalo: { de: Date; ate: Date },
  deps: Deps & { diaDe: (instante: Date) => string },
): Promise<ComunicadoNoCalendario[]> {
  exigir(deps.quem, "ver", { tipo: "comunicado" });
  const agora = deps.agora ?? new Date();
  const termino = sql`coalesce(${comunicado.encerradoEm}, ${comunicado.fim})`;
  const linhas = await banco()
    .select()
    .from(comunicado)
    .where(and(ne(comunicado.estado, "rascunho"), lte(comunicado.inicio, intervalo.ate), sql`${termino} > ${intervalo.de.toISOString()}::timestamptz`))
    .orderBy(asc(comunicado.inicio), asc(comunicado.ordemFila));
  return linhas.map((c) => {
    const ate = c.encerradoEm ?? c.fim!;
    // Quem sai às 00h00 não ficou no ar naquele dia.
    const ultimo = new Date(Math.max(c.inicio!.getTime(), ate.getTime() - 1));
    return {
      id: c.id,
      titulo: c.titulo,
      situacao: situacaoDo(c, agora) as ComunicadoNoCalendario["situacao"],
      primeiroDia: deps.diaDe(c.inicio!),
      ultimoDia: deps.diaDe(ultimo),
    };
  });
}
