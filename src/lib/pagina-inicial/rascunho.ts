import { and, asc, eq, inArray } from "drizzle-orm";

import { registrarAtividade } from "@/lib/atividade";
import { banco, type Transacao } from "@/lib/db";
import { destaqueHome, midia, midiaUso, paginaInicial, pessoaEquipe } from "@/lib/db/schema";
import { lerParametro } from "@/lib/parametros";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";

import { detalhesDosItens, type DetalheDoItem } from "./itens";
import {
  alteracoesNaoPublicadas,
  chaveDoItem,
  conferirDados,
  ErroPaginaInicial,
  estadoDoItem,
  type DadosDaHome,
  type ItemDoCarrossel,
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
  return db.select().from(destaqueHome).where(eq(destaqueHome.versao, versao)).orderBy(asc(destaqueHome.posicao));
}

export function itemDaLinha(l: Linha): ItemDoCarrossel {
  return {
    tipo: l.itemTipo,
    itemId: l.itemId,
    entraEm: l.entraEm,
    saiEm: l.saiEm,
    fraseChamada: l.fraseChamada,
    chamada:
      l.itemTipo === "chamada"
        ? { fotoMidiaId: l.fotoMidiaId!, fotoAlt: l.fotoAlt ?? "", textoApoio: l.textoApoio ?? "", botaoTexto: l.botaoTexto, destino: l.destino! }
        : null,
  };
}

/** A chave do item de uma linha (igual no rascunho e no publicado). */
export const chaveDaLinha = (l: Linha) => chaveDoItem(itemDaLinha(l));

function paraDados(linhas: Linha[]): DadosDaHome {
  return { carrossel: linhas.map(itemDaLinha) };
}

/** O publicado da Home, para o site e para a T04. */
export async function lerDadosDaHome(versao: Versao = "publicado"): Promise<DadosDaHome> {
  return paraDados(await linhasDa(banco(), versao));
}

async function travarControle(tx: Transacao) {
  const [controle] = await tx.select().from(paginaInicial).where(eq(paginaInicial.id, "home")).for("update");
  if (!controle) throw new Error('Controle da página inicial não encontrado (registro "home"). Rode as migrações.');
  return controle;
}

/**
 * Grava `dados` como a versão inteira. Quem escolheu cada item vem de `anteriores` (pela chave); o
 * que é novo fica com `quem`. Depois, refaz o MidiaUso das fotos das Chamadas.
 */
async function gravarVersao(tx: Transacao, versao: Versao, dados: DadosDaHome, anteriores: Linha[], quem: string | null) {
  await tx.delete(destaqueHome).where(eq(destaqueHome.versao, versao));
  const quemEscolheu = (chave: string) => anteriores.find((l) => chaveDaLinha(l) === chave)?.escolhidoPor ?? quem;
  const linhas = dados.carrossel.map((item, i) => ({
    versao,
    posicao: i + 1,
    itemTipo: item.tipo,
    itemId: item.itemId,
    entraEm: item.entraEm,
    saiEm: item.saiEm,
    fraseChamada: item.fraseChamada,
    fotoMidiaId: item.chamada?.fotoMidiaId ?? null,
    fotoAlt: item.chamada?.fotoAlt ?? null,
    textoApoio: item.chamada?.textoApoio ?? null,
    botaoTexto: item.chamada?.botaoTexto ?? null,
    destino: item.chamada?.destino ?? null,
    escolhidoPor: quemEscolheu(chaveDoItem(item)),
  }));
  if (linhas.length) await tx.insert(destaqueHome).values(linhas);
  await gravarUsosDasFotos(tx);
}

/**
 * MidiaUso das fotos das Chamadas (RN16, E63): `dono_tipo = 'destaque'` e `dono_id` = o id da
 * Chamada, para cada foto usada no rascunho ou no publicado. Enquanto estiver em uma das duas, a foto
 * não pode ser excluída da Mídia, e o “Usado em” mostra a Página inicial.
 */
async function gravarUsosDasFotos(tx: Transacao) {
  await tx.delete(midiaUso).where(eq(midiaUso.donoTipo, "destaque"));
  const fotos = await tx
    .selectDistinct({ midiaId: destaqueHome.fotoMidiaId, donoId: destaqueHome.itemId })
    .from(destaqueHome)
    .where(eq(destaqueHome.itemTipo, "chamada"));
  const valores = fotos.flatMap((f) => (f.midiaId && f.donoId ? [{ midiaId: f.midiaId, donoTipo: "destaque", donoId: f.donoId }] : []));
  if (valores.length) await tx.insert(midiaUso).values(valores);
}

/**
 * Só entra o que está no ar (E62): notícia publicada com capa e episódio no ar. O que já estava no
 * rascunho pode ficar, mesmo que tenha saído do ar depois: o painel marca e o site pula. A foto de
 * cada Chamada (nova ou trocada) tem de ser uma imagem da Mídia (E63).
 */
