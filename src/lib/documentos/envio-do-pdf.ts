/**
 * Qual permissão o envio do PDF oficial confere (RF41, RN08): o primeiro PDF do documento é parte de
 * "criar"; trocar um PDF que já existe é "substituir". Puro.
 */
export function acaoDoEnvioDoPdf(documento: { pdfMidiaId: string | null } | null): "criar" | "substituir" {
  return documento?.pdfMidiaId ? "substituir" : "criar";
}
