"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { opcoesDeDestaque, type OpcaoDeDestaque } from "@/lib/pagina-inicial/opcoes";
import { descartarAlteracoes, lerPainel, publicarAlteracoes, salvarRascunho, tirarDoArAgora, type PainelDaHome } from "@/lib/pagina-inicial/rascunho";
import { ErroPaginaInicial, esquemaDadosDaHome, type DadosDaHomeNoNavegador } from "@/lib/pagina-inicial/regras";
import { SemPermissao } from "@/lib/permissoes";
import { revalidarSitePublico } from "@/lib/site/revalidar";
import { filaDoSistema } from "@/lib/tarefas";

export type Resposta<T = object> = ({ tipo: "ok" } & T) | { tipo: "erro"; mensagem: string; campo?: string };

/** O que o salvamento automático devolve à fila do rascunho (`criarFilaDoRascunho`). */
export type RespostaDoSalvamento =
  | { tipo: "salvo"; id: string; revisao: number; salvoEm: string; revisaoPublicada: null }
  | { tipo: "conflito" }
  | { tipo: "erro"; mensagem: string; campo?: string };

const CAMINHO = "/painel/pagina-inicial";
const SEM_PERMISSAO = "Seu perfil não pode mexer na página inicial.";
const FALHOU = "Não foi possível concluir agora. Tente de novo em alguns minutos.";
const PEDIDO_INVALIDO = "A tela mandou dados incompletos. Atualize a página e tente de novo.";

function erroParaResposta(erro: unknown, contexto: string): { tipo: "erro"; mensagem: string; campo?: string } {
  if (erro instanceof ErroPaginaInicial) return { tipo: "erro", mensagem: erro.message, campo: erro.campo };
  if (erro instanceof SemPermissao) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  console.error(`[pagina-inicial] Falha ao ${contexto}.`, erro);
  return { tipo: "erro", mensagem: FALHOU };
}

const esquemaSalvar = z.object({ revisaoBase: z.number().int().nonnegative(), dados: esquemaDadosDaHome });
const esquemaRevisao = z.object({ revisaoBase: z.number().int().nonnegative() });
const esquemaTirar = z.object({ chave: z.string().max(80), rotulo: z.string().max(300) });
const esquemaOpcoes = z.object({ tipo: z.enum(["noticia", "episodio"]), busca: z.string().max(120) });

/** Salvamento automático do rascunho (E62): sem revalidar nem Atividade. */
export async function acaoSalvarRascunhoDaHome(pedido: { revisaoBase?: number; dados: DadosDaHomeNoNavegador }): Promise<RespostaDoSalvamento> {
  const lido = esquemaSalvar.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    const r = await salvarRascunho(lido.data, { quem });
    if (r.tipo === "conflito") return r;
    return { tipo: "salvo", id: "home", revisao: r.revisao, salvoEm: r.salvoEm, revisaoPublicada: null };
  } catch (erro) {
    return erroParaResposta(erro, "salvar o rascunho");
  }
}

export async function acaoPublicarHome(pedido: unknown): Promise<Resposta<{ painel: PainelDaHome }>> {
  const lido = esquemaRevisao.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    await publicarAlteracoes(lido.data, { quem, fila: await filaDoSistema() });
    revalidarSitePublico();
    revalidatePath(CAMINHO);
    return { tipo: "ok", painel: await lerPainel({ quem }) };
  } catch (erro) {
    return erroParaResposta(erro, "publicar as alterações");
  }
}

export async function acaoDescartarHome(pedido: unknown): Promise<Resposta<{ painel: PainelDaHome }>> {
  const lido = esquemaRevisao.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    await descartarAlteracoes(lido.data, { quem });
    revalidatePath(CAMINHO);
    return { tipo: "ok", painel: await lerPainel({ quem }) };
  } catch (erro) {
    return erroParaResposta(erro, "descartar as alterações");
  }
}

export async function acaoTirarDoArAgora(pedido: unknown): Promise<Resposta<{ painel: PainelDaHome }>> {
  const lido = esquemaTirar.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    await tirarDoArAgora(lido.data, { quem });
    revalidarSitePublico();
    revalidatePath(CAMINHO);
    return { tipo: "ok", painel: await lerPainel({ quem }) };
  } catch (erro) {
    return erroParaResposta(erro, "tirar o destaque do ar");
  }
}

export async function acaoOpcoesDeDestaque(pedido: unknown): Promise<Resposta<{ opcoes: OpcaoDeDestaque[] }>> {
  const lido = esquemaOpcoes.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    return { tipo: "ok", opcoes: await opcoesDeDestaque(lido.data, { quem }) };
  } catch (erro) {
    return erroParaResposta(erro, "buscar as opções");
  }
}
