import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { carregarDocumento, versaoPublicadaDoDocumento } from "@/lib/documentos/carregar";
import { pode } from "@/lib/permissoes";
import { ehUuid } from "@/lib/uuid";

import { NoticiaArquivada } from "../../noticia/noticia-arquivada";
import { DocumentoSoLeitura } from "../documento-so-leitura";
import { EditorDocumento } from "../editor-documento";
import { prepararEditorDocumento } from "../preparar";

export const metadata: Metadata = { title: "Documento oficial" };

/**
 * Documento oficial no painel (RF41, RF42). O ADM edita; a Comunicação só vê e baixa, sem os botões
 * de editar, substituir ou remover (CA-US23.2), e o servidor nega se ela tentar (RNF01).
 */
export default async function PaginaDocumento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pessoa = await exigirArea("conteudos");
  if (!pode(pessoa.quem, "ver", { tipo: "documento" })) forbidden();
  if (!ehUuid(id)) notFound();
  const documento = await carregarDocumento(id, { quem: pessoa.quem });
  if (!documento) notFound();
  const publicada = await versaoPublicadaDoDocumento(id, { quem: pessoa.quem });

  if (!pode(pessoa.quem, "editar", { tipo: "documento" })) {
    const categoriaId = publicada?.dados.categoriaId;
    const categoria = categoriaId
      ? (await prepararEditorDocumento(pessoa.quem).catch(() => null))?.categorias.find((c) => c.id === categoriaId)?.nome
      : undefined;
    return <DocumentoSoLeitura documento={documento} publicada={publicada} categoria={categoria ?? null} />;
  }

  // Arquivado não se edita (o servidor também recusa): só restaurar como rascunho (RN10).
  if (documento.estado === "arquivado") {
    return (
      <NoticiaArquivada
        id={documento.id}
        tipo={documento.tipo}
        titulo={documento.dados.titulo}
        podeRestaurar={pode(pessoa.quem, "restaurar", { tipo: "documento" })}
        temVersao={documento.versao > 0}
      />
    );
  }

  const { categorias, intervaloMs, limiteBytes } = await prepararEditorDocumento(pessoa.quem);
  return (
    <EditorDocumento
      key={documento.id}
      pessoaId={pessoa.id}
      quem={pessoa.quem}
      inicio={{
        id: documento.id,
        tipo: documento.tipo,
        revisao: documento.revisao,
        estado: documento.estado,
        revisaoPublicada: documento.revisaoPublicada,
        publicadoEm: documento.publicadoEm?.toISOString() ?? null,
        agendadoPara: documento.agendadoPara?.toISOString() ?? null,
        jaPublicado: documento.jaPublicado,
        autorId: documento.autorId,
        motivoOculto: documento.motivoOculto,
        dados: documento.dados,
        salvoEm: documento.atualizadoEm.toISOString(),
        servidor: {
          revisao: documento.revisao,
          dados: documento.dados,
          salvoPorNome: documento.salvoPorNome,
          salvoEm: documento.atualizadoEm.toISOString(),
        },
        pdf: documento.pdf,
        pdfNoArId: publicada?.pdf?.id ?? null,
        dadosNoAr: publicada?.dados ?? null,
      }}
      categorias={categorias}
      intervaloMs={intervaloMs}
      limiteBytes={limiteBytes}
    />
  );
}
