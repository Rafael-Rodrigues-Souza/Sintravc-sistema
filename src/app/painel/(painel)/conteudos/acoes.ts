"use server";

import { z } from "zod";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { urlPublica } from "@/lib/armazenamento";
import { versaoDoServidor } from "@/lib/conteudos/carregar";
import { resolverConflitoNoticia } from "@/lib/conteudos/conflito";
import type { DadosNoticia } from "@/lib/conteudos/dados";
import { ErroConteudo } from "@/lib/conteudos/erros";
import type { CampoObrigatorio } from "@/lib/conteudos/obrigatorios";
import type { RespostaEnvio } from "@/lib/conteudos/fila-rascunho";
import { descartarAlteracoes, ErroFaltamCampos, publicarNoticia } from "@/lib/conteudos/publicar";
import { salvarRascunhoNoticia, type ResultadoSalvar } from "@/lib/conteudos/salvar";
import { lerEnvArmazenamento } from "@/lib/env";
import { listarMidia } from "@/lib/midia/listar";
import { pode, SemPermissao } from "@/lib/permissoes";

const SEM_PERMISSAO = "Seu perfil não pode editar notícias.";
// As mensagens dizem o que aconteceu; o editor acrescenta, uma vez, que a cópia está guardada no computador.
const FALHOU = "Não foi possível salvar agora. Tente de novo em alguns minutos.";
const PEDIDO_INVALIDO = "Não foi possível salvar: a tela mandou dados incompletos. Atualize a página.";

/** Quantos arquivos o seletor do editor mostra por vez ("Carregar mais" traz os próximos). */
const ARQUIVOS_POR_VEZ_NO_SELETOR = 24;

/** O que vem do navegador não é confiável: o formato é conferido aqui; os dados, no domínio (validarNoticia). */
const dadosQuaisquer = z.custom<DadosNoticia>((valor) => typeof valor === "object" && valor !== null);
const esquemaSessao = z.uuid();
const esquemaPedido = z.object({
  id: z.uuid().optional(),
  revisaoBase: z.number().int().nonnegative().optional(),
  dados: dadosQuaisquer,
});
const esquemaConflito = z.object({
  id: z.uuid(),
  escolha: z.enum(["minha", "servidor"]),
  revisaoServidor: z.number().int().nonnegative(),
  dados: dadosQuaisquer,
});
const esquemaBusca = z.object({
  so: z.enum(["imagens", "todos"]),
  busca: z.string().max(200),
  pagina: z.number().int().min(1).max(1000),
});

function urlDoArquivo(chaveR2: string) {
  return urlPublica(chaveR2, lerEnvArmazenamento());
}

function responder(resultado: ResultadoSalvar): RespostaEnvio {
  if (resultado.tipo === "conflito") return { tipo: "conflito", servidor: versaoDoServidor(resultado.servidor) };
  // Sem revalidatePath: ele faria a tela do editor ser buscada de novo a cada salvamento e montada
  // outra vez (perdendo o desfazer). A lista de Conteúdos é dinâmica e já lê o banco a cada visita.
  return { tipo: "salvo", id: resultado.id, revisao: resultado.revisao, salvoEm: resultado.salvoEm.toISOString() };
}

function erroParaResposta(erro: unknown, contexto: string): RespostaEnvio {
  if (erro instanceof ErroConteudo) return { tipo: "erro", mensagem: erro.message, campo: erro.campo };
  if (erro instanceof SemPermissao) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  console.error(`[conteudos] Falha ao ${contexto}.`, erro);
  return { tipo: "erro", mensagem: FALHOU };
}

/** Salvamento automático do rascunho (RF38). A permissão é conferida no servidor (RNF01). */
export async function acaoSalvarRascunho(pedido: unknown, sessaoEdicao: unknown): Promise<RespostaEnvio> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaPedido.safeParse(pedido);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, validado.data.id ? "editar" : "criar", { tipo: "noticia" })) {
    return { tipo: "erro", mensagem: SEM_PERMISSAO };
  }
  try {
    return responder(
      await salvarRascunhoNoticia(validado.data, { quem: pessoa.quem, sessaoEdicao: sessao.data, urlDoArquivo }),
    );
  } catch (erro) {
    return erroParaResposta(erro, "salvar o rascunho");
  }
}

/** Escolha no modal "Há duas versões do rascunho" (N4). */
export async function acaoResolverConflito(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaEnvio> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaConflito.safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "editar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    return responder(
      await resolverConflitoNoticia(validado.data, { quem: pessoa.quem, sessaoEdicao: sessao.data, urlDoArquivo }),
    );
  } catch (erro) {
    return erroParaResposta(erro, "resolver o conflito");
  }
}

