import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { banco, type Transacao } from "@/lib/db";
import { conteudo, conteudoVersao, documento, midia, pessoaEquipe } from "@/lib/db/schema";
import { bahiaEmCampos } from "@/lib/datas";
import { exigir, type QuemDaEquipe } from "@/lib/permissoes";

import type { DadosDocumento, TipoDocumento } from "./dados";

/** O PDF oficial, como a tela mostra (nome, tamanho e páginas). */
export type PdfDoDocumento = { id: string; nomeArquivo: string; bytes: number; paginas: number | null };

export type DocumentoAberto = {
  id: string;
  tipo: TipoDocumento;
  estado: (typeof conteudo.$inferSelect)["estado"];
  revisao: number;
  versao: number;
  revisaoPublicada: number | null;
  jaPublicado: boolean;
  slug: string | null;
  publicadoEm: Date | null;
  agendadoPara: Date | null;
  agendadoPor: string | null;
  motivoOculto: string | null;
  ocultadoEm: Date | null;
  autorId: string;
  autorNome: string;
  salvoPorNome: string;
  atualizadoEm: Date;
  /** Quem confirmou que o PDF da última ida ao ar é o oficial e assinado (RN12). */
  confirmadoOficialPorNome: string | null;
  dados: DadosDocumento;
  pdf: PdfDoDocumento | null;
};

/** Lê o documento como está no servidor. A COM também vê (RF42); sem permissão de ver, nega (RNF01). */
export async function carregarDocumento(id: string, deps: { quem: QuemDaEquipe }): Promise<DocumentoAberto | null> {
  exigir(deps.quem, "ver", { tipo: "documento" });
  return lerDocumento(banco(), id);
}

/** Leitura sem conferir permissão, para quem já conferiu (dentro da transação da ação). */
export async function lerDocumento(tx: Transacao | ReturnType<typeof banco>, id: string): Promise<DocumentoAberto | null> {
  const salvoPor = alias(pessoaEquipe, "salvo_por");
  const confirmou = alias(pessoaEquipe, "confirmou");
  const [linha] = await tx
    .select({
      conteudo,
      documento,
      autorNome: pessoaEquipe.nome,
      salvoPorNome: salvoPor.nome,
      confirmouNome: confirmou.nome,
      pdf: { id: midia.id, nomeArquivo: midia.nomeArquivo, bytes: midia.bytes, paginas: midia.paginas },
    })
    .from(conteudo)
    .innerJoin(documento, eq(documento.conteudoId, conteudo.id))
    .innerJoin(pessoaEquipe, eq(pessoaEquipe.id, conteudo.autorId))
    .innerJoin(salvoPor, eq(salvoPor.id, conteudo.atualizadoPor))
    .leftJoin(confirmou, eq(confirmou.id, documento.confirmadoOficialPor))
    .leftJoin(midia, eq(midia.id, documento.pdfMidiaId))
    .where(eq(conteudo.id, id));
  if (!linha) return null;
  const { conteudo: c, documento: d } = linha;
  return {
    id: c.id,
    tipo: c.tipo as TipoDocumento,
    estado: c.estado,
    revisao: c.revisao,
    versao: c.versao,
    revisaoPublicada: c.revisaoPublicada,
    jaPublicado: c.jaPublicado,
    slug: c.slug,
    publicadoEm: c.publicadoEm,
    agendadoPara: c.agendadoPara,
    agendadoPor: c.agendadoPor,
    motivoOculto: c.motivoOculto,
    ocultadoEm: c.ocultadoEm,
    autorId: c.autorId,
    autorNome: linha.autorNome,
    salvoPorNome: linha.salvoPorNome,
    atualizadoEm: c.atualizadoEm,
    confirmadoOficialPorNome: linha.confirmouNome,
    dados: dadosDaLinha(c, d),
    pdf: linha.pdf && linha.pdf.id ? linha.pdf : null,
  };
}

function dadosDaLinha(c: typeof conteudo.$inferSelect, d: typeof documento.$inferSelect): DadosDocumento {
  const evento = d.dataEvento ? bahiaEmCampos(d.dataEvento) : { data: "", hora: "" };
  return {
    titulo: c.titulo,
    numero: d.numero,
    subtipo: d.subtipo,
    dataDocumento: d.dataDocumento ?? "",
    eventoData: evento.data,
    eventoHora: evento.hora,
    temVigencia: d.temVigencia,
    vigenciaInicio: d.vigenciaInicio ?? "",
    vigenciaFim: d.vigenciaFim ?? "",
    abrangencia: d.abrangencia,
    partesSignatarias: d.partesSignatarias,
    resumo: d.resumo,
    categoriaId: c.categoriaId,
    pdfMidiaId: d.pdfMidiaId,
    textoPesquisavel: d.textoPesquisavel,
  };
}

/** O que fica guardado em cada versão publicada do documento (E31, E42): tudo o que o site mostra. */
export type RetratoDoDocumento = { formato: 1; tipo: TipoDocumento; dados: DadosDocumento };

/** Retrato de uma versão (a do ar, por padrão), ou null se não existe. */
export async function retratoDoDocumento(
  tx: Transacao | ReturnType<typeof banco>,
  id: string,
  versao?: number,
): Promise<RetratoDoDocumento | null> {
  const [linha] = await tx
    .select({ snapshot: conteudoVersao.snapshot })
    .from(conteudoVersao)
    .innerJoin(conteudo, eq(conteudo.id, conteudoVersao.conteudoId))
    .where(
      and(
        eq(conteudoVersao.conteudoId, id),
        versao === undefined ? eq(conteudoVersao.versao, conteudo.versao) : eq(conteudoVersao.versao, versao),
      ),
    );
  return linha ? (linha.snapshot as RetratoDoDocumento) : null;
}

/**
 * A versão que está no ar, com o PDF dela (RF42, RN12, E46): é o que a Comunicação vê e baixa. O
 * PDF da cópia de trabalho ainda não foi confirmado como oficial e fica só com o ADM. Null se o
 * documento nunca foi publicado.
 */
export async function versaoPublicadaDoDocumento(
  id: string,
  deps: { quem: QuemDaEquipe },
): Promise<{ dados: DadosDocumento; pdf: PdfDoDocumento | null } | null> {
  exigir(deps.quem, "ver", { tipo: "documento" });
  const retrato = await retratoDoDocumento(banco(), id);
  if (!retrato) return null;
  const [pdf] = retrato.dados.pdfMidiaId
    ? await banco()
        .select({ id: midia.id, nomeArquivo: midia.nomeArquivo, bytes: midia.bytes, paginas: midia.paginas })
        .from(midia)
        .where(eq(midia.id, retrato.dados.pdfMidiaId))
    : [];
  return { dados: retrato.dados, pdf: pdf ?? null };
}