async function conferirItensNovos(tx: Transacao, dados: DadosDaHome, anterior: DadosDaHome, agora: Date) {
  const jaNoCarrossel = new Set(anterior.carrossel.map(chaveDoItem));
  const novosCarrossel = dados.carrossel.filter((i) => !jaNoCarrossel.has(chaveDoItem(i)) && i.tipo !== "chamada");
  const fotosAntes = new Set(anterior.carrossel.flatMap((i) => (i.chamada ? [i.chamada.fotoMidiaId] : [])));
  const fotosNovas = [...new Set(dados.carrossel.flatMap((i) => (i.chamada && !fotosAntes.has(i.chamada.fotoMidiaId) ? [i.chamada.fotoMidiaId] : [])))];
  if (fotosNovas.length) {
    const imagens = await tx.select({ id: midia.id }).from(midia).where(and(inArray(midia.id, fotosNovas), eq(midia.tipo, "imagem")));
    if (imagens.length !== fotosNovas.length) throw new ErroPaginaInicial("A foto da Chamada tem de ser uma imagem da Mídia.", "foto");
  }
  const site = await detalhesDosItens(novosCarrossel, agora);
  const naoEstaNoSite = (tipo: "noticia" | "episodio") =>
    new ErroPaginaInicial(
      tipo === "noticia"
        ? "Esta notícia não está no site. Só entra no destaque o que está publicado."
        : "Este episódio não está no site. Só entra no destaque o que está no ar.",
      "item",
    );
  for (const item of novosCarrossel) {
    const detalhe = site[chaveDoItem(item)];
    if ((item.tipo === "noticia" || item.tipo === "episodio") && !detalhe?.noSite) throw naoEstaNoSite(item.tipo);
    if (!detalhe?.temCapa) throw new ErroPaginaInicial("Esta notícia não tem capa. O carrossel precisa de uma imagem.", "item");
  }
  for (const item of dados.carrossel) {
    if (jaNoCarrossel.has(chaveDoItem(item))) continue;
    if (item.saiEm && item.saiEm.getTime() <= agora.getTime()) throw new ErroPaginaInicial("A saída já passou. Escolha uma data no futuro.", "saiEm");
  }
}

async function limites(): Promise<LimitesDaHome> {
  const [carrosselMaximo, fraseChamadaMaximo, chamadaFraseMaximo, chamadaApoioMaximo, chamadaBotaoMaximo] = await Promise.all([
    lerParametro("home.carrossel_maximo"),
    lerParametro("home.frase_chamada_maximo"),
    lerParametro("home.chamada_frase_maximo"),
    lerParametro("home.chamada_apoio_maximo"),
    lerParametro("home.chamada_botao_maximo"),
  ]);
  return { carrosselMaximo, fraseChamadaMaximo, chamadaFraseMaximo, chamadaApoioMaximo, chamadaBotaoMaximo };
}

const iguais = (a: DadosDaHome, b: DadosDaHome) => alteracoesNaoPublicadas(a, b) === 0;

function resumo(dados: DadosDaHome) {
  return {
    carrossel: dados.carrossel.map((i) => ({
      item: chaveDoItem(i),
      entra_em: i.entraEm?.toISOString() ?? null,
      sai_em: i.saiEm?.toISOString() ?? null,
      frase_chamada: i.fraseChamada,
      ...(i.chamada
        ? { foto_midia_id: i.chamada.fotoMidiaId, foto_alt: i.chamada.fotoAlt, texto_apoio: i.chamada.textoApoio, botao_texto: i.chamada.botaoTexto, destino: i.chamada.destino }
        : {}),
    })),
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
  conferirDados(pedido.dados, await limites());
  const dados: DadosDaHome = { carrossel: pedido.dados.carrossel };

  return banco().transaction(async (tx) => {
    const controle = await travarControle(tx);
    if (controle.revisao !== pedido.revisaoBase) return { tipo: "conflito" } as const;
    const linhas = await linhasDa(tx, "rascunho");
    const anterior = paraDados(linhas);
    if (iguais(dados, anterior)) return { tipo: "salvo", revisao: controle.revisao, salvoEm: (controle.salvoEm ?? agora).toISOString() } as const;
    await conferirItensNovos(tx, dados, anterior, agora);
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
  return banco().transaction(async (tx) => {
    const controle = await travarControle(tx);
    if (controle.revisao !== pedido.revisaoBase) throw new ErroPaginaInicial(CONFLITO);
    const [rascunho, publicado] = await Promise.all([linhasDa(tx, "rascunho"), linhasDa(tx, "publicado")]);
    const dadosRascunho = paraDados(rascunho);
    const dadosPublicado = paraDados(publicado);
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
  return banco().transaction(async (tx) => {
    const controle = await travarControle(tx);
    if (controle.revisao !== pedido.revisaoBase) throw new ErroPaginaInicial(CONFLITO);
    const [rascunho, publicado] = await Promise.all([linhasDa(tx, "rascunho"), linhasDa(tx, "publicado")]);
    const dadosRascunho = paraDados(rascunho);
    const dadosPublicado = paraDados(publicado);
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
    const daChave = (l: Linha) => chaveDaLinha(l) === pedido.chave;
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
    const item = itemDaLinha(publicado);
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
  /** Quem escolheu cada item do rascunho, pela chave. */
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
  const dadosRascunho = paraDados(rascunho);
  const dadosPublicado = paraDados(publicado);
  const todas = [...dadosPublicado.carrossel, ...dadosRascunho.carrossel];
  const idsPessoas = [...new Set(rascunho.flatMap((l) => (l.escolhidoPor ? [l.escolhidoPor] : [])))];
  const [itens, pessoas] = await Promise.all([
    detalhesDosItens(todas, agora),
    idsPessoas.length ? banco().select({ id: pessoaEquipe.id, nome: pessoaEquipe.nome }).from(pessoaEquipe).where(inArray(pessoaEquipe.id, idsPessoas)) : [],
  ]);
  const nomes = new Map(pessoas.map((p) => [p.id, p.nome]));
  const escolhidoPor: Record<string, string> = {};
  for (const l of rascunho) {
    if (l.escolhidoPor && nomes.has(l.escolhidoPor)) escolhidoPor[chaveDaLinha(l)] = nomes.get(l.escolhidoPor)!;
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

