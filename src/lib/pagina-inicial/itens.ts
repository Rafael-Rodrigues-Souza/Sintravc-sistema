import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { urlPublica } from "@/lib/armazenamento";
import { HOME_PAGINA } from "@/conteudo/site";
import { banco } from "@/lib/db";
import { conteudo, conteudoVersao, episodio, midia } from "@/lib/db/schema";
import { enderecoDaCapa } from "@/lib/episodios/capa";
import { filtroNoAr as episodioNoAr } from "@/lib/episodios/comum";
import { lerEnvArmazenamento } from "@/lib/env";
import { noAr as noticiaNoAr } from "@/lib/noticias-do-site/consultas";

import { CAPA_DO_PROGRAMA, chaveDoItem, NOME_DO_DESTINO, type ItemDoCarrossel, type TipoDoItem } from "./regras";

/**
 * Os itens que a Página inicial mostra no painel (E62, E63): a notícia, o episódio e a Chamada, com
 * o título, o rótulo (“Notícia · Geral”, “Rádio Chofer · Ep. 42”, “Chamada · Filie-se”), a capa e se
 * ainda estão no site. Um lugar só para a lista do painel, as opções da janela, a conferência do
 * servidor e o rótulo da Atividade. O título da Chamada é a frase gravada, lida no servidor.
 */
export type DetalheDoItem = {
  chave: string;
  tipo: TipoDoItem;
  itemId: string | null;
  titulo: string;
  rotulo: string;
  capaUrl: string | null;
  /** Ainda está no site (notícia publicada, episódio no ar)? */
  noSite: boolean;
  temCapa: boolean;
};

/** Uma opção da janela “Adicionar destaque” ou “Trocar”: notícia ou episódio que está no ar. */
export type OpcaoDeDestaque = DetalheDoItem & { tipo: "noticia" | "episodio"; itemId: string };

const dados = sql`${conteudoVersao.snapshot} -> 'dados'`;

/** A notícia com o retrato da versão no ar (o título dele, a capa e a categoria); sem versão, o título de trabalho. */
function selecionarNoticias(onde: SQL | undefined) {
  return banco()
    .select({
      id: conteudo.id,
      titulo: sql<string>`coalesce(${dados} ->> 'titulo', ${conteudo.titulo})`,
      capaChave: midia.chaveR2,
      categoria: sql<string | null>`(SELECT nome FROM categoria WHERE categoria.id::text = ${dados} ->> 'categoriaId')`,
      noSite: sql<boolean>`coalesce(${noticiaNoAr}, false)`,
    })
    .from(conteudo)
    .leftJoin(conteudoVersao, and(eq(conteudoVersao.conteudoId, conteudo.id), eq(conteudoVersao.versao, conteudo.versao)))
    .leftJoin(midia, sql`${midia.id}::text = ${dados} ->> 'capaMidiaId'`)
    .where(and(eq(conteudo.tipo, "noticia"), onde));
}

function selecionarEpisodios(onde: SQL | undefined, agora: Date) {
  return banco()
    .select({
      id: episodio.id,
      numero: episodio.numero,
      titulo: episodio.titulo,
      youtubeId: episodio.youtubeId,
      capaChave: midia.chaveR2,
      noSite: sql<boolean>`coalesce(${episodioNoAr(agora)!}, false)`,
    })
    .from(episodio)
    .leftJoin(midia, eq(midia.id, episodio.capaMidiaId))
    .where(onde);
}

type NoticiaLida = Awaited<ReturnType<typeof selecionarNoticias>>[number];
type EpisodioLido = Awaited<ReturnType<typeof selecionarEpisodios>>[number];

function daNoticia(n: NoticiaLida, env: ReturnType<typeof lerEnvArmazenamento> | null): OpcaoDeDestaque {
  return {
    chave: chaveDoItem({ tipo: "noticia", itemId: n.id }),
    tipo: "noticia",
    itemId: n.id,
    titulo: n.titulo,
    rotulo: n.categoria ? `Notícia · ${n.categoria}` : "Notícia",
    capaUrl: n.capaChave && env ? urlPublica(n.capaChave, env) : null,
    noSite: n.noSite,
    temCapa: n.capaChave !== null,
  };
}

function doEpisodio(e: EpisodioLido): OpcaoDeDestaque {
  return {
    chave: chaveDoItem({ tipo: "episodio", itemId: e.id }),
    tipo: "episodio",
    itemId: e.id,
    titulo: e.titulo,
    rotulo: `Rádio Chofer · Ep. ${e.numero}`,
    capaUrl: enderecoDaCapa({ youtubeId: e.youtubeId, capaChave: e.capaChave }, "painel"),
    noSite: e.noSite,
    temCapa: true,
  };
}

