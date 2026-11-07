import { jsonb, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { dataHora, idUuid } from "./comum";

export const atorTipo = pgEnum("ator_tipo", ["pessoa", "sistema", "associado"]);

/**
 * Registro de auditoria (spec §2.3, RN18). Só inserção: um trigger no banco
 * bloqueia UPDATE, DELETE e TRUNCATE (drizzle/0002). Grave sempre com registrarAtividade().
 */
export const atividade = pgTable("atividade", {
  id: idUuid(),
  quando: dataHora().notNull().defaultNow(),
  atorTipo: atorTipo().notNull(),
  atorId: text(),
  acao: text().notNull(),
  area: text().notNull(),
  alvoTipo: text().notNull(),
  alvoId: text().notNull(),
  alvoRotulo: text().notNull(),
  detalhe: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  motivo: text(),
});
