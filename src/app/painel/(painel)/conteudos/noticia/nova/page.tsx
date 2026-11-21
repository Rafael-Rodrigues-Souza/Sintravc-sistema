import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { noticiaVazia } from "@/lib/conteudos/dados";
import { situacaoDaFixacao } from "@/lib/conteudos/fixar";
import { pode } from "@/lib/permissoes";

import { EditorNoticia } from "../editor-noticia";
import { prepararEditor } from "../preparar-editor";

export const metadata: Metadata = { title: "Nova notícia" };

/** Nova notícia (RF37). Só vira linha no banco no primeiro salvamento (E40). */
export default async function PaginaNovaNoticia() {
  const pessoa = await exigirArea("conteudos");
  if (!pode(pessoa.quem, "criar", { tipo: "noticia" })) forbidden();
  const [{ categorias, intervaloMs, limites, arquivos }, fixacao] = await Promise.all([
    prepararEditor(pessoa.quem, []),
    pode(pessoa.quem, "fixar", { tipo: "noticia" }) ? situacaoDaFixacao(null) : null,
  ]);

  return (
    <EditorNoticia
      pessoaId={pessoa.id}
      quem={pessoa.quem}
      inicio={{
        id: null,
        revisao: 0,
        estado: "rascunho",
        revisaoPublicada: null,
        publicadoEm: null,
        agendadoPara: null,
        jaPublicado: false,
        autorId: pessoa.id,
        motivoOculto: null,
        dados: noticiaVazia(),
        salvoEm: null,
        servidor: null,
        fixacao,
      }}
      categorias={categorias}
      arquivosIniciais={arquivos}
      intervaloMs={intervaloMs}
      limites={limites}
    />
  );
}
