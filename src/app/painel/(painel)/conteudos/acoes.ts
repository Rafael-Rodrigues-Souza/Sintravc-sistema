"use server";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { urlPublica } from "@/lib/armazenamento";
import { versaoDoServidor } from "@/lib/conteudos/carregar";
import { resolverConflitoNoticia } from "@/lib/conteudos/conflito";
import type { DadosNoticia } from "@/lib/conteudos/dados";
import { ErroConteudo } from "@/lib/conteudos/erros";
import type { RespostaEnvio } from "@/lib/conteudos/fila-rascunho";
import { salvarRascunhoNoticia, type ResultadoSalvar } from "@/lib/conteudos/salvar";
import { lerEnvArmazenamento } from "@/lib/env";
import { listarMidia } from "@/lib/midia/listar";
import { pode, SemPermissao } from "@/lib/permissoes";

const SEM_PERMISSAO = "Seu perfil não pode editar notícias.";
const FALHOU = "Não foi possível salvar agora. Suas alterações estão guardadas neste computador.";

async function responder(resultado: ResultadoSalvar): Promise<RespostaEnvio> {
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
export async function acaoSalvarRascunho(
  pedido: { id?: string; revisaoBase?: number; dados: DadosNoticia },
  sessaoEdicao: string,
): Promise<RespostaEnvio> {
  const pessoa = await sessaoDaEquipe();
  if (!pode(pessoa.quem, pedido.id ? "editar" : "criar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    return await responder(await salvarRascunhoNoticia(pedido, { quem: pessoa.quem, sessaoEdicao }));
  } catch (erro) {
    return erroParaResposta(erro, "salvar o rascunho");
  }
}

/** Escolha no modal "Há duas versões do rascunho" (N4). */
export async function acaoResolverConflito(
  entrada: { id: string; escolha: "minha" | "servidor"; revisaoServidor: number; dados: DadosNoticia },
  sessaoEdicao: string,
): Promise<RespostaEnvio> {
  const pessoa = await sessaoDaEquipe();
  if (!pode(pessoa.quem, "editar", { tipo: "noticia" })) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  try {
    return await responder(await resolverConflitoNoticia(entrada, { quem: pessoa.quem, sessaoEdicao }));
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
export async function acaoBuscarMidia(opcoes: {
  so: "imagens" | "todos";
  busca: string;
  pagina: number;
}): Promise<{ itens: ArquivoParaEscolher[]; total: number; porPagina: number } | { erro: string }> {
  const pessoa = await sessaoDaEquipe();
  if (!pode(pessoa.quem, "ver", { tipo: "midia" }) || !pode(pessoa.quem, "editar", { tipo: "noticia" })) {
    return { erro: "Seu perfil não pode usar a Mídia." };
  }
  const porPagina = 24;
  const env = lerEnvArmazenamento();
  const { itens, total } = await listarMidia({ filtro: opcoes.so, busca: opcoes.busca, pagina: opcoes.pagina, porPagina });
  return {
    total,
    porPagina,
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
