/**
 * Textos jurídicos do site (RN45). Quem escreve é o advogado do sindicato (D6, D9): este arquivo só
 * recebe o texto aprovado, entregue pelo Rafael. Enquanto `secoes` estiver vazio, a página mostra o
 * marcador. Cada seção vira um item do sumário “Nesta página”, com âncora pelo `id`.
 */
export type SecaoJuridica = { id: string; titulo: string; paragrafos: string[] };
export type TextoJuridico = { atualizadoEm: string; secoes: SecaoJuridica[] };

export const POLITICA_DE_PRIVACIDADE: TextoJuridico = {
  atualizadoEm: "[Data da versão aprovada]",
  secoes: [],
};

export const TERMOS_DE_USO: TextoJuridico = {
  atualizadoEm: "[Data da versão aprovada]",
  secoes: [],
};
