/**
 * O que o documento oficial precisa ter para ir ao ar (RF41, RN12, E46). No rascunho tudo pode
 * ficar vazio (como E40); a cobrança é na publicação. A mesma regra roda na tela (card "Antes de
 * publicar") e no servidor. A confirmação de versão oficial não entra aqui: é pedida no modal.
 * Nada aqui importa código de servidor.
 */
import { usaVigencia, type DadosDocumento, type TipoDocumento } from "./dados";

/** `campo` é a chave do campo na tela (a mesma do erro do salvamento). */
export const CAMPOS_OBRIGATORIOS_DOCUMENTO = [
  "titulo",
  "numero",
  "subtipo",
  "dataDocumento",
  "vigenciaInicio",
  "vigenciaFim",
  "abrangencia",
  "partesSignatarias",
  "resumo",
  "pdfMidiaId",
  "categoriaId",
] as const;
export type CampoObrigatorioDocumento = (typeof CAMPOS_OBRIGATORIOS_DOCUMENTO)[number];

export type FaltaDocumento = { campo: CampoObrigatorioDocumento; rotulo: string };

const vazio = (texto: string) => texto.trim() === "";

/** Itens que faltam, na ordem em que aparecem na tela. Lista vazia: pode publicar. */
export function faltasParaPublicarDocumento(tipo: TipoDocumento, dados: DadosDocumento): FaltaDocumento[] {
  const faltas: FaltaDocumento[] = [];
  if (vazio(dados.titulo)) faltas.push({ campo: "titulo", rotulo: "Título oficial" });
  if (vazio(dados.numero)) faltas.push({ campo: "numero", rotulo: "Número ou identificação" });
  if (!dados.subtipo) faltas.push({ campo: "subtipo", rotulo: tipo === "edital" ? "Tipo de edital" : "Tipo de acordo" });
  if (vazio(dados.dataDocumento)) faltas.push({ campo: "dataDocumento", rotulo: "Data do documento" });
  if (usaVigencia(tipo, dados)) {
    if (vazio(dados.vigenciaInicio)) faltas.push({ campo: "vigenciaInicio", rotulo: "Início da vigência" });
    if (vazio(dados.vigenciaFim)) faltas.push({ campo: "vigenciaFim", rotulo: "Fim da vigência" });
  }
  if (tipo === "acordo") {
    if (vazio(dados.abrangencia)) faltas.push({ campo: "abrangencia", rotulo: "Abrangência" });
    if (vazio(dados.partesSignatarias)) faltas.push({ campo: "partesSignatarias", rotulo: "Partes signatárias" });
  }
  if (vazio(dados.resumo)) faltas.push({ campo: "resumo", rotulo: "Resumo" });
  if (!dados.pdfMidiaId) faltas.push({ campo: "pdfMidiaId", rotulo: "PDF oficial" });
  if (!dados.categoriaId) faltas.push({ campo: "categoriaId", rotulo: "Categoria" });
  return faltas;
}
