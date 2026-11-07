import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Chave primária uuid v7 (ordenada pelo tempo), gerada pelo Postgres 18. */
export const idUuid = () => uuid().primaryKey().default(sql`uuidv7()`);

/** Data e hora em UTC (RNF06). */
export const dataHora = () => timestamp({ withTimezone: true, mode: "date" });

/** criado_em e atualizado_em, presentes em todas as tabelas (spec §2). */
export const datas = {
  criadoEm: dataHora().notNull().defaultNow(),
  atualizadoEm: dataHora()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
