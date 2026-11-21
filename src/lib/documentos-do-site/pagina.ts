/**
 * Monta a página Documentos a partir dos documentos no ar (E60): ordem, filtros, grupos por mês,
 * contadores, destaque e acordo vigente. Puro: as leituras do banco ficam em `consultas.ts`.
 */
import { cartaoDoDocumento, type DocumentoNoCartao } from "@/lib/documentos/cartao";
import { anoNaBahia, dataNaBahia, mesNaBahia } from "@/lib/datas";
import { instanteDoEvento, SUBTIPOS, type DadosDocumento, type SubtipoDocumento, type TipoDocumento } from "@/lib/documentos/dados";
import { seloDosDados } from "@/lib/documentos/selo";

import { ABA_DO_TIPO, DOCUMENTOS_POR_VEZ, type FiltrosDeDocumentos } from "./filtros";
import { contagemDoPrazo, ehNovo, prazoEmAberto } from "./prazo";

/** Um documento como está no ar: o retrato da versão publicada (sem o texto pesquisável, que é grande). */
export type DocumentoNoAr = {
  id: string;
  tipo: TipoDocumento;
  slug: string;
  publicadoEm: Date;
  dados: DadosDocumento;
  pdfBytes: number | null;
};

/** O cartão de um documento na lista, no destaque e no documento aberto. */
export type DocumentoNaLista = {
  id: string;
  /** O documento aberto (N18). */
  href: string;
  cartao: DocumentoNoCartao;
  novo: boolean;
  /** "Faltam 5 dias", "Termina hoje"; nulo sem prazo em aberto. */
  contagem: string | null;
  /** O ano do quadro em Acordos e do filtro: publicação (edital) ou início da vigência (acordo). */
  ano: number;
  /** O mês da publicação, para os grupos de Editais. */
  mes: { chave: string; rotulo: string };
};

export function enderecoDoDocumento(tipo: TipoDocumento, slug: string): string {
  return `/documentos/${ABA_DO_TIPO[tipo]}/${slug}`;
}

export function enderecoDoPdf(tipo: TipoDocumento, slug: string, modo: "abrir" | "baixar"): string {
  return `${enderecoDoDocumento(tipo, slug)}/pdf?modo=${modo}`;
}

export function anoDoDocumento(doc: Pick<DocumentoNoAr, "tipo" | "publicadoEm" | "dados">): number {
  if (doc.tipo === "acordo" && doc.dados.vigenciaInicio) return Number(doc.dados.vigenciaInicio.slice(0, 4));
  return anoNaBahia(doc.publicadoEm);
}

export function documentoNaLista(doc: DocumentoNoAr, agora: Date, novoDias: number): DocumentoNaLista {
  return {
    id: doc.id,
    href: enderecoDoDocumento(doc.tipo, doc.slug),
    cartao: cartaoDoDocumento({
      tipo: doc.tipo,
      estado: "publicado",
      dados: doc.dados,
      publicadoEm: doc.publicadoEm,
      pdfBytes: doc.pdfBytes,
      hrefs: doc.dados.pdfMidiaId
        ? { abrir: enderecoDoPdf(doc.tipo, doc.slug, "abrir"), baixar: enderecoDoPdf(doc.tipo, doc.slug, "baixar") }
        : null,
      agora,
    }),
    novo: ehNovo(doc.publicadoEm, agora, novoDias),
    contagem: contagemDoPrazo(doc.tipo, doc.dados, agora),
    ano: anoDoDocumento(doc),
    mes: mesNaBahia(doc.publicadoEm),
  };
}

const porPublicacao = (a: DocumentoNoAr, b: DocumentoNoAr) => b.publicadoEm.getTime() - a.publicadoEm.getTime() || (a.id < b.id ? 1 : -1);

/** Editais: do mais novo ao mais antigo. Acordos: pelo início da vigência, o mais recente primeiro. */
export function ordenar(docs: DocumentoNoAr[]): DocumentoNoAr[] {
  return [...docs].sort((a, b) => {
    if (a.tipo === "acordo" && b.tipo === "acordo") {
      const ia = a.dados.vigenciaInicio || "";
      const ib = b.dados.vigenciaInicio || "";
      if (ia !== ib) return ia < ib ? 1 : -1;
    }
    return porPublicacao(a, b);
  });
}

export type ListaDeDocumentos = {
  itens: DocumentoNaLista[];
  /** Quantos combinam com os filtros. */
  total: number;
  temMais: boolean;
};

