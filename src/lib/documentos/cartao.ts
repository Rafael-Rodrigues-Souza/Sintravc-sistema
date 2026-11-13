/**
 * O que o cartão do documento mostra na página Documentos (Figma 73:629 e 75:1438), a partir dos
 * dados do editor. Puro: serve à prévia (#12) e à página pública (#16).
 */
import type { EstadoConteudo } from "@/lib/conteudos/listar";
import { dataNaBahia } from "@/lib/datas";

import { rotuloDoDocumento, type DadosDocumento, type SubtipoDocumento, type TipoDocumento } from "./dados";
import { ROTULO_DO_SELO, seloDosDados } from "./selo";

export type DocumentoNoCartao = {
  /** "Edital de convocação", "CCT · Convenção coletiva de trabalho"… */
  etiqueta: string;
  /** "Prazo", "Vigente", "Encerrado" (C2), calculado pelas datas; nulo sem selo. */
  selo: { rotulo: string; tom: "prazo" | "vigente" | "encerrado" } | null;
  titulo: string;
  numero: string;
  resumo: string;
  /** "20/10/2026"; nulo antes da publicação. */
  publicadoEm: string | null;
  /** "30/10/2026 · 19h00". */
  prazo: string | null;
  /** "01/05/2026 a 30/04/2027". */
  vigencia: string | null;
  abrangencia: string | null;
  /** "PDF · 1,2 MB". */
  arquivo: string | null;
  hrefAbrir: string | null;
  hrefBaixar: string | null;
};

const ETIQUETA: Record<SubtipoDocumento, string> = {
  convocacao: "Edital de convocação",
  eleicao: "Edital de eleição",
  prestacao_contas: "Edital · Prestação de contas",
  outros: "Edital",
  act: "Acordo coletivo (ACT)",
  cct: "Convenção coletiva (CCT)",
};

const dia = (valor: string) => valor.split("-").reverse().join("/");
/** "640 KB", "1,2 MB": como o tamanho do PDF aparece no painel e no site. */
export function tamanhoDoArquivo(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function cartaoDoDocumento(entrada: {
  tipo: TipoDocumento;
  estado: EstadoConteudo;
  dados: DadosDocumento;
  publicadoEm: Date | null;
  pdfBytes: number | null;
  hrefs: { abrir: string; baixar: string } | null;
  agora: Date;
}): DocumentoNoCartao {
  const { tipo, dados } = entrada;
  const selo = seloDosDados(tipo, entrada.estado, dados, entrada.agora);
  return {
    etiqueta: dados.subtipo ? ETIQUETA[dados.subtipo] : tipo === "edital" ? "Edital" : "Acordo ou convenção",
    selo: selo ? { rotulo: ROTULO_DO_SELO[selo], tom: selo } : null,
    titulo: rotuloDoDocumento(tipo, dados.titulo),
    numero: dados.numero,
    resumo: dados.resumo,
    publicadoEm: entrada.publicadoEm ? dataNaBahia(entrada.publicadoEm) : null,
    prazo: dados.eventoData && dados.eventoHora ? `${dia(dados.eventoData)} · ${dados.eventoHora.replace(":", "h")}` : null,
    vigencia: dados.vigenciaInicio && dados.vigenciaFim ? `${dia(dados.vigenciaInicio)} a ${dia(dados.vigenciaFim)}` : null,
    abrangencia: tipo === "acordo" && dados.abrangencia ? dados.abrangencia : null,
    arquivo: entrada.pdfBytes !== null ? `PDF · ${tamanhoDoArquivo(entrada.pdfBytes)}` : null,
    hrefAbrir: entrada.hrefs?.abrir ?? null,
    hrefBaixar: entrada.hrefs?.baixar ?? null,
  };
}
