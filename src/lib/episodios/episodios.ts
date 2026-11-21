import { and, asc, count, desc, eq, max, ne, sql } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { categoria, episodio, midia, midiaUso } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";
import type { Fila } from "@/lib/tarefas/fila";
import { idDoYoutube } from "@/lib/youtube/link";
import type { Youtube } from "@/lib/youtube/youtube";

import { registrar } from "./comum";
import {
  conferirCampos,
  episodioNaoEncontrado,
  ErroEpisodio,
  MENSAGEM_LINK_INVALIDO,
  rotuloDoEpisodio,
  situacaoDo,
  type CamposEpisodio,
  type DadosEpisodio,
  type ModoDeSalvar,
  type Situacao,
} from "./regras";

export type LinhaEpisodio = typeof episodio.$inferSelect;

export type Deps = {
  quem: QuemDaEquipe;
  /** Relógio (os testes passam um fixo). */
  agora?: Date;
};
export type DepsComFila = Deps & { fila: Fila };

const RECURSO = { tipo: "radio" } as const;
const iso = (d: Date | null) => d?.toISOString() ?? null;

// --- Peças internas -------------------------------------------------------------------------

async function travar(tx: Transacao, id: string): Promise<LinhaEpisodio> {
  const [atual] = await tx.select().from(episodio).where(eq(episodio.id, id)).for("update");
  if (!atual) throw episodioNaoEncontrado();
  return atual;
}

/**
 * Serializa quem mexe no “Último programa” (R12): o índice único parcial garante um só no banco, e o
 * lock faz a segunda marcação esperar a primeira e substituir, em vez de falhar.
 */
