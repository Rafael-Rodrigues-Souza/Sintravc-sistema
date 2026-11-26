import { z } from "zod";

/**
 * Regras puras da Página inicial (E62): estado de um item pelas datas, o que o site mostra a partir
 * do publicado, e quantas alterações o rascunho tem em relação ao que está no ar.
 */

export type TipoDoItem = "noticia" | "episodio" | "programa";
export type AreaDoDestaque = "carrossel" | "lista";

/** A capa padrão do Rádio Chofer: a do slide do programa e a da rota de capas quando o YouTube falha (E61). */
export const CAPA_DO_PROGRAMA = "/site/radio/capa-padrao.jpg";

/** Os limites da Home, todos da Parametro (`home.*`). */
export type LimitesDaHome = { carrosselMaximo: number; listaPosicoes: number; fraseChamadaMaximo: number };

/** Um item do carrossel, como fica no rascunho e no publicado. */
export type ItemDoCarrossel = {
  tipo: TipoDoItem;
  /** Vazio só no programa. */
  itemId: string | null;
  entraEm: Date | null;
  saiEm: Date | null;
  /** Frase de chamada (E62, #75): escrita pela Comunicação; no site, no lugar da linha fina. */
  fraseChamada: string | null;
};

/** As posições da lista “Em destaque”: a notícia escolhida, ou `null` (automática). */
export type PosicaoDaLista = { noticiaId: string } | null;

export type DadosDaHome = { carrossel: ItemDoCarrossel[]; lista: PosicaoDaLista[] };

export class ErroPaginaInicial extends Error {
  constructor(
    mensagem: string,
    readonly campo?: string,
  ) {
    super(mensagem);
    this.name = "ErroPaginaInicial";
  }
}

/** A identidade do item, igual no rascunho e no publicado (o id da linha muda a cada publicação). */
export function chaveDoItem(item: Pick<ItemDoCarrossel, "tipo" | "itemId">): string {
  return `${item.tipo}:${item.itemId ?? "programa"}`;
}

/** O item numa área (“lista:noticia:<id>”): a mesma notícia pode estar no carrossel e na lista, escolhida por pessoas diferentes. */
export function chaveNaArea(area: AreaDoDestaque, item: Pick<ItemDoCarrossel, "tipo" | "itemId">): string {
  return `${area}:${chaveDoItem(item)}`;
}

export type EstadoDoItem =
  | { tipo: "no_ar"; saiEm: Date | null }
  | { tipo: "agendado"; entraEm: Date }
  | { tipo: "saiu"; saiEm: Date };

/** O site segue o relógio: o item aparece com `entra_em ≤ agora < sai_em` (vazios = sem limite). */
export function estadoDoItem(item: Pick<ItemDoCarrossel, "entraEm" | "saiEm">, agora: Date): EstadoDoItem {
  if (item.saiEm && item.saiEm.getTime() <= agora.getTime()) return { tipo: "saiu", saiEm: item.saiEm };
  if (item.entraEm && item.entraEm.getTime() > agora.getTime()) return { tipo: "agendado", entraEm: item.entraEm };
  return { tipo: "no_ar", saiEm: item.saiEm };
}

const mesmaData = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

function mesmoItem(a: ItemDoCarrossel | undefined, b: ItemDoCarrossel | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    chaveDoItem(a) === chaveDoItem(b) &&
    mesmaData(a.entraEm, b.entraEm) &&
    mesmaData(a.saiEm, b.saiEm) &&
    (a.fraseChamada ?? null) === (b.fraseChamada ?? null)
  );
}

const mesmaPosicao = (a: PosicaoDaLista | undefined, b: PosicaoDaLista | undefined) => (a?.noticiaId ?? null) === (b?.noticiaId ?? null);

/**
 * Quantas posições do rascunho diferem do publicado (no carrossel e na lista). Compara o conteúdo,
 * e não o número de gravações: mudar e desfazer não deixa alteração (como o E47).
 */
export function alteracoesNaoPublicadas(rascunho: DadosDaHome, publicado: DadosDaHome): number {
  let total = 0;
  const nCarrossel = Math.max(rascunho.carrossel.length, publicado.carrossel.length);
  for (let i = 0; i < nCarrossel; i++) if (!mesmoItem(rascunho.carrossel[i], publicado.carrossel[i])) total++;
  const nLista = Math.max(rascunho.lista.length, publicado.lista.length);
  for (let i = 0; i < nLista; i++) if (!mesmaPosicao(rascunho.lista[i], publicado.lista[i])) total++;
  return total;
}

/**
 * Confere o rascunho que chegou do painel, sem banco: limites, repetidos, datas e a frase de chamada.
 * Os limites vêm da Parametro (`home.carrossel_maximo`, `home.lista_posicoes` e
 * `home.frase_chamada_maximo`). Lança ErroPaginaInicial.
 */
