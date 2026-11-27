import { episodiosNoArPorIds, type EpisodioDoSite } from "@/lib/episodios/site";
import { noticiasNoArPorIds, type NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import { lerParametro } from "@/lib/parametros";

import { urlsDasFotos } from "./itens";
import { lerDadosDaHome } from "./rascunho";
import { montarHome, type Slide } from "./regras";

export type SlideDaHome = Slide<NoticiaDoSite, EpisodioDoSite>;

export type DestaquesDaHome = {
  slides: SlideDaHome[];
  /** O endereço público da foto de cada Chamada, pelo id da Mídia. */
  fotos: Record<string, string>;
  /** `home.carrossel_alternar_segundos`. */
  intervaloSegundos: number;
};

/**
 * O carrossel da Home (E62, E63). O site lê o publicado; a prévia do painel lê o rascunho. Segue o
 * relógio: o item fora das datas ou que saiu do ar não aparece.
 */
export async function destaquesDaHome(agora: Date = new Date(), versao: "publicado" | "rascunho" = "publicado"): Promise<DestaquesDaHome> {
  const [dados, intervaloSegundos] = await Promise.all([lerDadosDaHome(versao), lerParametro("home.carrossel_alternar_segundos")]);
  const idsNoticias = dados.carrossel.filter((i) => i.tipo === "noticia").map((i) => i.itemId!);
  const idsEpisodios = dados.carrossel.filter((i) => i.tipo === "episodio").map((i) => i.itemId!);
  const [noticias, episodios] = await Promise.all([noticiasNoArPorIds(idsNoticias), episodiosNoArPorIds(idsEpisodios, agora)]);
  const { slides } = montarHome({
    publicado: dados,
    noticias: new Map(noticias.map((n) => [n.id, n])),
    episodios: new Map(episodios.map((e) => [e.id, e])),
    agora,
  });
  const idsFotos = [...new Set(slides.flatMap((s) => (s.tipo === "chamada" ? [s.chamada.fotoMidiaId] : [])))];
  return { slides, fotos: await urlsDasFotos(idsFotos), intervaloSegundos };
}
