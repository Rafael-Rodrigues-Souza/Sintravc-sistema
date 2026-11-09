"use server";

import { revalidatePath } from "next/cache";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { salvarDetalhesMidia, type CampoDosDetalhes } from "@/lib/midia/detalhes";
import { ErroMidia, type UsoDaMidia } from "@/lib/midia/erros";
import { excluirMidia } from "@/lib/midia/excluir";
import { pode, SemPermissao } from "@/lib/permissoes";

export type EstadoDetalhes = {
  erros?: Partial<Record<CampoDosDetalhes, string>>;
  erro?: string;
  /** Muda a cada salvamento, para a tela mostrar o aviso uma vez. */
  salvoEm?: number;
};

/** Salvar nome, texto alternativo e legenda (RF48). A permissão é conferida no servidor (RNF01). */
export async function acaoSalvarDetalhes(_anterior: EstadoDetalhes, formulario: FormData): Promise<EstadoDetalhes> {
  const pessoa = await sessaoDaEquipe();
  if (!pode(pessoa.quem, "editar_alt", { tipo: "midia" })) {
    return { erro: "Seu perfil não pode editar os arquivos da Mídia." };
  }
  const id = String(formulario.get("id") ?? "");
  try {
    await salvarDetalhesMidia(
      id,
      {
        nomeArquivo: String(formulario.get("nomeArquivo") ?? ""),
        alt: String(formulario.get("alt") ?? ""),
        legenda: String(formulario.get("legenda") ?? ""),
      },
      { quem: pessoa.quem },
    );
  } catch (erro) {
    if (erro instanceof ErroMidia) {
      return erro.campo ? { erros: { [erro.campo]: erro.message } } : { erro: erro.message };
    }
    console.error("[midia] Falha ao salvar os detalhes.", erro);
    return { erro: "Não foi possível salvar agora. Tente de novo em alguns minutos." };
  }
  revalidatePath("/painel/midia");
  return { salvoEm: Date.now() };
}

export type ResultadoExcluir = { ok: true } | { ok: false; erro: string; usos?: UsoDaMidia[] };

/** Excluir um arquivo sem uso (RF49, RN16), depois da confirmação na tela. */
export async function acaoExcluirMidia(id: string): Promise<ResultadoExcluir> {
  const pessoa = await sessaoDaEquipe();
  try {
    await excluirMidia(id, { quem: pessoa.quem });
  } catch (erro) {
    if (erro instanceof ErroMidia) return { ok: false, erro: erro.message, usos: erro.usos };
    if (erro instanceof SemPermissao) return { ok: false, erro: "Seu perfil não pode excluir arquivos da Mídia." };
    console.error("[midia] Falha ao excluir.", erro);
    return { ok: false, erro: "Não foi possível excluir agora. Tente de novo em alguns minutos." };
  }
  revalidatePath("/painel/midia");
  return { ok: true };
}
