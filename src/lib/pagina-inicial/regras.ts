import { z } from "zod";

/**
 * Regras puras da Página inicial (E62, E63): estado de um item pelas datas, o que o site mostra a
 * partir do publicado, e quantas alterações o rascunho tem em relação ao que está no ar. A lista
 * “Em destaque” saiu do site e do painel (E63): a Home tem só o carrossel.
 */

export type TipoDoItem = "noticia" | "episodio" | "programa" | "chamada";

/** Para onde vai o botão da Chamada (E63): lista fechada. A #19 acrescenta o benefício ou parceiro. */
export const DESTINOS_DA_CHAMADA = ["filie_se", "beneficios"] as const;
export type DestinoDaChamada = (typeof DESTINOS_DA_CHAMADA)[number];

/** O texto padrão do botão de cada destino (E63): a Comunicação pode trocar. */
export const BOTAO_PADRAO: Record<DestinoDaChamada, string> = { filie_se: "Filie-se", beneficios: "Ver benefícios" };

/** O nome do destino no painel. */
export const NOME_DO_DESTINO: Record<DestinoDaChamada, string> = { filie_se: "Filie-se (WhatsApp da filiação)", beneficios: "Benefícios" };

/** Os campos próprios da Chamada (E63). A frase fica em `fraseChamada`, como nos outros itens. */
export type DadosDaChamada = {
  fotoMidiaId: string;
  fotoAlt: string;
  textoApoio: string;
  /** Vazio: o padrão do destino (`BOTAO_PADRAO`). */
  botaoTexto: string | null;
  destino: DestinoDaChamada;
};

export function textoDoBotao(chamada: Pick<DadosDaChamada, "botaoTexto" | "destino">): string {
  return chamada.botaoTexto ?? BOTAO_PADRAO[chamada.destino];
}

/** A capa padrão do Rádio Chofer: a do slide do programa e a da rota de capas quando o YouTube falha (E61). */
export const CAPA_DO_PROGRAMA = "/site/radio/capa-padrao.jpg";

/** Os limites da Home, todos da Parametro (`home.*`). */
export type LimitesDaHome = {
  carrosselMaximo: number;
  fraseChamadaMaximo: number;
  chamadaFraseMaximo: number;
  chamadaApoioMaximo: number;
  chamadaBotaoMaximo: number;
};

/** Um item do carrossel, como fica no rascunho e no publicado. */
export type ItemDoCarrossel = {
  tipo: TipoDoItem;
  /** Vazio só no programa. Na Chamada, um uuid gerado no painel. */
  itemId: string | null;
  entraEm: Date | null;
  saiEm: Date | null;
  /**
   * Frase de chamada (E62, #75): escrita pela Comunicação. Na notícia, no episódio e no programa,
   * opcional e no lugar da linha fina; na Chamada, obrigatória: é o texto grande do slide.
   */
  fraseChamada: string | null;
  /** Só na Chamada (E63). */
  chamada: DadosDaChamada | null;
};

export type DadosDaHome = { carrossel: ItemDoCarrossel[] };

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

const mesmaChamada = (a: DadosDaChamada | null, b: DadosDaChamada | null) =>
  a === null || b === null
    ? a === b
    : a.fotoMidiaId === b.fotoMidiaId && a.fotoAlt === b.fotoAlt && a.textoApoio === b.textoApoio && a.botaoTexto === b.botaoTexto && a.destino === b.destino;

function mesmoItem(a: ItemDoCarrossel | undefined, b: ItemDoCarrossel | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    chaveDoItem(a) === chaveDoItem(b) &&
    mesmaData(a.entraEm, b.entraEm) &&
    mesmaData(a.saiEm, b.saiEm) &&
    (a.fraseChamada ?? null) === (b.fraseChamada ?? null) &&
    mesmaChamada(a.chamada ?? null, b.chamada ?? null)
  );
}

/**
 * Quantas posições do carrossel do rascunho diferem do publicado. Compara o conteúdo, e não o
 * número de gravações: mudar e desfazer não deixa alteração (como o E47).
 */
export function alteracoesNaoPublicadas(rascunho: DadosDaHome, publicado: DadosDaHome): number {
  let total = 0;
  const n = Math.max(rascunho.carrossel.length, publicado.carrossel.length);
  for (let i = 0; i < n; i++) if (!mesmoItem(rascunho.carrossel[i], publicado.carrossel[i])) total++;
  return total;
}

/**
 * Confere o rascunho que chegou do painel, sem banco: limites, repetidos, datas, a frase de chamada
 * e os campos da Chamada. Os limites vêm da Parametro (`home.carrossel_maximo`,
 * `home.frase_chamada_maximo` e `home.chamada_*`). Lança ErroPaginaInicial.
 */
export function conferirDados(dados: DadosDaHome, limites: LimitesDaHome) {
  if (dados.carrossel.length > limites.carrosselMaximo) {
    throw new ErroPaginaInicial(`O carrossel aceita até ${limites.carrosselMaximo} destaques. Remova um para pôr outro.`, "carrossel");
  }
  const chaves = dados.carrossel.map(chaveDoItem);
  if (new Set(chaves).size !== chaves.length) throw new ErroPaginaInicial("Este destaque já está no carrossel.", "carrossel");
  for (const item of dados.carrossel) {
    const ehChamada = item.tipo === "chamada";
    if ((item.tipo === "programa") !== (item.itemId === null) || ehChamada !== (item.chamada !== null && item.chamada !== undefined)) {
      throw new ErroPaginaInicial("Destaque inválido.", "carrossel");
    }
    if (item.entraEm && item.saiEm && item.saiEm.getTime() <= item.entraEm.getTime()) {
      throw new ErroPaginaInicial("A saída tem de ser depois da entrada.", "saiEm");
    }
    if (ehChamada) conferirChamada(item.fraseChamada, item.chamada!, limites);
    else if (item.fraseChamada && item.fraseChamada.length > limites.fraseChamadaMaximo) {
      throw new ErroPaginaInicial(`A frase de chamada tem até ${limites.fraseChamadaMaximo} caracteres.`, "fraseChamada");
    }
  }
}

