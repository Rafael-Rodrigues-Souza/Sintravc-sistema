"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { ErroConteudo } from "@/lib/conteudos/erros";
import type { RespostaEnvio, VersaoServidor } from "@/lib/conteudos/fila-rascunho";
import { ErroFaltamCampos } from "@/lib/conteudos/publicar";
import { bahiaParaUtc } from "@/lib/datas";
import { agendarDocumento } from "@/lib/documentos/agendar";
import type { DocumentoAberto } from "@/lib/documentos/carregar";
import type { DadosDocumento } from "@/lib/documentos/dados";
import { publicarDocumento } from "@/lib/documentos/publicar";
import { salvarRascunhoDocumento, type ResultadoSalvarDocumento } from "@/lib/documentos/salvar";
import { descartarAlteracoesDocumento, restaurarVersaoDocumento, resolverConflitoDocumento, versoesDoDocumento } from "@/lib/documentos/versoes";
import { pode, SemPermissao } from "@/lib/permissoes";
import { filaDoSistema } from "@/lib/tarefas";

import { versaoNaTela, type VersaoNaTela } from "@/lib/conteudos/versoes";

/**
 * Ações do editor de documento oficial (RF41, RN12, E46). Só o ADM altera (RN08): cada action
 * confere a sessão, o formato e a permissão, e o domínio confere de novo (RNF01). O formato fino
 * dos campos (limites, datas) é conferido no domínio (conferirDocumento).
 */

const SO_ADM = "Só o Administrador geral altera documentos oficiais.";
const PEDIDO_INVALIDO = "A tela mandou dados incompletos. Atualize a página e tente de novo.";
const FALHOU = "Não foi possível concluir agora. Tente de novo em alguns minutos.";

const esquemaTipo = z.enum(["edital", "acordo"]);
const esquemaSessao = z.uuid();
/** Só a forma; os limites e as datas são conferidos no domínio, com a mensagem do campo. */
const esquemaDados = z.object({
  titulo: z.string(),
  numero: z.string(),
  subtipo: z.string().nullable(),
  dataDocumento: z.string(),
  eventoData: z.string(),
  eventoHora: z.string(),
  temVigencia: z.boolean(),
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  abrangencia: z.string(),
  partesSignatarias: z.string(),
  resumo: z.string(),
  categoriaId: z.string().nullable(),
  pdfMidiaId: z.string().nullable(),
  textoPesquisavel: z.string(),
});
const esquemaPedido = z.object({
  id: z.uuid().optional(),
  revisaoBase: z.number().int().nonnegative().optional(),
  tipo: esquemaTipo,
  dados: esquemaDados,
});
const esquemaConflito = z.object({
  id: z.uuid(),
  tipo: esquemaTipo,
  escolha: z.enum(["minha", "servidor"]),
  revisaoServidor: z.number().int().nonnegative(),
  dados: esquemaDados,
});
const esquemaPublicar = z.object({ id: z.uuid(), revisaoBase: z.number().int().nonnegative(), confirmoOficial: z.boolean() });
const esquemaQuando = z.object({ data: z.string(), hora: z.string() });

function erroParaResposta(erro: unknown, contexto: string): { tipo: "erro"; mensagem: string; campo?: string } {
  if (erro instanceof ErroConteudo) return { tipo: "erro", mensagem: erro.message, campo: erro.campo };
  if (erro instanceof SemPermissao) return { tipo: "erro", mensagem: SO_ADM };
  console.error(`[documentos] Falha ao ${contexto}.`, erro);
  return { tipo: "erro", mensagem: FALHOU };
}

async function versaoDoServidor(documento: DocumentoAberto): Promise<VersaoServidor<DadosDocumento>> {
  return {
    revisao: documento.revisao,
    dados: documento.dados,
    salvoPorNome: documento.salvoPorNome,
    salvoEm: documento.atualizadoEm.toISOString(),
  };
}

async function responder(resultado: ResultadoSalvarDocumento): Promise<RespostaEnvio<DadosDocumento>> {
  if (resultado.tipo === "conflito") return { tipo: "conflito", servidor: await versaoDoServidor(resultado.servidor) };
  return { tipo: "salvo", id: resultado.id, revisao: resultado.revisao, salvoEm: resultado.salvoEm.toISOString() };
}

/** Salvamento automático do rascunho (RF38, E40). */
export async function acaoSalvarDocumento(pedido: unknown, sessaoEdicao: unknown): Promise<RespostaEnvio<DadosDocumento>> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaPedido.safeParse(pedido);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, validado.data.id ? "editar" : "criar", { tipo: "documento" })) return { tipo: "erro", mensagem: SO_ADM };
  try {
    const { dados, ...resto } = validado.data;
    return await responder(await salvarRascunhoDocumento({ ...resto, dados: dados as DadosDocumento }, { quem: pessoa.quem, sessaoEdicao: sessao.data }));
  } catch (erro) {
    return erroParaResposta(erro, "salvar o rascunho");
  }
}

/** Escolha no modal "Há duas versões do rascunho" (N4). */
export async function acaoResolverConflitoDocumento(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaEnvio<DadosDocumento>> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaConflito.safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "editar", { tipo: "documento" })) return { tipo: "erro", mensagem: SO_ADM };
  try {
    const { dados, ...resto } = validado.data;
    return await responder(await resolverConflitoDocumento({ ...resto, dados: dados as DadosDocumento }, { quem: pessoa.quem, sessaoEdicao: sessao.data }));
  } catch (erro) {
    return erroParaResposta(erro, "resolver o conflito");
  }
}

