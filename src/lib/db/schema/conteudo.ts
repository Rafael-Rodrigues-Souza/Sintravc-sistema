import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgEnum, pgTable, text, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { pessoaEquipe } from "./equipe";
import { midia } from "./midia";

export const escopoCategoria = pgEnum("escopo_categoria", ["noticias", "documentos", "radio", "beneficios"]);
export const tipoConteudo = pgEnum("tipo_conteudo", ["noticia", "edital", "acordo"]);
export const estadoConteudo = pgEnum("estado_conteudo", ["rascunho", "agendado", "publicado", "oculto", "arquivado"]);
export const tipoLink = pgEnum("tipo_link", ["fonte", "anexo"]);
/** Edital: convocação, eleição, prestação de contas, outros. Acordo: ACT ou CCT (spec §2.2). */
export const subtipoDocumento = pgEnum("subtipo_documento", ["convocacao", "eleicao", "prestacao_contas", "outros", "act", "cct"]);

/**
 * Categoria (spec §2.2). Só o ADM gerencia (RN08); a tela fica no #20. As iniciais vêm na
 * migração (Figma 117:3030). `cor` é o nome de uma cor do selo: azul, marinho, amarelo, vermelho, aviso.
 */
export const categoria = pgTable("categoria", {
  id: idUuid(),
  nome: text().notNull().unique(),
  cor: text().notNull(),
  ordem: integer().notNull(),
  escopos: escopoCategoria().array().notNull(),
  ...datas,
});

/**
 * Base comum de notícia, edital e acordo (spec §2.2, RN10).
 * - `versao`: número da versão publicada (E31, #9). O salvamento automático não muda.
 * - `revisao`: sobe a cada salvamento que muda algo (E47); é o que detecta o conflito entre o rascunho do navegador e o
 *   do servidor (E02, E40).
 * - `slug` fica nulo até a primeira publicação (E40) e é gerado nela (E42); UNIQUE por tipo aceita vários nulos.
 * - No rascunho os textos podem ficar vazios; os obrigatórios são cobrados ao publicar (E40).
 */
export const conteudo = pgTable(
  "conteudo",
  {
    id: idUuid(),
    tipo: tipoConteudo().notNull(),
    slug: text(),
    titulo: text().notNull().default(""),
    estado: estadoConteudo().notNull().default("rascunho"),
    agendadoPara: dataHora(),
    /** Quem agendou: recebe o e-mail se a publicação agendada falhar (E21, E44). */
    agendadoPor: uuid().references(() => pessoaEquipe.id),
    publicadoEm: dataHora(),
    jaPublicado: boolean().notNull().default(false),
    motivoOculto: text(),
    /**
     * Quando foi tirada do site ("Retirado em"). Gravada no ocultar e limpa no mostrar. Não vem do
     * `atualizado_em`, que muda a cada salvamento da cópia de trabalho (E45).
     */
    ocultadoEm: dataHora(),
    /** O estado de antes do arquivamento, para o "Desfazer" do aviso (E45). Nulo fora do arquivado. */
    estadoAntesDeArquivar: estadoConteudo(),
    autorId: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    categoriaId: uuid().references(() => categoria.id, { onDelete: "restrict" }),
    versao: integer().notNull().default(0),
    revisao: integer().notNull().default(1),
    /**
     * A `revisao` igual à versão no ar (E42, E47). O site mostra o retrato da versão publicada
     * (ConteudoVersao); o editor salva a cópia de trabalho. Quando uma gravação deixa a cópia igual
     * ao retrato, esta coluna acompanha a `revisao`. Há alterações ainda não publicadas quando o
     * estado é publicado ou oculto e `revisao > revisao_publicada`.
     */
    revisaoPublicada: integer(),
    /** Quem fez o último salvamento ("Salva por Carlos Ribeiro às 10h38", N4). */
    atualizadoPor: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    ...datas,
  },
  (tabela) => [
    unique().on(tabela.tipo, tabela.slug),
    index().on(tabela.tipo, tabela.estado),
    index().on(tabela.atualizadoEm),
  ],
);

