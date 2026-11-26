import { asc, eq, inArray } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import { banco, type Transacao } from "@/lib/db";
import { destaqueHome, paginaInicial, pessoaEquipe } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { detalhesDosItens, type DetalheDoItem } from "./itens";
import {
  alteracoesNaoPublicadas,
  chaveDoItem,
  chaveNaArea,
  conferirDados,
  ErroPaginaInicial,
  estadoDoItem,
  type AreaDoDestaque,
  type DadosDaHome,
  type LimitesDaHome,
} from "./regras";

export type Deps = { quem: QuemDaEquipe; agora?: Date };
export type DepsComFila = Deps & { fila: Fila };

type Versao = "rascunho" | "publicado";
type Linha = typeof destaqueHome.$inferSelect;

const RECURSO = { tipo: "pagina_inicial" } as const;

export const CONFLITO = "Outra pessoa mudou a página inicial enquanto você mexia. Recarregue a página para ver a versão nova.";

// --- Leitura do banco --------------------------------------------------------------------------

async function linhasDa(db: Transacao | ReturnType<typeof banco>, versao: Versao): Promise<Linha[]> {
  return db.select().from(destaqueHome).where(eq(destaqueHome.versao, versao)).orderBy(asc(destaqueHome.area), asc(destaqueHome.posicao));
}

function paraDados(linhas: Linha[], listaPosicoes: number): DadosDaHome {
  const carrossel = linhas
    .filter((l) => l.area === "carrossel")
    .map((l) => ({ tipo: l.itemTipo!, itemId: l.itemId, entraEm: l.entraEm, saiEm: l.saiEm, fraseChamada: l.fraseChamada }));
  const lista = Array.from({ length: listaPosicoes }, (_, i) => {
    const linha = linhas.find((l) => l.area === "lista" && l.posicao === i + 1 && l.modo === "escolhido" && l.itemId);
    return linha ? { noticiaId: linha.itemId! } : null;
  });
  return { carrossel, lista };
}

/** O publicado da Home, para o site e para a T04. */
export async function lerDadosDaHome(versao: Versao = "publicado"): Promise<DadosDaHome> {
  const [linhas, listaPosicoes] = await Promise.all([linhasDa(banco(), versao), lerParametro("home.lista_posicoes")]);
  return paraDados(linhas, listaPosicoes);
}

async function travarControle(tx: Transacao) {
  const [controle] = await tx.select().from(paginaInicial).where(eq(paginaInicial.id, "home")).for("update");
  if (!controle) throw new Error('Controle da página inicial não encontrado (registro "home"). Rode as migrações.');
  return controle;
}

/**
 * Grava `dados` como a versão inteira. Quem escolheu cada item vem de `anteriores` (pela chave no
 * carrossel e pela notícia na lista); o que é novo fica com `quem`.
 */
async function gravarVersao(tx: Transacao, versao: Versao, dados: DadosDaHome, anteriores: Linha[], quem: string | null) {
  await tx.delete(destaqueHome).where(eq(destaqueHome.versao, versao));
  const quemEscolheu = (area: AreaDoDestaque, chave: string) =>
    anteriores.find((l) => l.itemTipo && chaveNaArea(l.area, { tipo: l.itemTipo, itemId: l.itemId }) === chave)?.escolhidoPor ?? quem;
  const linhas = [
    ...dados.carrossel.map((item, i) => ({
      versao,
      area: "carrossel" as const,
      posicao: i + 1,
      modo: "escolhido" as const,
      itemTipo: item.tipo,
      itemId: item.itemId,
      entraEm: item.entraEm,
      saiEm: item.saiEm,
      fraseChamada: item.fraseChamada,
      escolhidoPor: quemEscolheu("carrossel", chaveNaArea("carrossel", item)),
    })),
    ...dados.lista.flatMap((posicao, i) =>
      posicao
        ? [
            {
              versao,
              area: "lista" as const,
              posicao: i + 1,
              modo: "escolhido" as const,
              itemTipo: "noticia" as const,
              itemId: posicao.noticiaId,
              escolhidoPor: quemEscolheu("lista", chaveNaArea("lista", { tipo: "noticia", itemId: posicao.noticiaId })),
            },
          ]
        : [],
    ),
  ];
  if (linhas.length) await tx.insert(destaqueHome).values(linhas);
}

/**
 * Só entra o que está no ar (E62): notícia publicada (com capa, no carrossel) e episódio no ar. O
 * que já estava no rascunho pode ficar, mesmo que tenha saído do ar depois: o painel marca e o site pula.
 */