async function travarUltimoPrograma(tx: Transacao) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('episodio.ultimo_programa'))`);
}

/** Desmarca o último programa atual (se for outro) e devolve qual era, para a Atividade. */
async function desmarcarOutro(tx: Transacao, id: string | null): Promise<{ id: string; numero: number; titulo: string } | null> {
  await travarUltimoPrograma(tx);
  const [anterior] = await tx
    .select({ id: episodio.id, numero: episodio.numero, titulo: episodio.titulo })
    .from(episodio)
    .where(id ? and(eq(episodio.ultimoPrograma, true), ne(episodio.id, id)) : eq(episodio.ultimoPrograma, true));
  if (!anterior) return null;
  await tx.update(episodio).set({ ultimoPrograma: false }).where(eq(episodio.id, anterior.id));
  return anterior;
}

/** Número e vídeo são únicos (E61). Confere antes, para dizer em qual episódio está. */
async function conferirUnicos(tx: Transacao, dados: DadosEpisodio, id: string | null) {
  const outro = (cond: ReturnType<typeof eq>) =>
    tx
      .select({ numero: episodio.numero })
      .from(episodio)
      .where(id ? and(cond, ne(episodio.id, id)) : cond)
      .limit(1);
  const [mesmoNumero] = await outro(eq(episodio.numero, dados.numero));
  if (mesmoNumero) throw new ErroEpisodio("invalido", `Já existe o Ep. ${dados.numero}. Use outro número.`, "numero");
  const [mesmoVideo] = await outro(eq(episodio.youtubeId, dados.youtubeId));
  if (mesmoVideo) throw new ErroEpisodio("invalido", `Esse vídeo já está no Ep. ${mesmoVideo.numero}.`, "link");
}

/** O tema tem de ser uma categoria com o escopo Rádio Chofer (E15). */
async function conferirTema(tx: Transacao, temaId: string | null) {
  if (!temaId) return;
  const [tema] = await tx
    .select({ id: categoria.id })
    .from(categoria)
    .where(and(eq(categoria.id, temaId), sql`'radio' = any(${categoria.escopos})`));
  if (!tema) throw new ErroEpisodio("invalido", "Escolha um tema da lista.", "tema");
}

/** A capa trocada tem de ser uma imagem da Mídia (E61). */
async function conferirCapa(tx: Transacao, capaMidiaId: string | null) {
  if (!capaMidiaId) return;
  const [arquivo] = await tx.select({ tipo: midia.tipo }).from(midia).where(eq(midia.id, capaMidiaId));
  if (arquivo?.tipo !== "imagem") throw new ErroEpisodio("invalido", "Escolha uma imagem da Mídia para a capa.", "capa");
}

/** Mantém o MidiaUso da capa (RN16): enquanto for a capa, a imagem não pode ser excluída. */
async function gravarUsoDaCapa(tx: Transacao, id: string, capaMidiaId: string | null) {
  await tx.delete(midiaUso).where(and(eq(midiaUso.donoTipo, "episodio"), eq(midiaUso.donoId, id)));
  if (capaMidiaId) await tx.insert(midiaUso).values({ midiaId: capaMidiaId, donoTipo: "episodio", donoId: id });
}

/** Erro de chave única que escapou da conferência (duas pessoas ao mesmo tempo). */
function traduzirUnico(erro: unknown): never {
  const causa = (erro as { cause?: { code?: string; constraint_name?: string } }).cause ?? (erro as { code?: string; constraint_name?: string });
  if (causa?.code === "23505") {
    if (causa.constraint_name?.includes("numero")) throw new ErroEpisodio("invalido", "Esse número acabou de ser usado. Use outro.", "numero");
    if (causa.constraint_name?.toLowerCase().includes("youtube")) {
      throw new ErroEpisodio("invalido", "Esse vídeo acabou de ser cadastrado em outro episódio.", "link");
    }
  }
  throw erro;
}

// --- Buscar o vídeo ---------------------------------------------------------------------------

export type ResultadoBusca =
  | {
      tipo: "ok";
      youtubeId: string;
      titulo: string;
      canal: string | null;
      duracaoSeg: number | null;
    }
  | { tipo: "fora_do_ar"; youtubeId: string };

/**
 * “Cole o link do vídeo” (CA-US25.1, CA-US25.2). Confere o link, avisa se o vídeo já está em outro
 * episódio e busca título, canal e duração no YouTube. Fora do ar, a pessoa preenche à mão.
 */
export async function buscarVideo(
  entrada: { link: string; episodioId?: string },
  deps: Deps & { youtube: Youtube },
): Promise<ResultadoBusca> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const youtubeId = idDoYoutube(entrada.link);
  if (!youtubeId) throw new ErroEpisodio("invalido", MENSAGEM_LINK_INVALIDO, "link");

  const cond = eq(episodio.youtubeId, youtubeId);
  const [jaUsado] = await banco()
    .select({ numero: episodio.numero })
    .from(episodio)
    .where(entrada.episodioId ? and(cond, ne(episodio.id, entrada.episodioId)) : cond)
    .limit(1);
  if (jaUsado) throw new ErroEpisodio("invalido", `Esse vídeo já está no Ep. ${jaUsado.numero}.`, "link");

  const busca = await deps.youtube.buscarVideo(youtubeId);
  if (busca.tipo === "nao_encontrado") {
    throw new ErroEpisodio(
      "invalido",
      "Não encontramos esse vídeo. Ele pode ser privado, ter sido apagado ou não permitir ser mostrado em outros sites.",
      "link",
    );
  }
  if (busca.tipo === "fora_do_ar") return { tipo: "fora_do_ar", youtubeId };
  return { tipo: "ok", youtubeId, titulo: busca.video.titulo, canal: busca.video.canal, duracaoSeg: busca.video.duracaoSeg };
}

/** O número sugerido para o episódio novo: o maior + 1. */
export async function proximoNumero(deps: Deps): Promise<number> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const [linha] = await banco().select({ maior: max(episodio.numero) }).from(episodio);
  return (linha?.maior ?? 0) + 1;
}

// --- Salvar ---------------------------------------------------------------------------------

export type ResultadoSalvar = { id: string; situacao: Situacao };

/**
 * Cria ou salva um episódio (RF45, E61).
 * - `rascunho`: fica fora do site; um agendado que volta a rascunho sai da agenda.
 * - `programar`: com a exibição no futuro, fica Agendado (a T03 acerta o estado na hora); agora ou
 *   antes, vai ao ar na hora. Editar um episódio no ar vale na hora (não há versões).
 * No ar, “Salvar rascunho” não vale: use “Tirar do site”.
 */
export async function salvarEpisodio(
  entrada: { id?: string; campos: CamposEpisodio; modo: ModoDeSalvar },
  deps: DepsComFila,
): Promise<ResultadoSalvar> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const agora = deps.agora ?? new Date();
  const conferencia = conferirCampos(entrada.campos, entrada.modo);
  if (!conferencia.ok) throw new ErroEpisodio("invalido", conferencia.mensagem, conferencia.campo);
  const dados = conferencia.dados;

  try {
    return await banco().transaction(async (tx) => {
      const atual = entrada.id ? await travar(tx, entrada.id) : null;
      const situacaoAntes = atual ? situacaoDo(atual, agora) : "rascunho";
      if (situacaoAntes === "no_ar" && entrada.modo === "rascunho") {
        throw new ErroEpisodio("invalido", "Este episódio está no site. Para tirar do site, use “Tirar do site” no menu.");
      }

      await conferirUnicos(tx, dados, atual?.id ?? null);
      await conferirTema(tx, dados.temaId);
      await conferirCapa(tx, dados.capaMidiaId);

      let estado: LinhaEpisodio["estado"] = "rascunho";
      let situacao: Situacao = "rascunho";
      if (entrada.modo === "programar") {
        const noAr = dados.exibicaoEm!.getTime() <= agora.getTime();
        estado = noAr ? "publicado" : "agendado";
        situacao = noAr ? "no_ar" : "agendado";
      }
      const vaiAoArAgora = situacao === "no_ar" && situacaoAntes !== "no_ar";

      if (dados.ultimoPrograma !== (atual?.ultimoPrograma ?? false)) await travarUltimoPrograma(tx);
      const anterior =
        dados.ultimoPrograma && !atual?.ultimoPrograma ? await desmarcarOutro(tx, atual?.id ?? null) : null;

      const valores = {
        numero: dados.numero,
        youtubeId: dados.youtubeId,
        titulo: dados.titulo,
        tituloYoutube: dados.tituloYoutube,
        canalYoutube: dados.canalYoutube,
        resumo: dados.resumo,
        temaCategoriaId: dados.temaId,
        exibicaoEm: dados.exibicaoEm,
        duracaoSeg: dados.duracaoSeg,
        capaMidiaId: dados.capaMidiaId,
        transcricao: dados.transcricao,
        ultimoPrograma: dados.ultimoPrograma,
        estado,
        atualizadoPor: deps.quem.id,
        // No ar pelo relógio, mesmo que a T03 ainda não tenha rodado: conta como já publicado (RN54).
        ...(situacao === "no_ar" && !atual?.jaPublicado
          ? { publicadoEm: situacaoAntes === "no_ar" ? atual!.exibicaoEm : agora, jaPublicado: true }
          : {}),
      };

      let id: string;
      if (!atual) {
        const [novo] = await tx
          .insert(episodio)
          .values({ ...valores, criadoPor: deps.quem.id })
          .returning({ id: episodio.id });
        id = novo!.id;
        await registrar(tx, deps.quem, { id, ...dados }, "criar", { situacao });
      } else {
        id = atual.id;
        await tx.update(episodio).set(valores).where(eq(episodio.id, id));
        const mudou = mudancas(atual, dados);
        if (Object.keys(mudou).length > 0) await registrar(tx, deps.quem, { id, ...dados }, "editar", mudou);
      }
      await gravarUsoDaCapa(tx, id, dados.capaMidiaId);

      const alvo = { id, numero: dados.numero, titulo: dados.titulo };
      if (vaiAoArAgora) await registrar(tx, deps.quem, alvo, "publicar", { exibicao_em: iso(dados.exibicaoEm) });
      else if (situacao === "agendado" && situacaoAntes !== "agendado") {
        await registrar(tx, deps.quem, alvo, "agendar", { exibicao_em: iso(dados.exibicaoEm) });
      } else if (situacao === "rascunho" && situacaoAntes === "agendado") {
        await registrar(tx, deps.quem, alvo, "cancelar_agendamento", { exibicao_em: iso(atual!.exibicaoEm) });
      }
      if (dados.ultimoPrograma && !atual?.ultimoPrograma) {
        await registrar(tx, deps.quem, alvo, "marcar_ultimo", {
          anterior: anterior ? rotuloDoEpisodio(anterior.numero, anterior.titulo) : null,
        });
      }

      if (situacao === "agendado") await deps.fila.agendarEpisodio(tx, { episodioId: id, para: dados.exibicaoEm! });
      return { id, situacao };
    });
  } catch (erro) {
    traduzirUnico(erro);
  }
}

/** O que mudou, para a Atividade (só os campos alterados; a transcrição, só se mudou e o tamanho). */
function mudancas(atual: LinhaEpisodio, novo: DadosEpisodio): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  const comparar = (nome: string, de: unknown, para: unknown) => {
    if (de !== para) saida[nome] = { de, para };
  };
  comparar("numero", atual.numero, novo.numero);
  comparar("youtube_id", atual.youtubeId, novo.youtubeId);
  comparar("titulo", atual.titulo, novo.titulo);
  comparar("resumo", atual.resumo, novo.resumo);
  comparar("tema", atual.temaCategoriaId, novo.temaId);
  comparar("exibicao_em", iso(atual.exibicaoEm), iso(novo.exibicaoEm));
  comparar("duracao_seg", atual.duracaoSeg, novo.duracaoSeg);
  comparar("capa_midia_id", atual.capaMidiaId, novo.capaMidiaId);
  if (atual.transcricao !== novo.transcricao) {
    saida.transcricao = { de_caracteres: atual.transcricao?.length ?? 0, para_caracteres: novo.transcricao?.length ?? 0 };
  }
  return saida;
}

// --- Ações do menu ----------------------------------------------------------------------------

/** “Marcar como último programa” (R12): substitui o anterior. */
export async function marcarUltimoPrograma(entrada: { id: string }, deps: Deps): Promise<void> {
  exigir(deps.quem, "gerenciar", RECURSO);
  await banco().transaction(async (tx) => {
    const atual = await travar(tx, entrada.id);
    if (atual.ultimoPrograma) return;
    const anterior = await desmarcarOutro(tx, atual.id);
    await tx.update(episodio).set({ ultimoPrograma: true, atualizadoPor: deps.quem.id }).where(eq(episodio.id, atual.id));
    await registrar(tx, deps.quem, atual, "marcar_ultimo", {
      anterior: anterior ? rotuloDoEpisodio(anterior.numero, anterior.titulo) : null,
    });
  });
}

/**
 * “Tirar do site” (E61): o agendado ou publicado volta a rascunho e sai do site. Se era o último
 * programa, a marca sai e o topo do site passa a mostrar o mais recente no ar.
 */
export async function tirarDoSite(entrada: { id: string }, deps: Deps): Promise<void> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const agora = deps.agora ?? new Date();
  await banco().transaction(async (tx) => {
    const atual = await travar(tx, entrada.id);
    const situacao = situacaoDo(atual, agora);
    if (situacao === "rascunho") throw new ErroEpisodio("invalido", "Este episódio já está fora do site. Atualize a página.");
    if (atual.ultimoPrograma) await travarUltimoPrograma(tx);
    await tx
      .update(episodio)
      .set({
        estado: "rascunho",
        ultimoPrograma: false,
        atualizadoPor: deps.quem.id,
        // Esteve no ar pelo relógio (mesmo com a T03 atrasada): não pode mais ser excluído (RN54).
        ...(situacao === "no_ar" && !atual.jaPublicado ? { jaPublicado: true, publicadoEm: atual.exibicaoEm } : {}),
      })
      .where(eq(episodio.id, atual.id));
    await registrar(tx, deps.quem, atual, "tirar_do_site", { situacao_antes: situacao, era_ultimo_programa: atual.ultimoPrograma });
  });
}

/** “Excluir”: só o rascunho que nunca foi ao ar (como a RN54). A confirmação é da tela. */
export async function excluirEpisodio(entrada: { id: string }, deps: Deps): Promise<void> {
  exigir(deps.quem, "gerenciar", RECURSO);
  await banco().transaction(async (tx) => {
    const atual = await travar(tx, entrada.id);
    if (atual.estado !== "rascunho" || atual.jaPublicado) {
      throw new ErroEpisodio("invalido", "Só dá para excluir o rascunho que nunca foi ao ar. Use “Tirar do site”.");
    }
    await tx.delete(midiaUso).where(and(eq(midiaUso.donoTipo, "episodio"), eq(midiaUso.donoId, atual.id)));
    await tx.delete(episodio).where(eq(episodio.id, atual.id));
    await registrar(tx, deps.quem, atual, "excluir", { youtube_id: atual.youtubeId });
  });
}

// --- Leituras do painel -------------------------------------------------------------------------

export type EpisodioDoPainel = {
  id: string;
  numero: number;
  titulo: string;
  youtubeId: string;
  exibicaoEm: Date | null;
  duracaoSeg: number | null;
  ultimoPrograma: boolean;
  situacao: Situacao;
  jaPublicado: boolean;
  temaNome: string | null;
  capaChave: string | null;
};

/**
 * Lista do painel (166:17373): todos os episódios, do mais novo ao mais antigo pela exibição; o
 * rascunho sem exibição vem antes, pela data de criação.
 */
export async function listarEpisodios(
  entrada: { pagina: number; porPagina: number },
  deps: Deps,
): Promise<{ itens: EpisodioDoPainel[]; total: number }> {
  exigir(deps.quem, "ver", RECURSO);
  const agora = deps.agora ?? new Date();
  const [linhas, [contagem]] = await Promise.all([
    banco()
      .select({
        id: episodio.id,
        numero: episodio.numero,
        titulo: episodio.titulo,
        youtubeId: episodio.youtubeId,
        exibicaoEm: episodio.exibicaoEm,
        duracaoSeg: episodio.duracaoSeg,
        ultimoPrograma: episodio.ultimoPrograma,
        estado: episodio.estado,
        jaPublicado: episodio.jaPublicado,
        temaNome: categoria.nome,
        capaChave: midia.chaveR2,
      })
      .from(episodio)
      .leftJoin(categoria, eq(categoria.id, episodio.temaCategoriaId))
      .leftJoin(midia, eq(midia.id, episodio.capaMidiaId))
      .orderBy(sql`${episodio.exibicaoEm} DESC NULLS FIRST`, desc(episodio.criadoEm), desc(episodio.numero))
      .limit(entrada.porPagina)
      .offset((entrada.pagina - 1) * entrada.porPagina),
    banco().select({ total: count() }).from(episodio),
  ]);
  return {
    itens: linhas.map(({ estado, ...l }) => ({ ...l, situacao: situacaoDo({ estado, exibicaoEm: l.exibicaoEm }, agora) })),
    total: contagem?.total ?? 0,
  };
}

export type EpisodioParaEditar = LinhaEpisodio & { situacao: Situacao; capaChave: string | null };

export async function carregarEpisodio(entrada: { id: string }, deps: Deps): Promise<EpisodioParaEditar> {
  exigir(deps.quem, "gerenciar", RECURSO);
  const agora = deps.agora ?? new Date();
  const [linha] = await banco()
    .select({ e: episodio, capaChave: midia.chaveR2 })
    .from(episodio)
    .leftJoin(midia, eq(midia.id, episodio.capaMidiaId))
    .where(eq(episodio.id, entrada.id));
  if (!linha) throw episodioNaoEncontrado();
  return { ...linha.e, capaChave: linha.capaChave, situacao: situacaoDo(linha.e, agora) };
}

/** O episódio marcado como último programa, para o aviso do modal (“Substitui o Ep. 42…”). */
export async function ultimoProgramaMarcado(deps: Deps): Promise<{ id: string; numero: number } | null> {
  exigir(deps.quem, "ver", RECURSO);
  const [linha] = await banco()
    .select({ id: episodio.id, numero: episodio.numero })
    .from(episodio)
    .where(eq(episodio.ultimoPrograma, true));
  return linha ?? null;
}

/** Temas que o modal oferece: categorias com o escopo Rádio Chofer (E15), na ordem do ADM. */
export async function temasDoRadio(deps: Deps): Promise<{ id: string; nome: string }[]> {
  exigir(deps.quem, "gerenciar", RECURSO);
  return banco()
    .select({ id: categoria.id, nome: categoria.nome })
    .from(categoria)
    .where(sql`'radio' = any(${categoria.escopos})`)
    .orderBy(asc(categoria.ordem), asc(categoria.nome));
}
