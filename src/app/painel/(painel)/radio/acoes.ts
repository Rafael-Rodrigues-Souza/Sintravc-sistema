"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { urlPublica } from "@/lib/armazenamento";
import type { ProgramaAoVivo } from "@/lib/config-site";
import { bahiaEmCampos } from "@/lib/datas";
import { lerEnvArmazenamento } from "@/lib/env";
import {
  buscarVideo,
  carregarEpisodio,
  excluirEpisodio,
  marcarUltimoPrograma,
  salvarEpisodio,
  tirarDoSite,
  type ResultadoBusca,
  type ResultadoSalvar,
} from "@/lib/episodios/episodios";
import { ErroPrograma, gravarProgramaAoVivo } from "@/lib/episodios/gravar-programa";
import { ErroEpisodio, TRANSCRICAO_MAX, type CamposEpisodio, type Situacao } from "@/lib/episodios/regras";
import { SemPermissao } from "@/lib/permissoes";
import { revalidarSitePublico } from "@/lib/site/revalidar";
import { filaDoSistema } from "@/lib/tarefas";
import { textoDaDuracao } from "@/lib/youtube/duracao";
import { enderecoDoVideo } from "@/lib/youtube/link";
import { youtubeDoSistema } from "@/lib/youtube/youtube";

type Erro = { tipo: "erro"; mensagem: string; campo?: string };
export type Resposta<T = object> = ({ tipo: "ok" } & T) | Erro;

const CAMINHO = "/painel/radio";
const SEM_PERMISSAO = "Seu perfil não pode mexer no Rádio Chofer.";
const FALHOU = "Não foi possível concluir agora. Tente de novo em alguns minutos.";
const PEDIDO_INVALIDO = "A tela mandou dados incompletos. Atualize a página e tente de novo.";

const texto = (max: number) => z.string().max(max);
const esquemaCampos = z.object({
  link: texto(500),
  numero: texto(10),
  titulo: texto(500),
  duracao: texto(20),
  resumo: texto(1000),
  temaId: z.union([z.uuid(), z.literal("")]),
  data: texto(10),
  hora: texto(5),
  transcricao: texto(TRANSCRICAO_MAX + 1000),
  capaMidiaId: z.union([z.uuid(), z.literal("")]),
  ultimoPrograma: z.boolean(),
  tituloYoutube: texto(500),
  canalYoutube: texto(200),
});
const esquemaSalvar = z.object({ id: z.uuid().optional(), modo: z.enum(["rascunho", "programar"]), campos: esquemaCampos });
const esquemaId = z.object({ id: z.uuid() });
const esquemaBusca = z.object({ link: texto(500), episodioId: z.uuid().optional() });
const esquemaPrograma = z.object({
  ativo: z.boolean(),
  canal: z.string().max(500).nullable(),
  dias: z.array(z.number().int()).max(7),
  inicio: texto(5),
  fim: texto(5),
});

function erroParaResposta(erro: unknown, contexto: string): Erro {
  if (erro instanceof ErroEpisodio) return { tipo: "erro", mensagem: erro.message, campo: erro.campo };
  if (erro instanceof ErroPrograma) return { tipo: "erro", mensagem: erro.message, campo: erro.campo };
  if (erro instanceof SemPermissao) return { tipo: "erro", mensagem: SEM_PERMISSAO };
  console.error(`[radio] Falha ao ${contexto}.`, erro);
  return { tipo: "erro", mensagem: FALHOU };
}

/** O que muda no site: a lista do painel e a página pública. */
function revalidar() {
  revalidatePath(CAMINHO);
  revalidarSitePublico();
}

/** “Cole o link do vídeo” (CA-US25.1, CA-US25.2): título, canal e duração vêm do YouTube. */
export async function acaoBuscarVideo(pedido: unknown): Promise<Resposta<{ resultado: ResultadoBusca }>> {
  const lido = esquemaBusca.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    return { tipo: "ok", resultado: await buscarVideo(lido.data, { quem, youtube: youtubeDoSistema() }) };
  } catch (erro) {
    return erroParaResposta(erro, "buscar o vídeo");
  }
}