async function conferirItensNovos(dados: DadosDaHome, anterior: DadosDaHome, agora: Date) {
  const jaNoCarrossel = new Set(anterior.carrossel.map(chaveDoItem));
  const jaNaLista = new Set(anterior.lista.flatMap((p) => (p ? [p.noticiaId] : [])));
  const novosCarrossel = dados.carrossel.filter((i) => !jaNoCarrossel.has(chaveDoItem(i)));
  const novosLista = dados.lista.flatMap((p) => (p && !jaNaLista.has(p.noticiaId) ? [{ tipo: "noticia" as const, itemId: p.noticiaId }] : []));
  const site = await detalhesDosItens([...novosCarrossel, ...novosLista], agora);
  const naoEstaNoSite = (tipo: "noticia" | "episodio") =>
    new ErroPaginaInicial(
      tipo === "noticia"
        ? "Esta notícia não está no site. Só entra no destaque o que está publicado."
        : "Este episódio não está no site. Só entra no destaque o que está no ar.",
      "item",
    );
  for (const item of novosCarrossel) {
    const detalhe = site[chaveDoItem(item)];
    if (item.tipo !== "programa" && !detalhe?.noSite) throw naoEstaNoSite(item.tipo);
    if (!detalhe?.temCapa) throw new ErroPaginaInicial("Esta notícia não tem capa. O carrossel precisa de uma imagem.", "item");
    if (item.saiEm && item.saiEm.getTime() <= agora.getTime()) throw new ErroPaginaInicial("A saída já passou. Escolha uma data no futuro.", "saiEm");
  }
  for (const item of novosLista) {
    if (!site[chaveDoItem(item)]?.noSite) throw naoEstaNoSite("noticia");
  }
}

async function limites(): Promise<LimitesDaHome> {
  const [carrosselMaximo, listaPosicoes, fraseChamadaMaximo] = await Promise.all([
    lerParametro("home.carrossel_maximo"),
    lerParametro("home.lista_posicoes"),
    lerParametro("home.frase_chamada_maximo"),
  ]);
  return { carrosselMaximo, listaPosicoes, fraseChamadaMaximo };
}

const iguais = (a: DadosDaHome, b: DadosDaHome) => alteracoesNaoPublicadas(a, b) === 0;

function resumo(dados: DadosDaHome) {
  return {
    carrossel: dados.carrossel.map((i) => ({
      item: chaveDoItem(i),
      entra_em: i.entraEm?.toISOString() ?? null,
      sai_em: i.saiEm?.toISOString() ?? null,
      frase_chamada: i.fraseChamada,
    })),
    lista: dados.lista.map((p) => p?.noticiaId ?? "automatico"),
  };
}

async function registrar(
  tx: Transacao,
  quem: QuemDaEquipe | null,
  acao: string,
  alvo: { tipo: "pagina_inicial" | "destaque"; id: string; rotulo: string },
  detalhe: Record<string, unknown>,
) {
  await registrarAtividade(tx, {
    ator: quem ? { tipo: "pessoa", id: quem.id } : { tipo: "sistema" },
    acao,
    area: "pagina_inicial",
    alvo,
    detalhe,
  });
}

// --- Ações -------------------------------------------------------------------------------------

export type Salvo = { tipo: "salvo"; revisao: number; salvoEm: string };
export type Conflito = { tipo: "conflito" };

/**
 * Salvamento automático do rascunho (E62). Recusa se a revisão de quem enviou não é a atual
 * (outra pessoa salvou). Sem mudança, não grava nem sobe a revisão. Não vai para a Atividade.
 */
export async function salvarRascunho(pedido: { revisaoBase: number; dados: DadosDaHome }, deps: Deps): Promise<Salvo | Conflito> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const agora = deps.agora ?? new Date();
  const lim = await limites();
  conferirDados(pedido.dados, lim);
  const dados: DadosDaHome = { carrossel: pedido.dados.carrossel, lista: Array.from({ length: lim.listaPosicoes }, (_, i) => pedido.dados.lista[i] ?? null) };

  return banco().transaction(async (tx) => {
    const controle = await travarControle(tx);
    if (controle.revisao !== pedido.revisaoBase) return { tipo: "conflito" } as const;
    const linhas = await linhasDa(tx, "rascunho");
    const anterior = paraDados(linhas, lim.listaPosicoes);
    if (iguais(dados, anterior)) return { tipo: "salvo", revisao: controle.revisao, salvoEm: (controle.salvoEm ?? agora).toISOString() } as const;
    await conferirItensNovos(dados, anterior, agora);
    await gravarVersao(tx, "rascunho", dados, linhas, deps.quem.id);
    const revisao = controle.revisao + 1;
    await tx.update(paginaInicial).set({ revisao, salvoEm: agora, salvoPor: deps.quem.id }).where(eq(paginaInicial.id, "home"));
    return { tipo: "salvo", revisao, salvoEm: agora.toISOString() } as const;
  });
}

