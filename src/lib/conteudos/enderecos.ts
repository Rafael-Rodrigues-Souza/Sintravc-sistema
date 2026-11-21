/**
 * Endereços aceitos nas notícias (links do corpo, fontes). Um lugar só para a regra, usado na tela
 * e no servidor (E40): só http, https e, no corpo, mailto.
 */

/** Endereço da web completo: http(s)://algo.dominio */
export function ehEnderecoDaWeb(url: string): boolean {
  const texto = url.trim();
  if (/\s/.test(texto)) return false;
  try {
    const endereco = new URL(texto);
    return (
      (endereco.protocol === "http:" || endereco.protocol === "https:") &&
      endereco.hostname.includes(".") &&
      !endereco.username &&
      !endereco.password
    );
  } catch {
    return false;
  }
}

/** Link que o corpo da notícia aceita: endereço http(s) ou mailto. */
export function ehLinkPermitido(href: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(href.trim());
}

/**
 * O que a pessoa digitou vira um endereço completo ("planalto.gov.br" vira "https://planalto.gov.br"),
 * ou null se não parece um endereço. Com `aceitarEmail`, também "mailto:alguem@dominio".
 */
export function normalizarEndereco(digitado: string, opcoes: { aceitarEmail?: boolean } = {}): string | null {
  const texto = digitado.trim();
  if (!texto) return null;
  if (opcoes.aceitarEmail && /^mailto:[^\s@]+@[^\s@]+$/i.test(texto)) return texto;
  // Só completa o que não tem esquema ("planalto.gov.br"); "mailto:", "javascript:" etc. não viram https.
  const temEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) && !/^[^:/]+\.[^:/]+:\d/.test(texto);
  const completo = temEsquema ? texto : `https://${texto}`;
  return ehEnderecoDaWeb(completo) ? completo : null;
}

/**
 * Endereço público de um conteúdo publicado no site: a notícia aberta e os documentos (as páginas
 * chegam na #15 e na #16). Usado pelo “Saiba mais” dos comunicados e pelas notícias recentes.
 */
export function enderecoPublicoDoConteudo(tipo: "noticia" | "edital" | "acordo", slug: string): string {
  if (tipo === "noticia") return `/noticias/${slug}`;
  if (tipo === "edital") return `/documentos/editais/${slug}`;
  return `/documentos/acordos-coletivos/${slug}`;
}
