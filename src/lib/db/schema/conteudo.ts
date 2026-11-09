import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { pessoaEquipe } from "./equipe";
import { midia } from "./midia";

export const escopoCategoria = pgEnum("escopo_categoria", ["noticias", "documentos", "radio", "beneficios"]);
export const tipoConteudo = pgEnum("tipo_conteudo", ["noticia", "edital", "acordo"]);
export const estadoConteudo = pgEnum("estado_conteudo", ["rascunho", "agendado", "publicado", "oculto", "arquivado"]);
export const tipoLink = pgEnum("tipo_link", ["fonte", "anexo"]);

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
 * - `revisao`: sobe a cada salvamento; é o que detecta o conflito entre o rascunho do navegador e o
 *   do servidor (E02, E40).
 * - `slug` fica nulo até a primeira publicação (#9, E40); UNIQUE por tipo aceita vários nulos.
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
    publicadoEm: dataHora(),
    jaPublicado: boolean().notNull().default(false),
    motivoOculto: text(),
    autorId: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    categoriaId: uuid().references(() => categoria.id, { onDelete: "restrict" }),
    versao: integer().notNull().default(0),
    revisao: integer().notNull().default(1),
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
