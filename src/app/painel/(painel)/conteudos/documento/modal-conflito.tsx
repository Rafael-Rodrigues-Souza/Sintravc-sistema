"use client";

import type { ComponentProps } from "react";

import type { DadosDocumento } from "@/lib/documentos/dados";
import { partesDiferentes } from "@/lib/documentos/diferencas";

import { ModalConflito } from "../noticia/modais";

/** "Há duas versões do rascunho" (N4) do documento: o mesmo modal da notícia, com as partes do documento. */
export function ModalConflitoDocumento(props: Omit<ComponentProps<typeof ModalConflito<DadosDocumento>>, "diferencas">) {
  return <ModalConflito<DadosDocumento> {...props} diferencas={partesDiferentes} />;
}
