/**
 * O que a pessoa edita num documento oficial, edital ou acordo (RF41). É o mesmo formato no
 * servidor, no navegador (rascunho guardado sem internet, E02) e na tela. Nada aqui importa código
 * de servidor.
 */
import { bahiaParaUtc } from "@/lib/datas";

export const LIMITE_TITULO_DOCUMENTO = 160;
export const LIMITE_NUMERO = 60;
export const LIMITE_RESUMO = 400;
export const LIMITE_ABRANGENCIA = 300;
export const LIMITE_PARTES = 1000;
export const LIMITE_TEXTO_PESQUISAVEL = 200_000;

export type TipoDocumento = "edital" | "acordo";

export const SUBTIPOS = {
  edital: ["convocacao", "eleicao", "prestacao_contas", "outros"],
  acordo: ["act", "cct"],
} as const satisfies Record<TipoDocumento, readonly string[]>;

export type SubtipoDocumento = (typeof SUBTIPOS)[TipoDocumento][number];

/** Rótulos do spec §2.2 (E46). */
export const ROTULO_DO_SUBTIPO: Record<SubtipoDocumento, string> = {
  convocacao: "Convocação",
  eleicao: "Eleição",
  prestacao_contas: "Prestação de contas",
  outros: "Outros",
  act: "ACT · Acordo coletivo de trabalho",
  cct: "CCT · Convenção coletiva de trabalho",
};

export const NOME_DO_TIPO: Record<TipoDocumento, string> = { edital: "Edital", acordo: "Acordo ou convenção" };

export type DadosDocumento = {
  titulo: string;
  numero: string;
  subtipo: SubtipoDocumento | null;
  /** Dia do calendário, "AAAA-MM-DD", ou "" no rascunho. */
  dataDocumento: string;
  /** Data e hora do evento ou prazo, no horário da Bahia, como na tela ("" quando não há). */
  eventoData: string;
  eventoHora: string;
  /** No acordo a vigência é sempre pedida; o interruptor só existe no edital. */
  temVigencia: boolean;
  vigenciaInicio: string;
  vigenciaFim: string;
  abrangencia: string;
  partesSignatarias: string;
  resumo: string;
  categoriaId: string | null;
  pdfMidiaId: string | null;
  textoPesquisavel: string;
};

export function documentoVazio(tipo: TipoDocumento): DadosDocumento {
  return {
    titulo: "",
    numero: "",
    subtipo: null,
    dataDocumento: "",
    eventoData: "",
    eventoHora: "",
    temVigencia: tipo === "acordo",
    vigenciaInicio: "",
    vigenciaFim: "",
    abrangencia: "",
    partesSignatarias: "",
    resumo: "",
    categoriaId: null,
    pdfMidiaId: null,
    textoPesquisavel: "",
  };
}

/** A vigência vale no acordo sempre e no edital só com o interruptor ligado. */
export function usaVigencia(tipo: TipoDocumento, dados: Pick<DadosDocumento, "temVigencia">): boolean {
  return tipo === "acordo" || dados.temVigencia;
}

/** Como o documento aparece em listas, na Atividade e na Mídia quando ainda não tem título. */
export function rotuloDoDocumento(tipo: TipoDocumento, titulo: string): string {
  return titulo.trim() || (tipo === "edital" ? "Edital sem título" : "Acordo sem título");
}

/** A data e a hora do evento ou prazo, digitadas no horário da Bahia, como instante em UTC (RNF06). */
export function instanteDoEvento(campos: Pick<DadosDocumento, "eventoData" | "eventoHora">): Date | null {
  return campos.eventoData && campos.eventoHora ? bahiaParaUtc(campos.eventoData, campos.eventoHora) : null;
}
