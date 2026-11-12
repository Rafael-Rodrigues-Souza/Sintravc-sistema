"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { urlPublica } from "@/lib/armazenamento";
import {
  arquivarConteudos,
  desfazerArquivamento,
  excluirRascunho,
  mostrarNoSite,
  ocultarConteudos,
  restaurarComoRascunho,
  restaurarVersao,
  type ResultadoLote,
} from "@/lib/conteudos/ciclo-de-vida";
import type { DadosNoticia } from "@/lib/conteudos/dados";
import { ErroConteudo } from "@/lib/conteudos/erros";
import { MOTIVO_OCULTAR_MAXIMO } from "@/lib/conteudos/motivo";
import { versoesDaNoticia } from "@/lib/conteudos/publicar";
import { lerEnvArmazenamento } from "@/lib/env";
import { pode, SemPermissao } from "@/lib/permissoes";
import { filaDoSistema } from "@/lib/tarefas";

/**
 * Ciclo de vida da notícia (RF40, US22, E45) e Histórico de versões (N14, E31). Cada action
 * confere a sessão, o formato e a permissão; o domínio confere de novo, com os dados da notícia
 * (RNF01). As mensagens vão direto para o aviso (Sonner) ou para o campo.
 */

const PEDIDO_INVALIDO = "A tela mandou dados incompletos. Atualize a página e tente de novo.";
const FALHOU = "Não foi possível concluir agora. Tente de novo em alguns minutos.";
const SEM_PERMISSAO = "Seu perfil não pode fazer isso com esta notícia.";

const esquemaIds = z.array(z.uuid()).min(1).max(100);
const esquemaId = z.object({ id: z.uuid() });

export type RespostaLote =
  | { tipo: "feito"; feitos: string[]; ignorados: ResultadoLote["ignorados"] }
  | { tipo: "erro"; mensagem: string; campo?: string };

export type RespostaSimples = { tipo: "feito" } | { tipo: "erro"; mensagem: string };

function erro(e: unknown, contexto: string): { tipo: "erro"; mensagem: string; campo?: string } {
  if (e instanceof ErroConteudo) return { tipo: "erro", mensagem: e.message, campo: e.campo };
  if (e instanceof SemPermissao) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  console.error(`[conteudos] Falha ao ${contexto}.`, e);
  return { tipo: "erro", mensagem: FALHOU };
}

/**
 * Só a lista é revalidada. O editor atualiza o próprio estado: montar a tela de novo perderia o
 * desfazer do texto (como no salvamento, ver acoes.ts).
 */
function atualizarTelas() {
  revalidatePath("/painel/conteudos");
}

/** Ocultar do site (RN11): uma ou várias, com o mesmo motivo. */
export async function acaoOcultar(entrada: unknown): Promise<RespostaLote> {
  const pessoa = await sessaoDaEquipe();
  const validado = z.object({ ids: esquemaIds, motivo: z.string().max(MOTIVO_OCULTAR_MAXIMO) }).safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "ocultar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    const r = await ocultarConteudos(validado.data, { quem: pessoa.quem });
    atualizarTelas();
    return { tipo: "feito", ...r };
  } catch (e) {
    return erro(e, "ocultar");
  }
}

/** Mostrar no site de novo (Oculto → Publicado, E45). */
export async function acaoMostrarNoSite(entrada: unknown): Promise<RespostaSimples> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaId.safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "publicar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    await mostrarNoSite(validado.data, { quem: pessoa.quem });
    atualizarTelas();
    return { tipo: "feito" };
  } catch (e) {
    return erro(e, "mostrar no site");
  }
}

/** Arquivar (RN10): uma ou várias. */
export async function acaoArquivar(entrada: unknown): Promise<RespostaLote> {
  const pessoa = await sessaoDaEquipe();
  const validado = z.object({ ids: esquemaIds }).safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "arquivar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    const r = await arquivarConteudos(validado.data, { quem: pessoa.quem });
    atualizarTelas();
    return { tipo: "feito", ...r };
  } catch (e) {
    return erro(e, "arquivar");
  }
}

