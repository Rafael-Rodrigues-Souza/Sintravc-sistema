import type { NoticiaParaLer } from "@/components/site/noticia-aberta";

import { contarPalavras, tempoDeLeitura } from "./corpo";
import type { DadosNoticia } from "./dados";

/**
 * Monta o que a notícia aberta mostra a partir dos dados (cópia de trabalho na prévia, retrato no
 * ar no site). A prévia do painel (#9) e a página pública (#15, E59) usam a mesma montagem.
 */
export function noticiaParaLer(
  dados: DadosNoticia,
  extras: {
    categoria: string | null;
    publicadoEm: Date | null;
    atualizadoEm: Date | null;
    /** Endereço público de cada arquivo da Mídia (capa e anexos). */
    enderecoDe: Map<string, string>;
  },
): NoticiaParaLer {
  const capaUrl = dados.capaMidiaId ? extras.enderecoDe.get(dados.capaMidiaId) : undefined;
  return {
    titulo: dados.titulo || "Notícia sem manchete",
    linhaFina: dados.linhaFina,
    lide: dados.lide,
    corpo: dados.corpo,
    capa: capaUrl ? { url: capaUrl, alt: dados.capaAlt, legenda: dados.capaLegenda } : null,
    categoria: extras.categoria,
    assinatura: dados.assinatura || "Redação SINTRAVC",
    local: dados.local,
    publicadoEm: extras.publicadoEm,
    atualizadoEm: extras.atualizadoEm,
    minutosDeLeitura: Math.max(1, tempoDeLeitura(contarPalavras(dados.corpo))),
    palavrasChave: dados.palavrasChave,
    links: dados.links
      .filter((l) => l.visivel)
      .map((l) => ({ tipo: l.tipo, titulo: l.titulo, href: l.midiaId ? (extras.enderecoDe.get(l.midiaId) ?? "") : (l.url ?? "") }))
      .filter((l) => l.href),
  };
}
