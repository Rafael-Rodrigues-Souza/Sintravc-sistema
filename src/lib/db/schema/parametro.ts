import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

import { datas } from "./comum";

/**
 * Valores das regras (regras-de-negocio.md §3; spec §11 T4). Os valores iniciais
 * vêm na migração drizzle/0002. Só o ADM altera, direto no banco. Leia com lerParametro().
 */
export const parametro = pgTable("parametro", {
  chave: text().primaryKey(),
  valor: jsonb().notNull(),
  descricao: text().notNull(),
  regra: text().notNull(),
  ...datas,
});
