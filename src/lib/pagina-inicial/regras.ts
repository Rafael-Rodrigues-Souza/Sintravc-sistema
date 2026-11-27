import { z } from "zod";

import { LINKS } from "@/components/site/navegacao";

/**
 * Regras puras da Página inicial (E62, E63): estado de um item pelas datas, o que o site mostra a
 * partir do publicado, e quantas alterações o rascunho tem em relação ao que está no ar. A lista
 * “Em destaque” saiu do site e do painel (E63): a Home tem só o carrossel.
 */

export type TipoDoItem = "noticia" | "episodio" | "programa" | "chamada";

/** Para onde vai o botão da Chamada (E63): lista fechada. A #19 acrescenta o benefício ou parceiro. */
export const DESTINOS_DA_CHAMADA = ["filie_se", "beneficios"] as const;
export type DestinoDaChamada = (typeof DESTINOS_DA_CHAMADA)[number];

/**
 * Tudo de cada destino num lugar só (E63): o nome na janela do painel, o nome curto no rótulo da
 * lista (“Chamada · Filie-se”), o texto padrão do botão (a Comunicação pode trocar) e o endereço. O
 * Filie-se vai ao mesmo WhatsApp da filiação do “Filiar-se” do topo, em outra aba.
 */
export const DESTINOS: Record<
  DestinoDaChamada,
  { nome: string; nomeCurto: string; botaoPadrao: string; externo: boolean; endereco: (contexto: { linkFiliacao: string }) => string }
> = {
  filie_se: { nome: "Filie-se (WhatsApp da filiação)", nomeCurto: "Filie-se", botaoPadrao: "Filie-se", externo: true, endereco: ({ linkFiliacao }) => linkFiliacao },
  beneficios: { nome: "Benefícios", nomeCurto: "Benefícios", botaoPadrao: "Ver benefícios", externo: false, endereco: () => LINKS.beneficios.href },
};

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
  return chamada.botaoTexto ?? DESTINOS[chamada.destino].botaoPadrao;
}

/** O rótulo da Chamada na lista do painel (“Chamada · Filie-se”). */
export const rotuloDaChamada = (destino: DestinoDaChamada) => `Chamada · ${DESTINOS[destino].nomeCurto}`;

/** Os limites que valem para a Chamada (da Parametro). */
export type LimitesDaChamada = Pick<LimitesDaHome, "chamadaFraseMaximo" | "chamadaApoioMaximo" | "chamadaBotaoMaximo">;

/** A Chamada como a janela do painel tem antes de salvar: a foto pode faltar. */
export type ChamadaParaConferir = { frase: string | null; fotoMidiaId: string | null } & Omit<DadosDaChamada, "fotoMidiaId">;

/**
 * As regras da Chamada (E63), num lugar só: a janela do painel mostra o erro no campo, e o servidor
 * recusa com a mesma mensagem (`conferirDados`). Devolve o primeiro problema, na ordem dos campos da
 * janela, ou null. Os textos já chegam limpos (sem espaços sobrando).
 */
export function erroDaChamada(c: ChamadaParaConferir, limites: LimitesDaChamada): { campo: string; mensagem: string } | null {
  if (!c.fotoMidiaId) return { campo: "foto", mensagem: "Escolha a foto da Chamada." };
  if (!c.fotoAlt.trim()) return { campo: "fotoAlt", mensagem: "Descreva a foto no texto alternativo." };
  if (!c.frase?.trim()) return { campo: "fraseChamada", mensagem: "Escreva a frase da Chamada." };
  if (c.frase.length > limites.chamadaFraseMaximo) {
    return { campo: "fraseChamada", mensagem: `A frase da Chamada tem até ${limites.chamadaFraseMaximo} caracteres.` };
  }
  if (!c.textoApoio.trim()) return { campo: "textoApoio", mensagem: "Escreva o texto de apoio." };
  if (c.textoApoio.length > limites.chamadaApoioMaximo) {
    return { campo: "textoApoio", mensagem: `O texto de apoio tem até ${limites.chamadaApoioMaximo} caracteres.` };
  }
  if (c.botaoTexto && c.botaoTexto.length > limites.chamadaBotaoMaximo) {
    return { campo: "botaoTexto", mensagem: `O texto do botão tem até ${limites.chamadaBotaoMaximo} caracteres.` };
  }
  if (!DESTINOS_DA_CHAMADA.includes(c.destino)) return { campo: "destino", mensagem: "Escolha para onde vai o botão." };
  return null;
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
    if (ehChamada) {
      const erro = erroDaChamada({ frase: item.fraseChamada, ...item.chamada! }, limites);
      if (erro) throw new ErroPaginaInicial(erro.mensagem, erro.campo);
    } else if (item.fraseChamada && item.fraseChamada.length > limites.fraseChamadaMaximo) {
      throw new ErroPaginaInicial(`A frase de chamada tem até ${limites.fraseChamadaMaximo} caracteres.`, "fraseChamada");
    }
  }
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
