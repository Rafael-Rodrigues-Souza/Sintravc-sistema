import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { carregarNoticia, versaoDoServidor } from "@/lib/conteudos/carregar";
import { midiasDaNoticia } from "@/lib/conteudos/validar";
import { pode } from "@/lib/permissoes";
import { ehUuid } from "@/lib/uuid";

import { EditorNoticia } from "../editor-noticia";
import { NoticiaArquivada } from "../noticia-arquivada";
import { prepararEditor } from "../preparar-editor";

export const metadata: Metadata = { title: "Editar notícia" };

/** Editar notícia de qualquer autor (RF37, RN55, E08). */
export default async function PaginaEditarNoticia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pessoa = await exigirArea("conteudos");
  if (!pode(pessoa.quem, "editar", { tipo: "noticia" })) forbidden();
  if (!ehUuid(id)) notFound();
  const noticia = await carregarNoticia(id, { quem: pessoa.quem });
  if (!noticia) notFound();
  // Arquivada não se edita (o servidor também recusa): só restaurar como rascunho (RN10).
  if (noticia.estado === "arquivado") {
    return (
      <NoticiaArquivada
        id={noticia.id}
        titulo={noticia.dados.titulo}
        podeRestaurar={pode(pessoa.quem, "restaurar", { tipo: "noticia" })}
        temVersao={noticia.versao > 0}
      />
    );
  }

  const { categorias, intervaloMs, limites, arquivos } = await prepararEditor(pessoa.quem, midiasDaNoticia(noticia.dados));

  return (
    <EditorNoticia
      key={noticia.id}
      pessoaId={pessoa.id}
      quem={pessoa.quem}
      inicio={{
        id: noticia.id,
        revisao: noticia.revisao,
        estado: noticia.estado,
        revisaoPublicada: noticia.revisaoPublicada,
        publicadoEm: noticia.publicadoEm?.toISOString() ?? null,
        agendadoPara: noticia.agendadoPara?.toISOString() ?? null,
        jaPublicado: noticia.jaPublicado,
        autorId: noticia.autorId,
        motivoOculto: noticia.motivoOculto,
        dados: noticia.dados,
        salvoEm: noticia.atualizadoEm.toISOString(),
        servidor: versaoDoServidor(noticia),
      }}
      categorias={categorias}
      arquivosIniciais={arquivos}
      intervaloMs={intervaloMs}
      limites={limites}
    />
  );
}