/** Cria ou salva (RF45, E61). Permissão e regras conferidas no servidor (RNF01). */
export async function acaoSalvarEpisodio(pedido: unknown): Promise<Resposta<ResultadoSalvar>> {
  const lido = esquemaSalvar.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    const resultado = await salvarEpisodio(lido.data, { quem, fila: await filaDoSistema() });
    revalidar();
    return { tipo: "ok", ...resultado };
  } catch (erro) {
    return erroParaResposta(erro, "salvar o episódio");
  }
}

export type EpisodioNoFormulario = {
  id: string;
  situacao: Situacao;
  campos: CamposEpisodio;
  /** A capa escolhida na Mídia (endereço público), ou null para a do YouTube. */
  capaDaMidiaUrl: string | null;
};

export async function acaoCarregarEpisodio(pedido: unknown): Promise<Resposta<{ episodio: EpisodioNoFormulario }>> {
  const lido = esquemaId.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    const e = await carregarEpisodio(lido.data, { quem });
    const quando = e.exibicaoEm ? bahiaEmCampos(e.exibicaoEm) : { data: "", hora: "" };
    return {
      tipo: "ok",
      episodio: {
        id: e.id,
        situacao: e.situacao,
        capaDaMidiaUrl: e.capaChave ? urlPublica(e.capaChave, lerEnvArmazenamento()) : null,
        campos: {
          link: enderecoDoVideo(e.youtubeId),
          numero: String(e.numero),
          titulo: e.titulo,
          duracao: e.duracaoSeg ? textoDaDuracao(e.duracaoSeg) : "",
          resumo: e.resumo ?? "",
          temaId: e.temaCategoriaId ?? "",
          data: quando.data,
          hora: quando.hora,
          transcricao: e.transcricao ?? "",
          capaMidiaId: e.capaMidiaId ?? "",
          ultimoPrograma: e.ultimoPrograma,
          tituloYoutube: e.tituloYoutube ?? "",
          canalYoutube: e.canalYoutube ?? "",
        },
      },
    };
  } catch (erro) {
    return erroParaResposta(erro, "abrir o episódio");
  }
}

async function acaoDoMenu(pedido: unknown, contexto: string, fazer: (id: string, quem: Awaited<ReturnType<typeof sessaoDaEquipe>>["quem"]) => Promise<void>): Promise<Resposta> {
  const lido = esquemaId.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    await fazer(lido.data.id, quem);
    revalidar();
    return { tipo: "ok" };
  } catch (erro) {
    return erroParaResposta(erro, contexto);
  }
}

/** “Marcar como último programa” (R12). */
export async function acaoMarcarUltimoPrograma(pedido: unknown): Promise<Resposta> {
  return acaoDoMenu(pedido, "marcar o último programa", (id, quem) => marcarUltimoPrograma({ id }, { quem }));
}

/** “Tirar do site” (E61): a confirmação já foi feita na tela. */
export async function acaoTirarDoSite(pedido: unknown): Promise<Resposta> {
  return acaoDoMenu(pedido, "tirar o episódio do site", (id, quem) => tirarDoSite({ id }, { quem }));
}

/** “Excluir” o rascunho que nunca foi ao ar: a confirmação já foi feita na tela. */
export async function acaoExcluirEpisodio(pedido: unknown): Promise<Resposta> {
  return acaoDoMenu(pedido, "excluir o episódio", (id, quem) => excluirEpisodio({ id }, { quem }));
}

/** Programa ao vivo (E61, P10): o interruptor e o diálogo “Programa ao vivo”. */
export async function acaoGravarPrograma(pedido: unknown): Promise<Resposta> {
  const lido = esquemaPrograma.safeParse(pedido);
  if (!lido.success) return { tipo: "erro", mensagem: PEDIDO_INVALIDO };
  try {
    const { quem } = await sessaoDaEquipe();
    // “youtube.com/@sintravc” sem o https:// também vale.
    const digitado = lido.data.canal?.trim() ?? "";
    const canal = !digitado ? null : /^https?:\/\//i.test(digitado) ? digitado : `https://${digitado}`;
    await gravarProgramaAoVivo({ ...lido.data, canal } as ProgramaAoVivo, { quem });
    revalidar();
    return { tipo: "ok" };
  } catch (erro) {
    return erroParaResposta(erro, "salvar o programa ao vivo");
  }
}
