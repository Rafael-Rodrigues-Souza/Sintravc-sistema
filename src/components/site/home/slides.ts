import { LINKS } from "@/components/site/navegacao";
import { HOME_PAGINA, RADIO_PAGINA } from "@/conteudo/site";
import type { ProgramaAoVivo } from "@/lib/config-site/esquema";
import { dataCurtaNaBahia } from "@/lib/datas";
import { textoDoHorario, programaNoAr } from "@/lib/episodios/programa";
import type { NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import type { SlideDaHome } from "@/lib/pagina-inicial/site";

/** A capa padrão do Rádio Chofer, a mesma da rota de capas quando o YouTube falha (E61). */
export const CAPA_DO_PROGRAMA = "/site/radio/capa-padrao.jpg";

export type SeloDoSlide = { texto: string; tom: "amarelo" | "escuro" | "ao-vivo" | "categoria"; cor?: string };

/** Um slide do carrossel, pronto para a tela (o mesmo no servidor e no navegador). */
export type SlideNaTela = {
  chave: string;
  selos: SeloDoSlide[];
  titulo: string;
  resumo: string | null;
  imagem: { url: string; alt: string };
  acoes: { rotulo: string; href: string; principal: boolean; tocar?: boolean }[];
};

/** Um item da lista “Em destaque”, ao lado do carrossel. */
export type ItemDaLista = { id: string; titulo: string; href: string; data: string; dataIso: string; capa: { url: string; alt: string } | null; categoria: { nome: string; cor: string } | null };

export function paraALista(n: NoticiaDoSite): ItemDaLista {
  return {
    id: n.id,
    titulo: n.titulo,
    href: n.href,
    data: dataCurtaNaBahia(n.publicadoEm),
    dataIso: n.publicadoEm.toISOString(),
    capa: n.capa,
    categoria: n.categoria ? { nome: n.categoria.nome, cor: n.categoria.cor } : null,
  };
}

/**
 * Os slides do carrossel (E62): notícia, episódio ou o programa Rádio Chofer, com o horário ao vivo.
 * Com frase de chamada (escrita pela Comunicação no painel), ela entra no lugar da linha fina.
 */
export function slidesNaTela(slides: SlideDaHome[], programa: ProgramaAoVivo, agora: Date): SlideNaTela[] {
  const t = HOME_PAGINA;
  return slides.map((s) => {
    if (s.tipo === "noticia") {
      const n = s.noticia;
      return {
        chave: `noticia:${n.id}`,
        selos: n.categoria ? [{ texto: n.categoria.nome, tom: "categoria", cor: n.categoria.cor }] : [],
        titulo: n.titulo,
        resumo: s.frase ?? (n.resumo || null),
        imagem: n.capa ?? { url: CAPA_DO_PROGRAMA, alt: "" },
        acoes: [{ rotulo: t.lerNoticia, href: n.href, principal: true }],
      };
    }
    if (s.tipo === "episodio") {
      const e = s.episodio;
      return {
        chave: `episodio:${e.id}`,
        selos: [
          { texto: t.programaSelo, tom: "amarelo" },
          { texto: `Ep. ${e.numero}`, tom: "escuro" },
        ],
        titulo: e.titulo,
        resumo: s.frase ?? e.resumo,
        imagem: { url: e.capaUrl, alt: "" },
        acoes: [{ rotulo: t.ouvirEpisodio, href: `${LINKS.radio.href}#episodios`, principal: true, tocar: true }],
      };
    }
    const aoVivo = programaNoAr(programa, agora);
    return {
      chave: "programa:programa",
      selos: [
        { texto: t.programaSelo, tom: "amarelo" },
        ...(programa.ativo ? [{ texto: aoVivo ? t.aoVivoAgora : textoDoHorario(programa), tom: aoVivo ? ("ao-vivo" as const) : ("escuro" as const) }] : []),
      ],
      titulo: t.programaTitulo,
      resumo: s.frase ?? RADIO_PAGINA.texto,
      imagem: { url: CAPA_DO_PROGRAMA, alt: "" },
      acoes: [
        { rotulo: t.ouvirUltimo, href: LINKS.radio.href, principal: true, tocar: true },
        { rotulo: t.todosOsProgramas, href: `${LINKS.radio.href}#episodios`, principal: false },
      ],
    };
  });
}
