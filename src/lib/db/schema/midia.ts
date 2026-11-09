import { bigint, index, integer, pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";

import { datas, idUuid } from "./comum";
import { pessoaEquipe } from "./equipe";

export const tipoMidia = pgEnum("tipo_midia", ["imagem", "pdf", "documento"]);

/**
 * Arquivo da Mídia (spec §2.2, RN15, E39). O conteúdo fica no armazenamento S3 (R2 em produção,
 * MinIO no desenvolvimento) na chave `chave_r2`; aqui ficam só os dados. `mime` é o formato
 * detectado pelos bytes no envio, nunca o que o navegador mandou.
 */
export const midia = pgTable(
  "midia",
  {
    id: idUuid(),
    chaveR2: text("chave_r2").notNull().unique(),
    nomeArquivo: text().notNull(),
    tipo: tipoMidia().notNull(),
    mime: text().notNull(),
    largura: integer(),
    altura: integer(),
    bytes: bigint({ mode: "number" }).notNull(),
    paginas: integer(),
    /** Texto alternativo: obrigatório para publicar (RN15), não para enviar. */
    alt: text(),
    /** "Legenda e crédito", um campo só (Figma 116:2727). */
    legenda: text(),
    enviadoPor: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    ...datas,
  },
  (tabela) => [index().on(tabela.criadoEm)],
);

/**
 * Onde cada arquivo é usado (notícia, documento, parceiro…). Mantida pelo servidor, por quem usa
 * o arquivo. Só pode excluir mídia sem uso (RN16): a chave estrangeira também impede no banco.
 */
export const midiaUso = pgTable(
  "midia_uso",
  {
    midiaId: uuid()
      .notNull()
      .references(() => midia.id, { onDelete: "restrict" }),
    donoTipo: text().notNull(),
    donoId: uuid().notNull(),
    ...datas,
  },
  (tabela) => [
    primaryKey({ columns: [tabela.midiaId, tabela.donoTipo, tabela.donoId] }),
    index().on(tabela.donoTipo, tabela.donoId),
  ],
);