export type ArquivoParaEscolher = {
  id: string;
  url: string;
  nomeArquivo: string;
  tipo: "imagem" | "pdf" | "documento";
  alt: string;
  legenda: string;
};

/** Arquivos da Mídia para o seletor do editor (capa, imagem no corpo, anexo). */
export async function acaoBuscarMidia(
  opcoes: unknown,
): Promise<{ itens: ArquivoParaEscolher[]; total: number } | { erro: string }> {
  const pessoa = await sessaoDaEquipe();
  if (!pode(pessoa.quem, "ver", { tipo: "midia" }) || !pode(pessoa.quem, "editar", { tipo: "noticia" })) {
    return { erro: "Seu perfil não pode usar a Mídia." };
  }
  const validado = esquemaBusca.safeParse(opcoes);
  if (!validado.success) return { erro: "Busca inválida. Atualize a página e tente de novo." };
  const { so, busca, pagina } = validado.data;
  const env = lerEnvArmazenamento();
  const { itens, total } = await listarMidia({ filtro: so, busca, pagina, porPagina: ARQUIVOS_POR_VEZ_NO_SELETOR });
  return {
    total,
    itens: itens.map((item) => ({
      id: item.id,
      url: urlPublica(item.chaveR2, env),
      nomeArquivo: item.nomeArquivo,
      tipo: item.tipo,
      alt: item.alt ?? "",
      legenda: item.legenda ?? "",
    })),
  };
}

/** Publicar e descartar: a notícia e a revisão que a pessoa está vendo. */
const esquemaRevisao = z.object({ id: z.uuid(), revisaoBase: z.number().int().nonnegative() });

export type RespostaPublicar =
  | { tipo: "publicada"; versao: number; revisaoPublicada: number; publicadoEm: string }
  /** Alguém salvou depois do que a pessoa está vendo: o editor mostra o modal de conflito (N4). */
  | { tipo: "conflito" }
  /** Faltam obrigatórios (CA-US21.3): o editor indica cada campo. */
  | { tipo: "faltam"; campos: CampoObrigatorio[] }
  | { tipo: "erro"; mensagem: string };

/** "Publicar agora" e "Publicar alterações" (RF39, E42). A permissão é conferida no servidor (RNF01). */
export async function acaoPublicarNoticia(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaPublicar> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaRevisao.safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "publicar", { tipo: "noticia" })) return { tipo: "erro", mensagem: "Seu perfil não pode publicar notícias." };
  try {
    const r = await publicarNoticia(validado.data, { quem: pessoa.quem, sessaoEdicao: sessao.data });
    if (r.tipo === "conflito") return { tipo: "conflito" };
    return { tipo: "publicada", versao: r.versao, revisaoPublicada: r.revisaoPublicada, publicadoEm: r.publicadoEm.toISOString() };
  } catch (erro) {
    if (erro instanceof ErroFaltamCampos) return { tipo: "faltam", campos: erro.campos };
    if (erro instanceof ErroConteudo) return { tipo: "erro", mensagem: erro.message };
    console.error("[conteudos] Falha ao publicar.", erro);
    return { tipo: "erro", mensagem: "Não foi possível publicar agora. Tente de novo em alguns minutos." };
  }
}

export type RespostaDescartar =
  | { tipo: "descartada"; revisao: number; salvoEm: string; dados: DadosNoticia }
  | { tipo: "conflito" }
  | { tipo: "erro"; mensagem: string };

/** "Descartar alterações" de uma notícia publicada (E42). */
export async function acaoDescartarAlteracoes(entrada: unknown, sessaoEdicao: unknown): Promise<RespostaDescartar> {
  const pessoa = await sessaoDaEquipe();
  const validado = esquemaRevisao.safeParse(entrada);
  const sessao = esquemaSessao.safeParse(sessaoEdicao);
  if (!validado.success || !sessao.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  if (!pode(pessoa.quem, "editar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    const r = await descartarAlteracoes(validado.data, { quem: pessoa.quem, sessaoEdicao: sessao.data });
    if (r.tipo === "conflito") return { tipo: "conflito" };
    return { tipo: "descartada", revisao: r.noticia.revisao, salvoEm: r.noticia.atualizadoEm.toISOString(), dados: r.noticia.dados };
  } catch (erro) {
    if (erro instanceof ErroConteudo) return { tipo: "erro", mensagem: erro.message };
    console.error("[conteudos] Falha ao descartar as alterações.", erro);
    return { tipo: "erro", mensagem: "Não foi possível descartar agora. Tente de novo em alguns minutos." };
  }
}
