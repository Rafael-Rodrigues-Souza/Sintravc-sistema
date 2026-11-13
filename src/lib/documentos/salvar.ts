import { and, eq, inArray, sql } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { atividade, conteudo, documento, midiaUso } from "@/lib/db/schema";
import {
  conteudoArquivado,
  registrarAtividadeConteudo,
  travarConteudo,
} from "@/lib/conteudos/tipo-do-conteudo";
import { ErroConteudo } from "@/lib/conteudos/erros";
import { mesmosDados } from "@/lib/conteudos/publicacao";
import { acompanharVersaoNoAr } from "@/lib/conteudos/versao-no-ar";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { lerDocumento, retratoDoDocumento, type DocumentoAberto, type RetratoDoDocumento } from "./carregar";
import { normalizarNumero } from "./conferir";
import { instanteDoEvento, type DadosDocumento, type TipoDocumento } from "./dados";
import { numeroRepetido, validarDocumento } from "./validar";

export type DepsDoSalvamentoDocumento = {
  quem: QuemDaEquipe;
  /** Uma por vez que o editor abre: a Atividade registra a edição uma vez por sessão (E40). */
  sessaoEdicao: string;
};

export type ResultadoSalvarDocumento =
  | {
      tipo: "salvo";
      id: string;
      revisao: number;
      salvoEm: Date;
      /** Igual à `revisao` quando a cópia de trabalho ficou igual à versão no ar (E47). */
      revisaoPublicada: number | null;
    }
  /** Alguém salvou depois da `revisaoBase`: nada foi gravado; a pessoa escolhe a versão (E02, N4). */
  | { tipo: "conflito"; servidor: DocumentoAberto };

/**
 * Salvamento do rascunho do documento oficial (RF41; como o da notícia, E40). Só o ADM (RN08).
 * Sem `id`, cria o documento no primeiro salvamento. Com `id`, grava só se ninguém salvou depois da
 * `revisaoBase`; senão devolve o conflito.
 */
export async function salvarRascunhoDocumento(
  entrada: { id?: string; tipo: TipoDocumento; revisaoBase?: number; dados: DadosDocumento },
  deps: DepsDoSalvamentoDocumento,
): Promise<ResultadoSalvarDocumento> {
  const { id, tipo } = entrada;
  if (!id) {
    exigir(deps.quem, "criar", { tipo: "documento" });
    return comNumeroUnico(tipo, entrada.dados, () =>
      banco().transaction(async (tx) => {
        const dados = await validarDocumento(tx, tipo, entrada.dados);
        const criado = await criar(tx, tipo, dados, deps.quem);
        await registrarAtividadeConteudo(tx, { id: criado.id, tipo, titulo: dados.titulo }, "criar", deps);
        return criado;
      }),
    );
  }
  exigir(deps.quem, "editar", { tipo: "documento" });
  return comNumeroUnico(tipo, entrada.dados, () =>
    banco().transaction(async (tx) => {
      const atual = await travarConteudo(tx, id, [tipo]);
      if (atual.estado === "arquivado") throw conteudoArquivado(tipo);
      const dados = await validarDocumento(tx, tipo, entrada.dados, id);
      const servidor = (await lerDocumento(tx, id))!;
      if (atual.revisao !== entrada.revisaoBase) {
        return { tipo: "conflito", servidor };
      }
      // Nada mudou: não grava, não sobe a revisão e não vai para a Atividade (E47). Se a cópia já
      // era igual à versão no ar (aviso preso de antes do E47), a `revisao_publicada` acompanha.
      if (mesmosDados(servidor.dados, dados)) {
        const linha = await acompanharVersaoNoAr(tx, atual, dados, await retratoDoDocumento(tx, id));
        return { tipo: "salvo", id, revisao: linha.revisao, salvoEm: linha.atualizadoEm, revisaoPublicada: linha.revisaoPublicada };
      }
      if (atual.estado === "agendado") await conferirPdfDoAgendado(tx, id, dados);
      const salvo = await gravarDocumentoPorCima(tx, id, tipo, dados, deps.quem);
      if (!(await sessaoJaRegistrada(tx, id, deps.sessaoEdicao))) {
        await registrarAtividadeConteudo(tx, { id, tipo, titulo: dados.titulo }, "editar", deps);
      }
      return salvo;
    }),
  );
}

/**
 * O PDF confirmado como oficial ao agendar vai ao ar na hora marcada (RN12, E46). Trocar o PDF de um
 * documento agendado pediria nova confirmação; por isso a troca espera o cancelamento do agendamento.
 */
async function conferirPdfDoAgendado(tx: Transacao, id: string, dados: DadosDocumento) {
  const [linha] = await tx.select({ pdf: documento.pdfMidiaId }).from(documento).where(eq(documento.conteudoId, id));
  if (linha && linha.pdf !== dados.pdfMidiaId) {
    throw new ErroConteudo(
      "invalido",
      "Para trocar o PDF, cancele o agendamento antes. Ao agendar de novo, você confirma o PDF novo.",
      "pdfMidiaId",
    );
  }
}

