import { and, eq, inArray, sql } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { atividade, conteudo, conteudoLink, midiaUso, noticia } from "@/lib/db/schema";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { lerNoticia, retratoNoAr, type NoticiaAberta } from "./carregar";
import { rotuloDaNoticia, type DadosNoticia } from "./dados";
import { noticiaNaoEncontrada } from "./erros";
import { midiasDaNoticia, validarNoticia, type UrlDoArquivo } from "./validar";

export type DepsDoSalvamento = {
  quem: QuemDaEquipe;
  /** Uma por vez que o editor abre: a Atividade registra a edição uma vez por sessão (E40). */
  sessaoEdicao: string;
  /** Endereço público dos arquivos da Mídia (imagens do corpo). */
  urlDoArquivo: UrlDoArquivo;
};

export type ResultadoSalvar =
  | { tipo: "salvo"; id: string; revisao: number; salvoEm: Date }
  /** Alguém salvou depois da `revisaoBase`: nada foi gravado; a pessoa escolhe a versão (E02, N4). */
  | { tipo: "conflito"; servidor: NoticiaAberta };

/**
 * Salvamento do rascunho da notícia (RF38). Sem `id`, cria a notícia (E40: só no primeiro salvamento).
 * Com `id`, grava só se ninguém salvou depois da `revisaoBase`; senão devolve o conflito.
 */
export async function salvarRascunhoNoticia(
  entrada: { id?: string; revisaoBase?: number; dados: DadosNoticia },
  deps: DepsDoSalvamento,
): Promise<ResultadoSalvar> {
  const { id } = entrada;
  if (!id) {
    exigir(deps.quem, "criar", { tipo: "noticia" });
    return banco().transaction(async (tx) => {
      const criada = await criar(tx, await validarNoticia(tx, entrada.dados, deps.urlDoArquivo), deps.quem);
      await registrarAtividadeNoticia(tx, "noticia.criar", criada.id, entrada.dados.titulo, deps);
      return criada;
    });
  }
  exigir(deps.quem, "editar", { tipo: "noticia" });
  return banco().transaction(async (tx) => {
    // Trava a linha: dois salvamentos ao mesmo tempo não passam os dois pela conferência da revisão.
    const atual = await travarNoticia(tx, id);
    const dados = await validarNoticia(tx, entrada.dados, deps.urlDoArquivo);
    if (atual.revisao !== entrada.revisaoBase) {
      return { tipo: "conflito", servidor: (await lerNoticia(tx, id))! };
    }
    const salvo = await gravarPorCima(tx, id, dados, deps.quem);
    if (!(await sessaoJaRegistrada(tx, id, deps.sessaoEdicao))) {
      await registrarAtividadeNoticia(tx, "noticia.editar", id, dados.titulo, deps);
    }
    return salvo;
  });
}

/**
 * A Atividade recebe a edição uma vez por sessão do editor (E40): cada vez que alguém abre o
 * editor e salva. O salvamento automático seguinte, na mesma sessão, não repete o registro.
 */
async function sessaoJaRegistrada(tx: Transacao, id: string, sessao: string) {
  const [linha] = await tx
    .select({ id: atividade.id })
    .from(atividade)
    .where(
      and(
        eq(atividade.alvoId, id),
        inArray(atividade.acao, ["noticia.criar", "noticia.editar", "noticia.resolver_conflito"]),
        sql`${atividade.detalhe}->>'sessao' = ${sessao}`,
      ),
    )
    .limit(1);
  return !!linha;
}

export type AcaoDaNoticia =
  | "noticia.criar"
  | "noticia.editar"
  | "noticia.resolver_conflito"
  | "noticia.publicar"
  | "noticia.publicar_alteracoes"
  | "noticia.descartar_alteracoes";

export async function registrarAtividadeNoticia(
  tx: Transacao,
  acao: AcaoDaNoticia,
  id: string,
  titulo: string,
  deps: { quem: QuemDaEquipe; sessaoEdicao?: string },
  detalhe: Record<string, unknown> = {},
) {
  await registrarAtividade(tx, {
    ator: { tipo: "pessoa", id: deps.quem.id },
    acao,
    area: "conteudos",
    alvo: { tipo: "noticia", id, rotulo: rotuloDaNoticia(titulo) },
    detalhe: deps.sessaoEdicao ? { ...detalhe, sessao: deps.sessaoEdicao } : detalhe,
  });
}