/**
 * “Publicar alterações” (E13, E62): copia o rascunho para o publicado, grava a Atividade e põe na
 * fila as viradas futuras do carrossel (T04), tudo na mesma transação.
 */
export async function publicarAlteracoes(pedido: { revisaoBase: number }, deps: DepsComFila): Promise<{ revisao: number; publicadoEm: string }> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const agora = deps.agora ?? new Date();
  const { listaPosicoes } = await limites();
  return banco().transaction(async (tx) => {
    const controle = await travarControle(tx);
    if (controle.revisao !== pedido.revisaoBase) throw new ErroPaginaInicial(CONFLITO);
    const [rascunho, publicado] = await Promise.all([linhasDa(tx, "rascunho"), linhasDa(tx, "publicado")]);
    const dadosRascunho = paraDados(rascunho, listaPosicoes);
    const dadosPublicado = paraDados(publicado, listaPosicoes);
    if (iguais(dadosRascunho, dadosPublicado)) throw new ErroPaginaInicial("Não há alterações para publicar.");
    await gravarVersao(tx, "publicado", dadosRascunho, rascunho, deps.quem.id);
    await tx.update(paginaInicial).set({ publicadoEm: agora, publicadoPor: deps.quem.id }).where(eq(paginaInicial.id, "home"));
    await registrar(tx, deps.quem, "pagina_inicial.publicar", { tipo: "pagina_inicial", id: "home", rotulo: "Página inicial" }, {
      antes: resumo(dadosPublicado),
      depois: resumo(dadosRascunho),
    });
    for (const item of dadosRascunho.carrossel) {
      const chave = chaveDoItem(item);
      if (item.entraEm && item.entraEm.getTime() > agora.getTime()) await deps.fila.agendarDestaque(tx, { chave, virada: "entrar", para: item.entraEm });
      if (item.saiEm && item.saiEm.getTime() > agora.getTime()) await deps.fila.agendarDestaque(tx, { chave, virada: "sair", para: item.saiEm });
    }
    return { revisao: controle.revisao, publicadoEm: agora.toISOString() };
  });
}

/** “Descartar alterações”: o rascunho volta a ser igual ao publicado (com confirmação e Atividade). */
export async function descartarAlteracoes(pedido: { revisaoBase: number }, deps: Deps): Promise<Salvo> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const agora = deps.agora ?? new Date();
  const { listaPosicoes } = await limites();
  return banco().transaction(async (tx) => {
    const controle = await travarControle(tx);
    if (controle.revisao !== pedido.revisaoBase) throw new ErroPaginaInicial(CONFLITO);
    const [rascunho, publicado] = await Promise.all([linhasDa(tx, "rascunho"), linhasDa(tx, "publicado")]);
    const dadosRascunho = paraDados(rascunho, listaPosicoes);
    const dadosPublicado = paraDados(publicado, listaPosicoes);
    if (iguais(dadosRascunho, dadosPublicado)) throw new ErroPaginaInicial("Não há alterações para descartar.");
    await gravarVersao(tx, "rascunho", dadosPublicado, publicado, deps.quem.id);
    const revisao = controle.revisao + 1;
    await tx.update(paginaInicial).set({ revisao, salvoEm: agora, salvoPor: deps.quem.id }).where(eq(paginaInicial.id, "home"));
    await registrar(tx, deps.quem, "pagina_inicial.descartar", { tipo: "pagina_inicial", id: "home", rotulo: "Página inicial" }, { descartado: resumo(dadosRascunho) });
    return { tipo: "salvo", revisao, salvoEm: agora.toISOString() };
  });
}

/**
 * “Tirar do ar agora” (E62): o item do carrossel que está no ar sai na hora. Grava só `sai_em = agora`,
 * no publicado e no rascunho (para a próxima publicação não trazer o item de volta), com a Atividade
 * na mesma transação. O agendado não tem esta opção: para ele, “Remover”.
 * - Vale sobre o rascunho que a pessoa vê: com a revisão velha (outra pessoa ou outra aba salvou
 *   depois), recusa sem mudar nada. A tela salva o que estiver pendente antes de pedir.
 * - O rótulo da Atividade é o título do item no servidor, nunca um texto vindo do navegador.
 */
