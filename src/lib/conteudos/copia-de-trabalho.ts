/**
 * A cópia de trabalho de cada tipo de conteúdo, no formato que publicar, agendar e a publicação
 * agendada usam (E42, E44, E46): o título, o retrato que vai para a versão, o que falta para
 * publicar e como atualizar o uso da Mídia. Assim o núcleo da publicação é um só para todos os tipos.
 */
import type { Transacao } from "@/lib/db";
import { lerDocumento, type RetratoDoDocumento } from "@/lib/documentos/carregar";
import { faltasParaPublicarDocumento } from "@/lib/documentos/obrigatorios";
import { gravarUsosDoDocumento } from "@/lib/documentos/salvar";

import { lerNoticia, type RetratoDaNoticia } from "./carregar";
import { faltasParaPublicar } from "./obrigatorios";
import { gravarUsos } from "./salvar";
import type { LinhaDoConteudo } from "./tipo-do-conteudo";

export type CopiaDeTrabalho = {
  titulo: string;
  retrato: RetratoDaNoticia | RetratoDoDocumento;
  /** Campos que faltam para publicar (lista vazia: pode ir ao ar). */
  faltas: { campo: string; rotulo: string }[];
  /** Regrava a `midia_uso` depois que a versão no ar mudou (RN16). */
  gravarUsos: (tx: Transacao) => Promise<void>;
  /** O PDF oficial da cópia (só documento), para a Atividade. */
  pdfMidiaId?: string | null;
};

export async function copiaDeTrabalho(tx: Transacao, atual: LinhaDoConteudo): Promise<CopiaDeTrabalho> {
  if (atual.tipo === "noticia") {
    const { dados } = (await lerNoticia(tx, atual.id))!;
    return {
      titulo: dados.titulo,
      retrato: { formato: 1, dados },
      faltas: faltasParaPublicar(dados),
      gravarUsos: (t) => gravarUsos(t, atual.id, dados),
    };
  }
  const { dados } = (await lerDocumento(tx, atual.id))!;
  return {
    titulo: dados.titulo,
    retrato: { formato: 1, tipo: atual.tipo, dados },
    faltas: faltasParaPublicarDocumento(atual.tipo, dados),
    gravarUsos: (t) => gravarUsosDoDocumento(t, atual.id, dados),
    pdfMidiaId: dados.pdfMidiaId,
  };
}
