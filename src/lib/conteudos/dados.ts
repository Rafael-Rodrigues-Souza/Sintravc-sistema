/**
 * O que a pessoa edita numa notícia (RF37). É o mesmo formato no servidor, no navegador (rascunho
 * guardado sem internet, E02) e na tela. Nada aqui importa código de servidor.
 */

export const LIMITE_MANCHETE = 110;
export const LIMITE_LINHA_FINA = 200;

/** Documento do Tiptap (JSON). Só formatos permitidos: veja corpo.ts. */
export type DocCorpo = { type: "doc"; content?: unknown[] };

export type LinkDaNoticia = {
  tipo: "fonte" | "anexo";
  titulo: string;
  url: string | null;
  midiaId: string | null;
  visivel: boolean;
};

export type DadosNoticia = {
  titulo: string;
  linhaFina: string;
  lide: string;
  corpo: DocCorpo;
  capaMidiaId: string | null;
  capaAlt: string;
  capaLegenda: string;
  assinatura: string;
  local: string;
  categoriaId: string | null;
  palavrasChave: string[];
  links: LinkDaNoticia[];
};

export function noticiaVazia(): DadosNoticia {
  return {
    titulo: "",
    linhaFina: "",
    lide: "",
    corpo: { type: "doc", content: [] },
    capaMidiaId: null,
    capaAlt: "",
    capaLegenda: "",
    assinatura: "",
    local: "",
    categoriaId: null,
    palavrasChave: [],
    links: [],
  };
}

/** Como a notícia aparece em listas, na Atividade e na Mídia ("Usado em") quando ainda não tem manchete. */
/** A assinatura quando a notícia não tem uma (site e prévia). */
export const ASSINATURA_PADRAO = "Redação SINTRAVC";

export function rotuloDaNoticia(titulo: string): string {
  return titulo.trim() || "Notícia sem manchete";
}

/** Um arquivo da Mídia que a tela do editor já conhece (capa, anexos). */
export type ArquivoConhecido = { nomeArquivo: string; url: string };
