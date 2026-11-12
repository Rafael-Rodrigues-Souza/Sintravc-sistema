import { and, eq, inArray, sql } from "drizzle-orm";

import { banco, type Transacao } from "@/lib/db";
import { bahiaParaUtc } from "@/lib/datas";
import { atividade, conteudo, documento, midiaUso } from "@/lib/db/schema";
import {
  conteudoArquivado,
  registrarAtividadeConteudo,
  travarConteudo,
} from "@/lib/conteudos/tipo-do-conteudo";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import { lerDocumento, retratoDoDocumento, type DocumentoAberto } from "./carregar";
import { normalizarNumero } from "./conferir";
import type { DadosDocumento, TipoDocumento } from "./dados";
import { numeroRepetido, validarDocumento } from "./validar";

export type DepsDoSalvamentoDocumento = {
  quem: QuemDaEquipe;
  /** Uma por vez que o editor abre: a Atividade registra a edição uma vez por sessão (E40). */
  sessaoEdicao: string;
};

export type ResultadoSalvarDocumento =
  | { tipo: "salvo"; id: string; revisao: number; salvoEm: Date }
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
      if (atual.revisao !== entrada.revisaoBase) {
        return { tipo: "conflito", servidor: (await lerDocumento(tx, id))! };
      }
      const salvo = await gravarDocumentoPorCima(tx, id, tipo, dados, deps.quem);
      if (!(await sessaoJaRegistrada(tx, id, deps.sessaoEdicao))) {
        await registrarAtividadeConteudo(tx, { id, tipo, titulo: dados.titulo }, "editar", deps);
      }
      return salvo;
    }),
  );
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

/** Grava os dados sobre o documento (já travado e conferido) e sobe a revisão. */
export async function gravarDocumentoPorCima(tx: Transacao, id: string, tipo: TipoDocumento, dados: DadosDocumento, quem: QuemDaEquipe) {
  const [salvo] = await tx
    .update(conteudo)
    .set({ titulo: dados.titulo, categoriaId: dados.categoriaId, atualizadoPor: quem.id, revisao: sql`${conteudo.revisao} + 1` })
    .where(eq(conteudo.id, id))
    .returning();
  await tx.update(documento).set(colunasDoDocumento(tipo, dados)).where(eq(documento.conteudoId, id));
  await gravarUsosDoDocumento(tx, id, dados);
  return { tipo: "salvo" as const, id, revisao: salvo!.revisao, salvoEm: salvo!.atualizadoEm };
}

async function criar(tx: Transacao, tipo: TipoDocumento, dados: DadosDocumento, quem: QuemDaEquipe) {
  const [criado] = await tx
    .insert(conteudo)
    .values({ tipo, titulo: dados.titulo, autorId: quem.id, atualizadoPor: quem.id, categoriaId: dados.categoriaId })
    .returning();
  await tx.insert(documento).values({ conteudoId: criado!.id, ...colunasDoDocumento(tipo, dados) });
  await gravarUsosDoDocumento(tx, criado!.id, dados);
  return { tipo: "salvo" as const, id: criado!.id, revisao: criado!.revisao, salvoEm: criado!.atualizadoEm };
}

/** O arquivo da Mídia que o documento usa: o PDF oficial (RN16). */
export function midiasDoDocumento(dados: DadosDocumento): string[] {
  return dados.pdfMidiaId ? [dados.pdfMidiaId] : [];
}

/**
 * Uso da Mídia pelo documento: o PDF da cópia de trabalho mais o da versão no ar (E42). Assim,
 * substituir o PDF no rascunho não deixa a Mídia apagar o que o site ainda mostra.
 */
export async function gravarUsosDoDocumento(tx: Transacao, id: string, dados: DadosDocumento) {
  const noAr = await retratoDoDocumento(tx, id);
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
    dataEvento: dados.eventoData && dados.eventoHora ? bahiaParaUtc(dados.eventoData, dados.eventoHora) : null,
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