const envSeHouverCapa = (linhas: { capaChave: string | null }[]) => (linhas.some((l) => l.capaChave) ? lerEnvArmazenamento() : null);

/** O slide do programa Rádio Chofer: sempre no site, com a capa padrão. */
export const PROGRAMA: DetalheDoItem = {
  chave: chaveDoItem({ tipo: "programa", itemId: null }),
  tipo: "programa",
  itemId: null,
  titulo: HOME_PAGINA.programaTitulo,
  rotulo: "Rádio Chofer · Programa",
  capaUrl: CAPA_DO_PROGRAMA,
  noSite: true,
  temCapa: true,
};

type ItemPedido = Pick<ItemDoCarrossel, "tipo" | "itemId"> & Partial<Pick<ItemDoCarrossel, "fraseChamada" | "chamada">>;

/**
 * Os detalhes dos itens pedidos, inclusive dos que saíram do ar, pela chave. O programa vem sempre.
 * A Chamada vem dos próprios dados (a frase e a foto); se aparecer duas vezes (publicado e
 * rascunho), vale a última.
 */
export async function detalhesDosItens(itens: ItemPedido[], agora: Date = new Date()): Promise<Record<string, DetalheDoItem>> {
  const ids = (tipo: TipoDoItem) => [...new Set(itens.filter((i) => i.tipo === tipo).map((i) => i.itemId!))];
  const chamadas = itens.filter((i) => i.tipo === "chamada" && i.chamada);
  const idsFotos = [...new Set(chamadas.map((c) => c.chamada!.fotoMidiaId))];
  const [noticias, episodios, fotos] = await Promise.all([
    ids("noticia").length ? selecionarNoticias(inArray(conteudo.id, ids("noticia"))) : [],
    ids("episodio").length ? selecionarEpisodios(inArray(episodio.id, ids("episodio")), agora) : [],
    idsFotos.length ? banco().select({ id: midia.id, chave: midia.chaveR2 }).from(midia).where(inArray(midia.id, idsFotos)) : [],
  ]);
  const env = noticias.some((n) => n.capaChave) || fotos.length ? lerEnvArmazenamento() : null;
  const urlDaFoto = new Map(fotos.map((f) => [f.id, env ? urlPublica(f.chave, env) : null]));
  const lista: DetalheDoItem[] = [
    PROGRAMA,
    ...noticias.map((n) => daNoticia(n, env)),
    ...episodios.map(doEpisodio),
    ...chamadas.map((c) => ({
      chave: chaveDoItem(c),
      tipo: "chamada" as const,
      itemId: c.itemId,
      titulo: c.fraseChamada ?? "Chamada",
      rotulo: `Chamada · ${NOME_DO_DESTINO[c.chamada!.destino].replace(/ \(.*\)$/, "")}`,
      capaUrl: urlDaFoto.get(c.chamada!.fotoMidiaId) ?? null,
      noSite: true,
      temCapa: true,
    })),
  ];
  return Object.fromEntries(lista.map((d) => [d.chave, d]));
}

/** Quantas opções a janela mostra de cada vez (tamanho da lista na tela, não regra: E62). A busca refina. */
export const OPCOES_POR_BUSCA = 20;

function padraoDaBusca(busca: string): string | null {
  const termo = busca.trim();
  return termo ? `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}

/** As notícias no ar ou os episódios no ar, dos mais novos aos mais antigos, com busca no título. */
export async function buscarOpcoes(pedido: { tipo: "noticia" | "episodio"; busca: string }, agora: Date): Promise<OpcaoDeDestaque[]> {
  const padrao = padraoDaBusca(pedido.busca);
  if (pedido.tipo === "noticia") {
    const linhas = await selecionarNoticias(and(noticiaNoAr, padrao ? sql`unaccent(${dados} ->> 'titulo') ilike unaccent(${padrao})` : undefined))
      .orderBy(desc(conteudo.publicadoEm), desc(conteudo.id))
      .limit(OPCOES_POR_BUSCA);
    const env = envSeHouverCapa(linhas);
    return linhas.map((n) => daNoticia(n, env));
  }
  const linhas = await selecionarEpisodios(
    and(episodioNoAr(agora), padrao ? sql`(unaccent(${episodio.titulo}) ilike unaccent(${padrao}) OR ${episodio.numero}::text = ${pedido.busca.trim()})` : undefined),
    agora,
  )
    .orderBy(desc(episodio.exibicaoEm), desc(episodio.numero))
    .limit(OPCOES_POR_BUSCA);
  return linhas.map(doEpisodio);
}