/** Dados próprios da notícia (1:1 com Conteudo). Manchete = `conteudo.titulo` (≤ 110). */
export const noticia = pgTable("noticia", {
  conteudoId: uuid()
    .primaryKey()
    .references(() => conteudo.id, { onDelete: "cascade" }),
  linhaFina: text().notNull().default(""),
  lide: text().notNull().default(""),
  /** JSON do Tiptap, só com os formatos permitidos (validarCorpo). */
  corpo: jsonb().notNull().default(sql`'{"type":"doc","content":[]}'::jsonb`),
  capaMidiaId: uuid().references(() => midia.id, { onDelete: "restrict" }),
  capaAlt: text().notNull().default(""),
  capaLegenda: text().notNull().default(""),
  assinatura: text().notNull().default(""),
  local: text().notNull().default(""),
  palavrasChave: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  fixadaAte: dataHora(),
  ...datas,
});

/**
 * Documento oficial, edital ou acordo (1:1 com Conteudo; spec §2.2, RF41, RN12, E46). Só o ADM
 * altera (RN08). O selo Vigente, Encerrado ou Prazo é calculado pelas datas (C2), não é estado.
 * - `tipo` repete o do conteúdo só para o número ser único por tipo (`numero_normalizado`, E46).
 * - Datas do documento e da vigência são dias do calendário; o evento ou prazo tem hora (UTC).
 * - `confirmado_oficial_por`: quem confirmou que o PDF da última ida ao ar é o oficial e assinado.
 */
export const documento = pgTable(
  "documento",
  {
    conteudoId: uuid()
      .primaryKey()
      .references(() => conteudo.id, { onDelete: "cascade" }),
    tipo: tipoConteudo().notNull(),
    numero: text().notNull().default(""),
    numeroNormalizado: text(),
    subtipo: subtipoDocumento(),
    dataDocumento: date({ mode: "string" }),
    dataEvento: dataHora(),
    temVigencia: boolean().notNull().default(false),
    vigenciaInicio: date({ mode: "string" }),
    vigenciaFim: date({ mode: "string" }),
    abrangencia: text().notNull().default(""),
    partesSignatarias: text().notNull().default(""),
    resumo: text().notNull().default(""),
    pdfMidiaId: uuid().references(() => midia.id, { onDelete: "restrict" }),
    textoPesquisavel: text().notNull().default(""),
    confirmadoOficialPor: uuid().references(() => pessoaEquipe.id),
    ...datas,
  },
  (tabela) => [
    uniqueIndex("documento_numero_unico_por_tipo")
      .on(tabela.tipo, tabela.numeroNormalizado)
      .where(sql`${tabela.numeroNormalizado} is not null`),
    check("documento_tipo", sql`${tabela.tipo} in ('edital', 'acordo')`),
    check("documento_resumo_limite", sql`char_length(${tabela.resumo}) <= 400`),
    check("documento_vigencia_ordem", sql`${tabela.vigenciaFim} is null or ${tabela.vigenciaInicio} is null or ${tabela.vigenciaFim} >= ${tabela.vigenciaInicio}`),
  ],
);

/** Fontes e anexos do conteúdo. "Adicionar link" grava `fonte`; "Adicionar anexo", `anexo` (E40). */
export const conteudoLink = pgTable(
  "conteudo_link",
  {
    id: idUuid(),
    conteudoId: uuid()
      .notNull()
      .references(() => conteudo.id, { onDelete: "cascade" }),
    tipo: tipoLink().notNull(),
    titulo: text().notNull().default(""),
    url: text(),
    midiaId: uuid().references(() => midia.id, { onDelete: "restrict" }),
    visivel: boolean().notNull().default(true),
    ordem: integer().notNull(),
    ...datas,
  },
  (tabela) => [index().on(tabela.conteudoId, tabela.ordem)],
);

/**
 * Versões publicadas (E31, E42). Cada publicação grava o retrato completo do que foi ao ar; o
 * salvamento automático não gera versão (CA-US21.10). O site lê a versão `conteudo.versao`.
 */
export const conteudoVersao = pgTable(
  "conteudo_versao",
  {
    id: idUuid(),
    conteudoId: uuid()
      .notNull()
      .references(() => conteudo.id, { onDelete: "cascade" }),
    versao: integer().notNull(),
    /** `RetratoDaNoticia` (src/lib/conteudos/carregar.ts). */
    snapshot: jsonb().notNull(),
    criadoPor: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    criadoEm: dataHora().notNull().defaultNow(),
  },
  (tabela) => [unique().on(tabela.conteudoId, tabela.versao)],
);
