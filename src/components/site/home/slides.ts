import { LINKS } from "@/components/site/navegacao";
import { HOME_PAGINA, RADIO_PAGINA } from "@/conteudo/site";
import type { ProgramaAoVivo } from "@/lib/config-site/esquema";
import { textoDoHorario, programaNoAr } from "@/lib/episodios/programa";
import { CAPA_DO_PROGRAMA, chaveDoItem, textoDoBotao } from "@/lib/pagina-inicial/regras";
import type { SlideDaHome } from "@/lib/pagina-inicial/site";

export type SeloDoSlide = { texto: string; tom: "amarelo" | "escuro" | "ao-vivo" | "categoria"; cor?: string };

/** Um slide do carrossel, pronto para a tela (o mesmo no servidor e no navegador). */
export type SlideNaTela = {
  chave: string;
  selos: SeloDoSlide[];
  titulo: string;
  resumo: string | null;
  imagem: { url: string; alt: string };
  /** `externo`: abre fora do site, em outra aba (o WhatsApp da filiação, com o ícone). */
  acoes: { rotulo: string; href: string; principal: boolean; tocar?: boolean; externo?: boolean }[];
};

/**
 * Os slides do carrossel (E62, E63): notícia, episódio, o programa Rádio Chofer (com o horário ao
 * vivo) e a Chamada. Com frase de chamada (escrita pela Comunicação no painel), ela entra no lugar da
 * linha fina; na Chamada, a frase é o título e o texto de apoio vem embaixo.
 */
export function slidesNaTela(
  slides: SlideDaHome[],
  programa: ProgramaAoVivo,
  agora: Date,
  chamadas: { fotos: Record<string, string>; linkFiliacao: string },
): SlideNaTela[] {
  const t = HOME_PAGINA;
  return slides.map((s) => {
    if (s.tipo === "chamada") {
      const c = s.chamada;
      const filiacao = c.destino === "filie_se";
      return {
        chave: chaveDoItem({ tipo: "chamada", itemId: c.itemId }),
        selos: [],
        titulo: s.frase ?? "",
        resumo: c.textoApoio,
        imagem: { url: chamadas.fotos[c.fotoMidiaId] ?? CAPA_DO_PROGRAMA, alt: c.fotoAlt },
        acoes: [{ rotulo: textoDoBotao(c), href: filiacao ? chamadas.linkFiliacao : LINKS.beneficios.href, principal: true, externo: filiacao }],
      };
    }
    if (s.tipo === "noticia") {
      const n = s.noticia;
      return {
        chave: chaveDoItem({ tipo: "noticia", itemId: n.id }),
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
        chave: chaveDoItem({ tipo: "episodio", itemId: e.id }),
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
      chave: chaveDoItem({ tipo: "programa", itemId: null }),
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