export type RespostaPublicarDocumento =
  | { tipo: "publicado"; revisaoPublicada: number; publicadoEm: string }
  | { tipo: "agendado"; para: string }
  | { tipo: "conflito" }
  | { tipo: "faltam"; campos: string[] }
  | { tipo: "erro"; mensagem: string; campo?: string };

function respostaDeErro(erro: unknown, contexto: string): RespostaPublicarDocumento {
  if (erro instanceof ErroFaltamCampos) return { tipo: "faltam", campos: erro.campos };
  return erroParaResposta(erro, contexto);
}

/** "Publicar documento" com a caixa de versão oficial marcada (CA-US23.1). */
export async function acaoPublicarDocumento(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaPublicarDocumento> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaPublicar.safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "publicar", { tipo: "documento" })) return { tipo: "erro", mensagem: SO_ADM };
  try {
    const r = await publicarDocumento(validado.data, { quem: pessoa.quem, sessaoEdicao: sessao.data });
    revalidatePath("/painel/conteudos");
    if (r.tipo === "conflito") return { tipo: "conflito" };
    return { tipo: "publicado", revisaoPublicada: r.revisaoPublicada, publicadoEm: r.publicadoEm.toISOString() };
  } catch (erro) {
    return respostaDeErro(erro, "publicar o documento");
  }
}

/** Agendar, também com a caixa de versão oficial marcada (E46). Data e hora no horário da Bahia (E44). */
export async function acaoAgendarDocumento(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaPublicarDocumento> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaPublicar.extend({ quando: esquemaQuando }).safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "agendar", { tipo: "documento" })) return { tipo: "erro", mensagem: SO_ADM };
  const para = bahiaParaUtc(validado.data.quando.data, validado.data.quando.hora);
  if (!para) return { tipo: "erro", mensagem: "Escolha uma data e hora válidas.", campo: "agendadoPara" };
  try {
    const { id, revisaoBase, confirmoOficial } = validado.data;
    const r = await agendarDocumento({ id, revisaoBase, confirmoOficial, para }, { quem: pessoa.quem, fila: await filaDoSistema(), sessaoEdicao: sessao.data });
    revalidatePath("/painel/conteudos");
    if (r.tipo === "conflito") return { tipo: "conflito" };
    return { tipo: "agendado", para: r.para.toISOString() };
  } catch (erro) {
    return respostaDeErro(erro, "agendar o documento");
  }
}

export type RespostaComDocumento =
  | { tipo: "pronto"; dados: DadosDocumento; revisao: number; salvoEm: string }
  | { tipo: "conflito" }
  | { tipo: "erro"; mensagem: string };

/** "Descartar alterações" (E42). */
export async function acaoDescartarAlteracoesDocumento(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaComDocumento> {
  const pessoa = await sessaoDaEquipe();
  const validado = z.object({ id: z.uuid(), revisaoBase: z.number().int().nonnegative() }).safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "editar", { tipo: "documento" })) return { tipo: "erro", mensagem: SO_ADM };
  try {
    const r = await descartarAlteracoesDocumento(validado.data, { quem: pessoa.quem, sessaoEdicao: sessao.data });
    if (r.tipo === "conflito") return { tipo: "conflito" };
    return { tipo: "pronto", dados: r.documento.dados, revisao: r.documento.revisao, salvoEm: r.documento.atualizadoEm.toISOString() };
  } catch (erro) {
    return erroParaResposta(erro, "descartar as alterações");
  }
}

/** "Restaurar como rascunho" no Histórico (E31). */
export async function acaoRestaurarVersaoDocumento(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaComDocumento> {
  const pessoa = await sessaoDaEquipe();
  const validado = z
    .object({ id: z.uuid(), versao: z.number().int().positive(), revisaoBase: z.number().int().nonnegative() })
    .safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "restaurar_versao", { tipo: "documento" })) return { tipo: "erro", mensagem: SO_ADM };
  try {
    const r = await restaurarVersaoDocumento(validado.data, { quem: pessoa.quem, sessaoEdicao: sessao.data });
    if (r.tipo === "conflito") return { tipo: "conflito" };
    return { tipo: "pronto", dados: r.documento.dados, revisao: r.documento.revisao, salvoEm: r.documento.atualizadoEm.toISOString() };
  } catch (erro) {
    return erroParaResposta(erro, "restaurar a versão");
  }
}

/** Versões publicadas para o painel Histórico (N14). */
export async function acaoListarVersoesDocumento(
  entrada: unknown,
): Promise<{ tipo: "versoes"; versoes: VersaoNaTela[] } | { tipo: "erro"; mensagem: string }> {
  const pessoa = await sessaoDaEquipe();
  const validado = z.object({ id: z.uuid() }).safeParse(entrada);
  if (!validado.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const versoes = await versoesDoDocumento(validado.data.id, { quem: pessoa.quem });
    return {
      tipo: "versoes",
      versoes: versoes.map(versaoNaTela),
    };
  } catch (erro) {
    return erroParaResposta(erro, "listar as versões");
  }
}
