/**
 * Arquivos da logo do sindicato em public/marca/, gerados por scripts/otimizar-logo.ts (#13, #61).
 * As medidas são as que o script imprime ao gerar: se ele mudar a altura ou o recorte, atualize aqui.
 * `caminho` vai sem a extensão: há WebP (telas) e PNG (e-mail e impressão) de cada versão.
 */
export const LOGO = {
  /** “Logo Original Nome Azul”: tema claro do site. */
  clara: { caminho: "/marca/sintravc-clara", largura: 245, altura: 192 },
  /** “Versão Branca”: tema escuro e fundos marinhos (rodapé do site, painel, e-mails). */
  branca: { caminho: "/marca/sintravc-escura", largura: 283, altura: 192 },
  /** “Versão Preta”: impressão. */
  preta: { caminho: "/marca/sintravc-preta", largura: 261, altura: 192 },
} as const;

/** Largura da versão para uma altura, mantendo a proporção. */
export function larguraNaAltura(versao: (typeof LOGO)[keyof typeof LOGO], altura: number) {
  return Math.round((altura * versao.largura) / versao.altura);
}
