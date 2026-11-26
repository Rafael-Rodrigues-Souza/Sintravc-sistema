import { episodiosNoArPorIds, type EpisodioDoSite } from "@/lib/episodios/site";
import { noticiasNoArPorIds, noticiasRecentes, type NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import { lerParametro } from "@/lib/parametros";

import { lerDadosDaHome } from "./rascunho";
import { montarHome, type Slide } from "./regras";

export type SlideDaHome = Slide<NoticiaDoSite, EpisodioDoSite>;

export type DestaquesDaHome = {
  slides: SlideDaHome[];
  lista: NoticiaDoSite[];
  /** `home.carrossel_alternar_segundos`. */
  intervaloSegundos: number;
};

/**
 * O carrossel e a lista “Em destaque” da Home (E62). O site lê o publicado; a prévia do painel lê o
 * rascunho. Segue o relógio: o item fora das datas ou que saiu do ar não aparece.
 */
export async function destaquesDaHome(agora: Date = new Date(), versao: "publicado" | "rascunho" = "publicado"): Promise<DestaquesDaHome> {
  const [dados, listaPosicoes, carrosselMaximo, intervaloSegundos] = await Promise.all([
    lerDadosDaHome(versao),
    lerParametro("home.lista_posicoes"),
    lerParametro("home.carrossel_maximo"),
    lerParametro("home.carrossel_alternar_segundos"),
  ]);
  const idsNoticias = [
    ...dados.carrossel.filter((i) => i.tipo === "noticia").map((i) => i.itemId!),
    ...dados.lista.flatMap((p) => (p ? [p.noticiaId] : [])),
  ];
  const idsEpisodios = dados.carrossel.filter((i) => i.tipo === "episodio").map((i) => i.itemId!);
  const [noticias, episodios, recentes] = await Promise.all([
    noticiasNoArPorIds(idsNoticias),
    episodiosNoArPorIds(idsEpisodios, agora),
    // O bastante para completar a lista sem repetir o que está no carrossel e nas escolhidas.
    noticiasRecentes(listaPosicoes * 2 + carrosselMaximo, agora),
  ]);
  const { slides, lista } = montarHome({
    publicado: dados,
    noticias: new Map(noticias.map((n) => [n.id, n])),
    episodios: new Map(episodios.map((e) => [e.id, e])),
    recentes,
    listaPosicoes,
    agora,
  });
  return { slides, lista, intervaloSegundos };
}