/** Trava a linha da notícia até o fim da transação; erro claro se ela não existe mais. */
export async function travarNoticia(tx: Transacao, id: string) {
  const [atual] = await tx
    .select()
    .from(conteudo)
    .where(and(eq(conteudo.id, id), eq(conteudo.tipo, "noticia")))
    .for("update");
  if (!atual) throw noticiaNaoEncontrada();
  return atual;
}

/** Grava os dados sobre a notícia (já travada e conferida) e sobe a revisão. */
export async function gravarPorCima(tx: Transacao, id: string, dados: DadosNoticia, quem: QuemDaEquipe) {
  const [salvo] = await tx
    .update(conteudo)
    .set({
      titulo: dados.titulo,
      categoriaId: dados.categoriaId,
      atualizadoPor: quem.id,
      revisao: sql`${conteudo.revisao} + 1`,
    })
    .where(eq(conteudo.id, id))
    .returning();
  await tx.update(noticia).set(colunasDaNoticia(dados)).where(eq(noticia.conteudoId, id));
  await gravarLinksEUsos(tx, id, dados);
  return { tipo: "salvo" as const, id, revisao: salvo!.revisao, salvoEm: salvo!.atualizadoEm };
}

async function criar(tx: Transacao, dados: DadosNoticia, quem: QuemDaEquipe): Promise<Extract<ResultadoSalvar, { tipo: "salvo" }>> {
  const [criado] = await tx
    .insert(conteudo)
    .values({
      tipo: "noticia",
      titulo: dados.titulo,
      autorId: quem.id,
      atualizadoPor: quem.id,
      categoriaId: dados.categoriaId,
    })
    .returning();
  await tx.insert(noticia).values({ conteudoId: criado!.id, ...colunasDaNoticia(dados) });
  await gravarLinksEUsos(tx, criado!.id, dados);
  return { tipo: "salvo", id: criado!.id, revisao: criado!.revisao, salvoEm: criado!.atualizadoEm };
}

/**
 * Fontes e anexos são regravados a cada salvamento, na ordem da tela. A `midia_uso` acompanha:
 * capa, imagens do corpo e anexos (RN16: a Mídia só exclui arquivo sem uso).
 */
async function gravarLinksEUsos(tx: Transacao, id: string, dados: DadosNoticia) {
  await tx.delete(conteudoLink).where(eq(conteudoLink.conteudoId, id));
  if (dados.links.length > 0) {
    await tx.insert(conteudoLink).values(dados.links.map((link, ordem) => ({ conteudoId: id, ...link, ordem })));
  }
  await gravarUsos(tx, id, dados);
}

/**
 * Uso da Mídia pela notícia: o que está na cópia de trabalho mais o que está no ar (E42). Assim,
 * tirar uma imagem só da cópia de trabalho não deixa a Mídia apagar o que o site ainda mostra.
 */
export async function gravarUsos(tx: Transacao, id: string, dados: DadosNoticia) {
  const noAr = await retratoNoAr(tx, id);
  const usadas = [...new Set([...midiasDaNoticia(dados), ...(noAr ? midiasDaNoticia(noAr.dados) : [])])];
  await tx.delete(midiaUso).where(and(eq(midiaUso.donoTipo, "noticia"), eq(midiaUso.donoId, id)));
  if (usadas.length > 0) {
    await tx.insert(midiaUso).values(usadas.map((midiaId) => ({ midiaId, donoTipo: "noticia", donoId: id })));
  }
}

function colunasDaNoticia(dados: DadosNoticia) {
  return {
    linhaFina: dados.linhaFina,
    lide: dados.lide,
    corpo: dados.corpo,
    capaMidiaId: dados.capaMidiaId,
    capaAlt: dados.capaAlt,
    capaLegenda: dados.capaLegenda,
    assinatura: dados.assinatura,
    local: dados.local,
    palavrasChave: dados.palavrasChave,
  };
}
