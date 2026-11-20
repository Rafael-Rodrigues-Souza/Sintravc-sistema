"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import {
  cancelarAgendamentoDoComunicado,
  carregarComunicado,
  conteudosParaOLink,
  duplicarComunicado,
  encerrarComunicado,
  excluirComunicado,
  MAXIMO_NA_FILA,
  reordenarFila,
  salvarComunicado,
  type ResultadoSalvar,
} from "@/lib/comunicados/comunicados";
import { ErroComunicado, NOME_DO_TIPO, type LinkComunicado } from "@/lib/comunicados/regras";
import { bahiaEmCampos, bahiaParaUtc } from "@/lib/datas";
import { SemPermissao } from "@/lib/permissoes";
import { filaDoSistema } from "@/lib/tarefas";

export type Resposta<T = object> = ({ tipo: "ok" } & T) | { tipo: "erro"; mensagem: string; campo?: ErroComunicado["campo"] };

const CAMINHO = "/painel/comunicados";
const SEM_PERMISSAO = "Seu perfil não pode mexer em comunicados.";
const FALHOU = "Não foi possível concluir agora. Tente de novo em alguns minutos.";
const PEDIDO_INVALIDO = "A tela mandou dados incompletos. Atualize a página e tente de novo.";

const esquemaQuando = z.object({ data: z.string().max(10), hora: z.string().max(5) }).nullable();
const esquemaSalvar = z.object({
  id: z.uuid().optional(),
  modo: z.enum(["rascunho", "programar"]),
  mensagem: z.string().max(1000),
  link: z.union([z.object({ tipo: z.literal("conteudo"), id: z.uuid() }), z.object({ tipo: z.literal("url"), url: z.string().max(2000) }), z.null()]),
  inicio: esquemaQuando,
  fim: esquemaQuando,
});
const esquemaId = z.object({ id: z.uuid() });

export type PedidoSalvar = z.infer<typeof esquemaSalvar>;

function erroParaResposta(erro: unknown, contexto: string): { tipo: "erro"; mensagem: string; campo?: ErroComunicado["campo"] } {
  if (erro instanceof ErroComunicado) return { tipo: "erro", mensagem: erro.message, campo: erro.campo };
  if (erro instanceof SemPermissao) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  console.error(`[comunicados] Falha ao ${contexto}.`, erro);
  return { tipo: "erro", mensagem: FALHOU };
}

/** Data e hora da tela (horário da Bahia, RNF06) para UTC. Campo vazio vira null; inválido, erro no campo. */
function quando(valor: { data: string; hora: string } | null, campo: "inicio" | "fim"): Date | null {
  if (!valor || (!valor.data && !valor.hora)) return null;
  const data = bahiaParaUtc(valor.data, valor.hora || (campo === "fim" ? "23:59" : "08:00"));
  if (!data) throw new ErroComunicado("invalido", "Esta data não existe. Confira o dia e a hora.", campo);
  return data;
}

/** Cria ou salva (RF43, RN14). A permissão e as regras são conferidas no servidor (RNF01). */
export async function acaoSalvarComunicado(pedido: unknown): Promise<Resposta<ResultadoSalvar>> {
  const lido = esquemaSalvar.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    const { id, modo, mensagem, link } = lido.data;
    const dados = { mensagem, link: link as LinkComunicado, inicio: quando(lido.data.inicio, "inicio"), fim: quando(lido.data.fim, "fim") };
    const resultado = await salvarComunicado({ id, dados, modo }, { quem, fila: await filaDoSistema() });
    revalidatePath(CAMINHO);
    return { tipo: "ok", ...resultado };
  } catch (erro) {
    return erroParaResposta(erro, "salvar o comunicado");
  }
}

/** “Encerrar agora” (CA-US24.2): a confirmação já foi feita na tela. */
export async function acaoEncerrarComunicado(pedido: unknown): Promise<Resposta> {
  const lido = esquemaId.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    await encerrarComunicado(lido.data, { quem: (await sessaoDaEquipe()).quem });
    revalidatePath(CAMINHO);
    return { tipo: "ok" };
  } catch (erro) {
    return erroParaResposta(erro, "encerrar o comunicado");
  }
}

