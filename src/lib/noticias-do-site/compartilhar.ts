/** Compartilhar a notícia (E59) e a prévia do link (RNF08, P4). Puro: serve ao servidor e ao navegador. */

/** WhatsApp e Facebook. O Facebook só é chamado no clique: antes disso, nada vai para ele. */
export function linksDeCompartilhar(url: string, titulo: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}

/** Tamanho da descrição da prévia do link: o WhatsApp corta por volta disso. */
const DESCRICAO_MAXIMA = 200;

/** A descrição da prévia (P4): a linha fina; sem ela, o começo do lide, cortado numa palavra. */
export function descricaoDaNoticia(dados: { linhaFina: string; lide: string }): string {
  return descricaoParaCompartilhar(dados.linhaFina.trim() || dados.lide);
}

/** A descrição da prévia de um texto qualquer (notícia, documento aberto): uma linha, cortada numa palavra. */
export function descricaoParaCompartilhar(textoOriginal: string): string {
  const texto = textoOriginal.trim().replace(/\s+/g, " ");
  if (texto.length <= DESCRICAO_MAXIMA) return texto;
  const corte = texto.slice(0, DESCRICAO_MAXIMA - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > 80 ? corte.slice(0, espaco) : corte).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** A imagem padrão da prévia, para notícia sem capa (comentário da #15): logo sobre o marinho. */
export const IMAGEM_PADRAO_COMPARTILHAR = { caminho: "/site/compartilhar.png", largura: 1200, altura: 630 } as const;