export function conferirDados(dados: DadosDaHome, limites: LimitesDaHome) {
  if (dados.carrossel.length > limites.carrosselMaximo) {
    throw new ErroPaginaInicial(`O carrossel aceita até ${limites.carrosselMaximo} destaques. Remova um para pôr outro.`, "carrossel");
  }
  if (dados.lista.length > limites.listaPosicoes) {
    throw new ErroPaginaInicial(`A lista “Em destaque” tem ${limites.listaPosicoes} posições.`, "lista");
  }
  const chaves = dados.carrossel.map(chaveDoItem);
  if (new Set(chaves).size !== chaves.length) throw new ErroPaginaInicial("Este destaque já está no carrossel.", "carrossel");
  const escolhidas = dados.lista.flatMap((p) => (p ? [p.noticiaId] : []));
  if (new Set(escolhidas).size !== escolhidas.length) throw new ErroPaginaInicial("Esta notícia já está na lista.", "lista");
  for (const item of dados.carrossel) {
    if ((item.tipo === "programa") !== (item.itemId === null)) throw new ErroPaginaInicial("Destaque inválido.", "carrossel");
    if (item.entraEm && item.saiEm && item.saiEm.getTime() <= item.entraEm.getTime()) {
      throw new ErroPaginaInicial("A saída tem de ser depois da entrada.", "saiEm");
    }
    if (item.fraseChamada && item.fraseChamada.length > limites.fraseChamadaMaximo) {
      throw new ErroPaginaInicial(`A frase de chamada tem até ${limites.fraseChamadaMaximo} caracteres.`, "fraseChamada");
    }
  }
}

// --- O que o site mostra -----------------------------------------------------------------------

/** `frase`: a frase de chamada do item, quando houver (no site, no lugar da linha fina). */
export type Slide<N, E> = ({ tipo: "noticia"; noticia: N } | { tipo: "episodio"; episodio: E } | { tipo: "programa" }) & { frase: string | null };

/**
 * Monta o carrossel e a lista a partir do publicado (E62):
 * - o carrossel mostra, na ordem, os itens no ar pelo relógio cujo conteúdo ainda está no site
 *   (a notícia precisa de capa); sem nenhum, o slide do programa;
 * - cada posição da lista mostra a escolhida, se ainda estiver no site; as outras pegam as mais
 *   recentes que não estão nas escolhidas nem no carrossel.
 */
export function montarHome<N extends { id: string; capa: unknown }, E extends { id: string }>(entrada: {
  publicado: DadosDaHome;
  noticias: Map<string, N>;
  episodios: Map<string, E>;
  /** As mais recentes no ar, da mais nova à mais antiga (o bastante para completar a lista). */
  recentes: N[];
  listaPosicoes: number;
  agora: Date;
}): { slides: Slide<N, E>[]; lista: N[] } {
  const { publicado, noticias, episodios, agora } = entrada;
  const slides: Slide<N, E>[] = [];
  for (const item of publicado.carrossel) {
    if (estadoDoItem(item, agora).tipo !== "no_ar") continue;
    const frase = item.fraseChamada ?? null;
    if (item.tipo === "programa") slides.push({ tipo: "programa", frase });
    else if (item.tipo === "noticia") {
      const noticia = noticias.get(item.itemId!);
      if (noticia?.capa) slides.push({ tipo: "noticia", noticia, frase });
    } else {
      const episodio = episodios.get(item.itemId!);
      if (episodio) slides.push({ tipo: "episodio", episodio, frase });
    }
  }
  if (slides.length === 0) slides.push({ tipo: "programa", frase: null });

  const escolhidas = Array.from({ length: entrada.listaPosicoes }, (_, i) => {
    const posicao = publicado.lista[i];
    return posicao ? (noticias.get(posicao.noticiaId) ?? null) : null;
  });
  const usadas = new Set<string>([
    ...escolhidas.flatMap((n) => (n ? [n.id] : [])),
    ...slides.flatMap((s) => (s.tipo === "noticia" ? [s.noticia.id] : [])),
  ]);
  const automaticas = entrada.recentes.filter((n) => !usadas.has(n.id));
  const lista: N[] = [];
  for (const escolhida of escolhidas) {
    const noticia = escolhida ?? automaticas.shift();
    if (noticia) lista.push(noticia);
  }
  return { slides, lista };
}

// --- O pedido que vem do painel ----------------------------------------------------------------

const dataOuVazio = z.iso
  .datetime({ offset: true })
  .nullable()
  .transform((v) => (v ? new Date(v) : null));

export const esquemaDadosDaHome = z.object({
  carrossel: z
    .array(
      z.object({
        tipo: z.enum(["noticia", "episodio", "programa"]),
        itemId: z.uuid().nullable(),
        entraEm: dataOuVazio,
        saiEm: dataOuVazio,
        // Espaços nas pontas saem; vazia vira null. O limite é conferido com a Parametro (conferirDados).
        fraseChamada: z
          .string()
          .max(1000)
          .nullish()
          .transform((v) => v?.trim().replace(/\s+/g, " ") || null),
      }),
    )
    .max(50),
  lista: z.array(z.object({ noticiaId: z.uuid() }).nullable()).max(50),
});

/** Como o painel guarda o rascunho no navegador e envia ao servidor: as datas em ISO. */
export type DadosDaHomeNoNavegador = z.input<typeof esquemaDadosDaHome>;

export function paraONavegador(dados: DadosDaHome): DadosDaHomeNoNavegador {
  return {
    carrossel: dados.carrossel.map((i) => ({ ...i, entraEm: i.entraEm?.toISOString() ?? null, saiEm: i.saiEm?.toISOString() ?? null })),
    lista: dados.lista,
  };
}