export async function acaoCancelarAgendamento(pedido: unknown): Promise<Resposta> {
  const lido = esquemaId.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    await cancelarAgendamentoDoComunicado(lido.data, { quem: (await sessaoDaEquipe()).quem });
    revalidatePath(CAMINHO);
    return { tipo: "ok" };
  } catch (erro) {
    return erroParaResposta(erro, "cancelar o agendamento do comunicado");
  }
}

export async function acaoDuplicarComunicado(pedido: unknown): Promise<Resposta<{ id: string }>> {
  const lido = esquemaId.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const copia = await duplicarComunicado(lido.data, { quem: (await sessaoDaEquipe()).quem });
    revalidatePath(CAMINHO);
    return { tipo: "ok", ...copia };
  } catch (erro) {
    return erroParaResposta(erro, "duplicar o comunicado");
  }
}

export async function acaoExcluirComunicado(pedido: unknown): Promise<Resposta> {
  const lido = esquemaId.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    await excluirComunicado(lido.data, { quem: (await sessaoDaEquipe()).quem });
    revalidatePath(CAMINHO);
    return { tipo: "ok" };
  } catch (erro) {
    return erroParaResposta(erro, "excluir o comunicado");
  }
}

/** A ordem nova da fila: todos os que estão no ar (RF43). */
export async function acaoReordenarFila(pedido: unknown): Promise<Resposta> {
  const lido = z.object({ ids: z.array(z.uuid()).min(1).max(MAXIMO_NA_FILA) }).safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    await reordenarFila(lido.data, { quem: (await sessaoDaEquipe()).quem });
    revalidatePath(CAMINHO);
    return { tipo: "ok" };
  } catch (erro) {
    return erroParaResposta(erro, "mudar a ordem da fila");
  }
}

export type ConteudoDoLink = { id: string; rotulo: string };

/** Busca as notícias, editais e acordos publicados para o “Saiba mais”. */
export async function acaoBuscarConteudos(busca: unknown): Promise<Resposta<{ itens: ConteudoDoLink[] }>> {
  const lido = z.string().max(200).safeParse(busca);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const itens = await conteudosParaOLink(lido.data, { quem: (await sessaoDaEquipe()).quem });
    return { tipo: "ok", itens: itens.map((c) => ({ id: c.id, rotulo: `${NOME_DO_TIPO[c.tipo]}: ${c.titulo}` })) };
  } catch (erro) {
    return erroParaResposta(erro, "buscar os conteúdos");
  }
}

export type ComunicadoNoFormulario = {
  id: string;
  mensagem: string;
  link: { tipo: "conteudo"; id: string; rotulo: string } | { tipo: "url"; url: string } | null;
  inicio: { data: string; hora: string } | null;
  fim: { data: string; hora: string } | null;
  situacao: "rascunho" | "agendado" | "no_ar" | "encerrado";
};

/** Um comunicado para o formulário de edição, com as datas no horário da Bahia. */
export async function acaoCarregarComunicado(pedido: unknown): Promise<Resposta<{ comunicado: ComunicadoNoFormulario }>> {
  const lido = esquemaId.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const c = await carregarComunicado(lido.data.id, { quem: (await sessaoDaEquipe()).quem });
    if (!c) return { tipo: "erro", mensagem: "Este comunicado não existe mais. Atualize a página." };
    return {
      tipo: "ok",
      comunicado: {
        id: c.id,
        mensagem: c.mensagem,
        link: c.link?.tipo === "conteudo" ? { ...c.link, rotulo: c.rotuloDoLink ?? "" } : c.link,
        inicio: c.inicio ? bahiaEmCampos(c.inicio) : null,
        fim: c.fim ? bahiaEmCampos(c.fim) : null,
        situacao: c.situacao,
      },
    };
  } catch (erro) {
    return erroParaResposta(erro, "abrir o comunicado");
  }
}