function conferirChamada(frase: string | null, c: DadosDaChamada, limites: LimitesDaHome) {
  if (!frase?.trim()) throw new ErroPaginaInicial("Escreva a frase da Chamada.", "fraseChamada");
  if (frase.length > limites.chamadaFraseMaximo) {
    throw new ErroPaginaInicial(`A frase da Chamada tem até ${limites.chamadaFraseMaximo} caracteres.`, "fraseChamada");
  }
  if (!c.textoApoio.trim()) throw new ErroPaginaInicial("Escreva o texto de apoio.", "textoApoio");
  if (c.textoApoio.length > limites.chamadaApoioMaximo) {
    throw new ErroPaginaInicial(`O texto de apoio tem até ${limites.chamadaApoioMaximo} caracteres.`, "textoApoio");
  }
  if (c.botaoTexto && c.botaoTexto.length > limites.chamadaBotaoMaximo) {
    throw new ErroPaginaInicial(`O texto do botão tem até ${limites.chamadaBotaoMaximo} caracteres.`, "botaoTexto");
  }
  if (!c.fotoAlt.trim()) throw new ErroPaginaInicial("Descreva a foto no texto alternativo.", "fotoAlt");
  if (!DESTINOS_DA_CHAMADA.includes(c.destino)) throw new ErroPaginaInicial("Escolha para onde vai o botão.", "destino");
}

// --- O que o site mostra -----------------------------------------------------------------------

/** A Chamada como o site recebe: os campos e o id (para a chave do slide). */
export type ChamadaDoSlide = DadosDaChamada & { itemId: string };

/** `frase`: a frase de chamada do item, quando houver (no site, no lugar da linha fina; na Chamada, o texto grande). */
export type Slide<N, E> = (
  | { tipo: "noticia"; noticia: N }
  | { tipo: "episodio"; episodio: E }
  | { tipo: "programa" }
  | { tipo: "chamada"; chamada: ChamadaDoSlide }
) & { frase: string | null };

/**
 * Monta o carrossel a partir do publicado (E62, E63): mostra, na ordem, os itens no ar pelo relógio
 * cujo conteúdo ainda está no site (a notícia precisa de capa; a Chamada é sempre do site); sem
 * nenhum, o slide do programa.
 */
export function montarHome<N extends { id: string; capa: unknown }, E extends { id: string }>(entrada: {
  publicado: DadosDaHome;
  noticias: Map<string, N>;
  episodios: Map<string, E>;
  agora: Date;
}): { slides: Slide<N, E>[] } {
  const { publicado, noticias, episodios, agora } = entrada;
  const slides: Slide<N, E>[] = [];
  for (const item of publicado.carrossel) {
    if (estadoDoItem(item, agora).tipo !== "no_ar") continue;
    const frase = item.fraseChamada ?? null;
    if (item.tipo === "programa") slides.push({ tipo: "programa", frase });
    else if (item.tipo === "chamada") {
      if (item.chamada) slides.push({ tipo: "chamada", frase, chamada: { itemId: item.itemId!, ...item.chamada } });
    } else if (item.tipo === "noticia") {
      const noticia = noticias.get(item.itemId!);
      if (noticia?.capa) slides.push({ tipo: "noticia", noticia, frase });
    } else {
      const episodio = episodios.get(item.itemId!);
      if (episodio) slides.push({ tipo: "episodio", episodio, frase });
    }
  }
  if (slides.length === 0) slides.push({ tipo: "programa", frase: null });
  return { slides };
}

// --- O pedido que vem do painel ----------------------------------------------------------------

/** Espaços nas pontas e repetidos saem; vazio vira null. */
const textoLimpo = z
  .string()
  .max(1000)
  .nullish()
  .transform((v) => v?.trim().replace(/\s+/g, " ") || null);

const dataOuVazio = z.iso
  .datetime({ offset: true })
  .nullable()
  .transform((v) => (v ? new Date(v) : null));

export const esquemaDadosDaHome = z.object({
  carrossel: z
    .array(
      z.object({
        tipo: z.enum(["noticia", "episodio", "programa", "chamada"]),
        itemId: z.uuid().nullable(),
        entraEm: dataOuVazio,
        saiEm: dataOuVazio,
        // Os limites são conferidos com a Parametro (conferirDados).
        fraseChamada: textoLimpo,
        chamada: z
          .object({
            fotoMidiaId: z.uuid(),
            fotoAlt: textoLimpo.transform((v) => v ?? ""),
            textoApoio: textoLimpo.transform((v) => v ?? ""),
            botaoTexto: textoLimpo,
            destino: z.enum(DESTINOS_DA_CHAMADA),
          })
          .nullish()
          .transform((v) => v ?? null),
      }),
    )
    .max(50),
});

/** Como o painel guarda o rascunho no navegador e envia ao servidor: as datas em ISO. */
export type DadosDaHomeNoNavegador = z.input<typeof esquemaDadosDaHome>;

export function paraONavegador(dados: DadosDaHome): DadosDaHomeNoNavegador {
  return {
    carrossel: dados.carrossel.map((i) => ({ ...i, entraEm: i.entraEm?.toISOString() ?? null, saiEm: i.saiEm?.toISOString() ?? null })),
  };
}
