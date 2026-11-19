import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text } from "drizzle-orm/pg-core";

import { datas } from "./comum";

/**
 * Dados do site público (spec §2; RN43): contato, redes, missão e história. Registro único,
 * com `id = 'site'`. O JSON é validado por Zod em `src/lib/config-site/esquema.ts` e lido com
 * `lerConfigSite()`. Os dados de exemplo vêm na migração drizzle/0013. A tela de edição é a #20.
 */
export const configSite = pgTable(
  "config_site",
  {
    id: text().primaryKey().default("site"),
    dados: jsonb().notNull(),
    ...datas,
  },
  (t) => [check("config_site_registro_unico", sql`${t.id} = 'site'`)],
);