/**
 * A lista com os filtros da URL. `idsDaBusca` é nulo sem busca; com busca, só ficam os ids que o
 * banco achou (inclusive no texto do PDF). Mostra `mais` levas de `DOCUMENTOS_POR_VEZ`.
 */
export function montarLista(
  docs: DocumentoNoAr[],
  filtros: FiltrosDeDocumentos,
  idsDaBusca: Set<string> | null,
  agora: Date,
  novoDias: number,
): ListaDeDocumentos {
  const combinam = ordenar(docs).filter(
    (d) =>
      (idsDaBusca === null || idsDaBusca.has(d.id)) &&
      (filtros.subtipo === null || d.dados.subtipo === filtros.subtipo) &&
      (filtros.ano === null || anoDoDocumento(d) === filtros.ano),
  );
  const limite = filtros.mais * DOCUMENTOS_POR_VEZ;
  return {
    itens: combinam.slice(0, limite).map((d) => documentoNaLista(d, agora, novoDias)),
    total: combinam.length,
    temMais: combinam.length > limite,
  };
}

/** Os itens agrupados pelo mês da publicação, na ordem em que vieram (Editais, Figma 73:629). */
export function gruposPorMes(itens: DocumentoNaLista[]): { chave: string; rotulo: string; itens: DocumentoNaLista[] }[] {
  const grupos: { chave: string; rotulo: string; itens: DocumentoNaLista[] }[] = [];
  for (const item of itens) {
    const ultimo = grupos.at(-1);
    if (ultimo?.chave === item.mes.chave) ultimo.itens.push(item);
    else grupos.push({ ...item.mes, itens: [item] });
  }
  return grupos;
}

/** O seletor de tipo: todos os subtipos da aba com pelo menos um documento, com a contagem. */
export function contagemPorSubtipo(tipo: TipoDocumento, docs: DocumentoNoAr[]): { subtipo: SubtipoDocumento; total: number }[] {
  return (SUBTIPOS[tipo] as readonly SubtipoDocumento[])
    .map((subtipo) => ({ subtipo, total: docs.filter((d) => d.dados.subtipo === subtipo).length }))
    .filter((c) => c.total > 0);
}

/** Os anos do seletor, do mais recente ao mais antigo. */
export function anosDisponiveis(docs: DocumentoNoAr[]): number[] {
  return [...new Set(docs.map(anoDoDocumento))].sort((a, b) => b - a);
}

/** Os contadores do topo de Editais (Figma 73:629). */
export function contadoresDeEditais(docs: DocumentoNoAr[], agora: Date) {
  const ano = anoNaBahia(agora);
  const ultima = docs.reduce<Date | null>((maior, d) => (!maior || d.publicadoEm > maior ? d.publicadoEm : maior), null);
  return {
    ano,
    publicacoesNoAno: docs.filter((d) => anoNaBahia(d.publicadoEm) === ano).length,
    prazosEmAberto: docs.filter((d) => prazoEmAberto(d.tipo, d.dados, agora)).length,
    /** "15/10". */
    ultimaAtualizacao: ultima ? dataNaBahia(ultima).slice(0, 5) : null,
  };
}

/**
 * O destaque de Editais: o prazo em aberto mais perto de vencer (a mesma regra do selo Prazo); sem
 * prazo em aberto, o edital mais recente; sem edital, nulo.
 */
export function destaqueDeEditais(docs: DocumentoNoAr[], agora: Date): DocumentoNoAr | null {
  const emAberto = docs
    .filter((d) => prazoEmAberto(d.tipo, d.dados, agora))
    .sort((a, b) => instanteDoEvento(a.dados)!.getTime() - instanteDoEvento(b.dados)!.getTime());
  return emAberto[0] ?? ordenar(docs)[0] ?? null;
}

/** O acordo vigente com o início mais recente (o quadro do topo de Acordos, Figma 75:1438). */
export function acordoVigente(docs: DocumentoNoAr[], agora: Date): DocumentoNoAr | null {
  return ordenar(docs).find((d) => seloDosDados(d.tipo, "publicado", d.dados, agora) === "vigente") ?? null;
}

/** "Válido até 30/04/2027", a partir do dia final da vigência. */
export function validoAte(dados: Pick<DadosDocumento, "vigenciaFim">): string | null {
  return dados.vigenciaFim ? dados.vigenciaFim.split("-").reverse().join("/") : null;
}

