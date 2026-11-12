import { randomUUID } from "node:crypto";

import { documentoVazio, type DadosDocumento, type TipoDocumento } from "@/lib/documentos/dados";
import { salvarRascunhoDocumento } from "@/lib/documentos/salvar";
import { enviarMidia } from "@/lib/midia/enviar";
import type { QuemDaEquipe } from "@/lib/permissoes";

import { armazenamentoEmMemoria } from "./armazenamento-memoria";
import { pdf } from "./arquivos/gerar";
import { idDaCategoria } from "./noticias";

/** Dependências do salvamento de documento: uma sessão nova do editor a cada chamada. */
export function edicaoDoDocumento(quem: QuemDaEquipe, sessaoEdicao: string = randomUUID()) {
  return { quem, sessaoEdicao };
}

/** Um PDF enviado à Mídia (por um ADM), pronto para ser o arquivo oficial. */
export async function pdfEnviado(quem: QuemDaEquipe, nome = "edital.pdf"): Promise<string> {
  return (await enviarMidia({ bytes: await pdf(2), nome }, { quem, armazenamento: armazenamentoEmMemoria().armazenamento })).id;
}

/** Número que nenhum outro teste usa (o número é único por tipo, E46). */
export const numeroNovo = (prefixo = "Edital nº") => `${prefixo} ${randomUUID().slice(0, 8)}/2026`;

/** Documento com todos os obrigatórios preenchidos (pode ir ao ar). */
export async function documentoCompleto(
  tipo: TipoDocumento,
  quem: QuemDaEquipe,
  mudancas: Partial<DadosDocumento> = {},
): Promise<DadosDocumento> {
  const comuns = {
    ...documentoVazio(tipo),
    dataDocumento: "2026-10-20",
    resumo: "Resumo público do documento.",
    categoriaId: await idDaCategoria(tipo === "edital" ? "Assembleias" : "Acordos e convenções"),
    pdfMidiaId: await pdfEnviado(quem),
  };
  const proprios: Partial<DadosDocumento> =
    tipo === "edital"
      ? { titulo: "Edital de convocação · Assembleia geral", numero: numeroNovo(), subtipo: "convocacao" }
      : {
          titulo: "Convenção coletiva 2026/2027",
          numero: numeroNovo("CCT"),
          subtipo: "cct",
          vigenciaInicio: "2026-05-01",
          vigenciaFim: "2027-04-30",
          abrangencia: "Transporte coletivo urbano",
          partesSignatarias: "SINTRAVC e sindicato patronal",
        };
  return { ...comuns, ...proprios, ...mudancas };
}

/** Rascunho de documento salvo pelo editor, como a tela faria. */
export async function documentoSalvo(quem: QuemDaEquipe, tipo: TipoDocumento, dados: DadosDocumento) {
  const r = await salvarRascunhoDocumento({ tipo, dados }, edicaoDoDocumento(quem));
  if (r.tipo !== "salvo") throw new Error("esperava salvo");
  return r;
}