export async function tirarDoArAgora(pedido: { chave: string; revisaoBase: number }, deps: Deps): Promise<Salvo> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const agora = deps.agora ?? new Date();
  return banco().transaction(async (tx) => {
    const controle = await travarControle(tx);
    if (controle.revisao !== pedido.revisaoBase) throw new ErroPaginaInicial(CONFLITO);
    const daChave = (l: Linha) => l.area === "carrossel" && l.itemTipo !== null && chaveDoItem({ tipo: l.itemTipo, itemId: l.itemId }) === pedido.chave;
    const [publicado] = (await linhasDa(tx, "publicado")).filter(daChave);
    if (!publicado || estadoDoItem(publicado, agora).tipo !== "no_ar") throw new ErroPaginaInicial("Este destaque não está no ar.");
    await tx.update(destaqueHome).set({ saiEm: agora }).where(eq(destaqueHome.id, publicado.id));
    const [rascunho] = (await linhasDa(tx, "rascunho")).filter(daChave);
    // No rascunho, só se a entrada já passou: `sai_em` não pode ficar antes de `entra_em`.
    if (rascunho && (!rascunho.entraEm || rascunho.entraEm.getTime() < agora.getTime())) {
      await tx.update(destaqueHome).set({ saiEm: agora }).where(eq(destaqueHome.id, rascunho.id));
    }
    const revisao = controle.revisao + 1;
    await tx.update(paginaInicial).set({ revisao, salvoEm: agora, salvoPor: deps.quem.id }).where(eq(paginaInicial.id, "home"));
    const item = { tipo: publicado.itemTipo!, itemId: publicado.itemId };
    const titulo = (await detalhesDosItens([item], agora))[chaveDoItem(item)]?.titulo ?? "Destaque da Home";
    await registrar(tx, deps.quem, "destaque.tirar_do_ar", { tipo: "destaque", id: publicado.id, rotulo: titulo.slice(0, 200) }, {
      item: pedido.chave,
      sai_em_antes: publicado.saiEm?.toISOString() ?? null,
    });
    return { tipo: "salvo", revisao, salvoEm: agora.toISOString() };
  });
}

// --- Leitura para o painel ---------------------------------------------------------------------

export type PainelDaHome = {
  revisao: number;
  salvoEm: string | null;
  rascunho: DadosDaHome;
  publicado: DadosDaHome;
  /** Detalhes de cada item citado no rascunho ou no publicado, pela chave. */
  itens: Record<string, DetalheDoItem>;
  /** Quem escolheu cada item do rascunho, pela chave na área (`chaveNaArea`). */
  escolhidoPor: Record<string, string>;
  limites: LimitesDaHome;
};

export async function lerPainel(deps: Deps): Promise<PainelDaHome> {
  exigir(deps.quem, "ver", RECURSO);
  const agora = deps.agora ?? new Date();
  const [lim, [controle], rascunho, publicado] = await Promise.all([
    limites(),
    banco().select().from(paginaInicial).where(eq(paginaInicial.id, "home")),
    linhasDa(banco(), "rascunho"),
    linhasDa(banco(), "publicado"),
  ]);
  const dadosRascunho = paraDados(rascunho, lim.listaPosicoes);
  const dadosPublicado = paraDados(publicado, lim.listaPosicoes);
  const todas = [...rascunho, ...publicado].filter((l) => l.itemTipo).map((l) => ({ tipo: l.itemTipo!, itemId: l.itemId }));
  const idsPessoas = [...new Set(rascunho.flatMap((l) => (l.escolhidoPor ? [l.escolhidoPor] : [])))];
  const [itens, pessoas] = await Promise.all([
    detalhesDosItens(todas, agora),
    idsPessoas.length ? banco().select({ id: pessoaEquipe.id, nome: pessoaEquipe.nome }).from(pessoaEquipe).where(inArray(pessoaEquipe.id, idsPessoas)) : [],
  ]);
  const nomes = new Map(pessoas.map((p) => [p.id, p.nome]));
  const escolhidoPor: Record<string, string> = {};
  for (const l of rascunho) {
    if (l.itemTipo && l.escolhidoPor && nomes.has(l.escolhidoPor)) {
      escolhidoPor[chaveNaArea(l.area, { tipo: l.itemTipo, itemId: l.itemId })] = nomes.get(l.escolhidoPor)!;
    }
  }
  return {
    revisao: controle?.revisao ?? 0,
    salvoEm: controle?.salvoEm?.toISOString() ?? null,
    rascunho: dadosRascunho,
    publicado: dadosPublicado,
    itens,
    escolhidoPor,
    limites: lim,
  };
}