/** Dois salvamentos ao mesmo tempo com o mesmo número: o índice único do banco segura o segundo. */
async function comNumeroUnico<T>(tipo: TipoDocumento, dados: DadosDocumento, gravar: () => Promise<T>): Promise<T> {
  try {
    return await gravar();
  } catch (erro) {
    const causa = (erro as { cause?: { code?: string; constraint_name?: string } }).cause ?? (erro as { code?: string; constraint_name?: string });
    if (causa?.code === "23505" && causa.constraint_name === "documento_numero_unico_por_tipo") {
      throw numeroRepetido(tipo, dados.numero.trim());
    }
    throw erro;
  }
}

async function sessaoJaRegistrada(tx: Transacao, id: string, sessao: string) {
  const [linha] = await tx
    .select({ id: atividade.id })
    .from(atividade)
    .where(
      and(
        eq(atividade.alvoId, id),
        inArray(atividade.acao, ["documento.criar", "documento.editar", "documento.resolver_conflito"]),
        sql`${atividade.detalhe}->>'sessao' = ${sessao}`,
      ),
    )
    .limit(1);
  return !!linha;
}

/**
 * Grava os dados sobre o documento (já travado e conferido) e sobe a revisão. Toda gravação da
 * cópia de trabalho passa por aqui: se ela ficou igual à versão no ar, a `revisao_publicada`
 * acompanha, e o aviso de alterações não publicadas some (E47).
 */
export async function gravarDocumentoPorCima(tx: Transacao, id: string, tipo: TipoDocumento, dados: DadosDocumento, quem: QuemDaEquipe) {
  const [gravado] = await tx
    .update(conteudo)
    .set({ titulo: dados.titulo, categoriaId: dados.categoriaId, atualizadoPor: quem.id, revisao: sql`${conteudo.revisao} + 1` })
    .where(eq(conteudo.id, id))
    .returning();
  await tx.update(documento).set(colunasDoDocumento(tipo, dados)).where(eq(documento.conteudoId, id));
  const noAr = await retratoDoDocumento(tx, id);
  await gravarUsosDoDocumento(tx, id, dados, noAr);
  const salvo = await acompanharVersaoNoAr(tx, gravado!, dados, noAr);
  return { tipo: "salvo" as const, id, revisao: salvo.revisao, salvoEm: salvo.atualizadoEm, revisaoPublicada: salvo.revisaoPublicada };
}

async function criar(tx: Transacao, tipo: TipoDocumento, dados: DadosDocumento, quem: QuemDaEquipe) {
  const [criado] = await tx
    .insert(conteudo)
    .values({ tipo, titulo: dados.titulo, autorId: quem.id, atualizadoPor: quem.id, categoriaId: dados.categoriaId })
    .returning();
  await tx.insert(documento).values({ conteudoId: criado!.id, ...colunasDoDocumento(tipo, dados) });
  await gravarUsosDoDocumento(tx, criado!.id, dados);
  return { tipo: "salvo" as const, id: criado!.id, revisao: criado!.revisao, salvoEm: criado!.atualizadoEm, revisaoPublicada: null };
}

/** O arquivo da Mídia que o documento usa: o PDF oficial (RN16). */
export function midiasDoDocumento(dados: DadosDocumento): string[] {
  return dados.pdfMidiaId ? [dados.pdfMidiaId] : [];
}

/**
 * Uso da Mídia pelo documento: o PDF da cópia de trabalho mais o da versão no ar (E42). Assim,
 * substituir o PDF no rascunho não deixa a Mídia apagar o que o site ainda mostra.
 */
export async function gravarUsosDoDocumento(tx: Transacao, id: string, dados: DadosDocumento, retrato?: RetratoDoDocumento | null) {
  const noAr = retrato === undefined ? await retratoDoDocumento(tx, id) : retrato;
  const usadas = [...new Set([...midiasDoDocumento(dados), ...(noAr ? midiasDoDocumento(noAr.dados) : [])])];
  await tx.delete(midiaUso).where(and(eq(midiaUso.donoTipo, "documento"), eq(midiaUso.donoId, id)));
  if (usadas.length > 0) {
    await tx.insert(midiaUso).values(usadas.map((midiaId) => ({ midiaId, donoTipo: "documento", donoId: id })));
  }
}

function colunasDoDocumento(tipo: TipoDocumento, dados: DadosDocumento) {
  return {
    tipo,
    numero: dados.numero,
    numeroNormalizado: normalizarNumero(dados.numero),
    subtipo: dados.subtipo,
    dataDocumento: dados.dataDocumento || null,
    dataEvento: instanteDoEvento(dados),
    temVigencia: dados.temVigencia,
    vigenciaInicio: dados.vigenciaInicio || null,
    vigenciaFim: dados.vigenciaFim || null,
    abrangencia: dados.abrangencia,
    partesSignatarias: dados.partesSignatarias,
    resumo: dados.resumo,
    pdfMidiaId: dados.pdfMidiaId,
    textoPesquisavel: dados.textoPesquisavel,
  };
}
