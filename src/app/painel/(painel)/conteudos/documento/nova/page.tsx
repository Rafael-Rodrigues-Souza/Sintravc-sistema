import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { documentoVazio, type TipoDocumento } from "@/lib/documentos/dados";
import { pode } from "@/lib/permissoes";

import { EditorDocumento } from "../editor-documento";
import { prepararEditorDocumento } from "../preparar";

export const metadata: Metadata = { title: "Novo documento oficial" };

/** Novo edital ou acordo (RF41). Só o ADM (RN08). Só vira linha no banco no primeiro salvamento (E40). */
export default async function PaginaNovoDocumento({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const pessoa = await exigirArea("conteudos");
  if (!pode(pessoa.quem, "criar", { tipo: "documento" })) forbidden();
  const tipo: TipoDocumento = (await searchParams).tipo === "acordo" ? "acordo" : "edital";
  const { categorias, intervaloMs, limiteBytes } = await prepararEditorDocumento(pessoa.quem);

  return (
    <EditorDocumento
      key={tipo}
      pessoaId={pessoa.id}
      quem={pessoa.quem}
      inicio={{
        id: null,
        tipo,
        revisao: 0,
        estado: "rascunho",
        revisaoPublicada: null,
        publicadoEm: null,
        agendadoPara: null,
        jaPublicado: false,
        autorId: pessoa.id,
        motivoOculto: null,
        dados: documentoVazio(tipo),
        salvoEm: null,
        servidor: null,
        pdf: null,
        pdfNoArId: null,
      }}
      categorias={categorias}
      intervaloMs={intervaloMs}
      limiteBytes={limiteBytes}
    />
  );
}