/** "Desfazer" do aviso de arquivamento (E45). */
export async function acaoDesfazerArquivamento(entrada: unknown): Promise<RespostaLote> {
  const pessoa = await sessaoDaEquipe();
  const validado = z.object({ ids: esquemaIds }).safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "arquivar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    const r = await desfazerArquivamento(validado.data, { quem: pessoa.quem, fila: await filaDoSistema() });
    atualizarTelas();
    return { tipo: "feito", ...r };
  } catch (e) {
    return erro(e, "desfazer o arquivamento");
  }
}

/** Restaurar como rascunho (Arquivado → Rascunho). */
export async function acaoRestaurarComoRascunho(entrada: unknown): Promise<RespostaSimples> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaId.safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "restaurar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    await restaurarComoRascunho(validado.data, { quem: pessoa.quem });
    atualizarTelas();
    return { tipo: "feito" };
  } catch (e) {
    return erro(e, "restaurar como rascunho");
  }
}

/** Excluir de vez o rascunho que nunca foi ao ar (RN54). Quem pode é conferido com os dados da notícia, no domínio. */
export async function acaoExcluirRascunho(entrada: unknown): Promise<RespostaSimples> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaId.safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    await excluirRascunho(validado.data, { quem: pessoa.quem });
    revalidatePath("/painel/conteudos");
    revalidatePath("/painel/midia");
    return { tipo: "feito" };
  } catch (e) {
    return erro(e, "excluir o rascunho");
  }
}

export type VersaoNaTela = {
  versao: number;
  criadoPorNome: string;
  criadoEm: string;
  noAr: boolean;
  voltaAoSite: boolean;
  resumo: string;
};

/** Versões publicadas para o painel Histórico (N14). */
export async function acaoListarVersoes(entrada: unknown): Promise<{ tipo: "versoes"; versoes: VersaoNaTela[] } | { tipo: "erro"; mensagem: string }> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaId.safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "ver_versoes", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    const versoes = await versoesDaNoticia(validado.data.id, { quem: pessoa.quem });
    return {
      tipo: "versoes",
      versoes: versoes.map((v) => ({
        versao: v.versao,
        criadoPorNome: v.criadoPorNome,
        criadoEm: v.criadoEm.toISOString(),
        noAr: v.noAr,
        voltaAoSite: v.voltaAoSite,
        resumo: v.resumo,
      })),
    };
  } catch (e) {
    return erro(e, "listar as versões");
  }
}

export type RespostaRestaurarVersao =
  | { tipo: "restaurada"; revisao: number; salvoEm: string; dados: DadosNoticia }
  | { tipo: "conflito" }
  | { tipo: "erro"; mensagem: string };

/** "Restaurar como rascunho" no Histórico (CA-US21.9): a versão vira a cópia de trabalho. */
export async function acaoRestaurarVersao(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaRestaurarVersao> {
  const pessoa = await sessaoDaEquipe();
  const validado = z
    .object({ id: z.uuid(), versao: z.number().int().positive(), revisaoBase: z.number().int().nonnegative() })
    .safeParse(entrada);
  const sessao = z.uuid().safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "restaurar_versao", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    const env = lerEnvArmazenamento();
    const r = await restaurarVersao(validado.data, {
      quem: pessoa.quem,
      sessaoEdicao: sessao.data,
      urlDoArquivo: (chave) => urlPublica(chave, env),
    });
    if (r.tipo === "conflito") return { tipo: "conflito" };
    revalidatePath("/painel/conteudos");
    return { tipo: "restaurada", revisao: r.noticia.revisao, salvoEm: r.noticia.atualizadoEm.toISOString(), dados: r.noticia.dados };
  } catch (e) {
    return erro(e, "restaurar a versão");
  }
}
