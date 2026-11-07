import { customType, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";

const citext = customType<{ data: string }>({ dataType: () => "citext" });

export const perfil = pgEnum("perfil", ["ADM", "COM", "ATD"]);
export const situacaoPessoa = pgEnum("situacao_pessoa", ["pendente", "ativa", "desativada"]);

/**
 * Pessoa da equipe (spec §2.1). Também será a tabela de usuários do Better Auth (E35):
 * as colunas de login entram no #4.
 */
export const pessoaEquipe = pgTable("pessoa_equipe", {
  id: idUuid(),
  nome: text().notNull(),
  email: citext().notNull().unique(),
  perfil: perfil().notNull(),
  situacao: situacaoPessoa().notNull().default("pendente"),
  ...datas,
});

/** Convite de 48 h (RN46). Só o hash do token vai para o banco. */
export const convite = pgTable("convite", {
  id: idUuid(),
  pessoaId: uuid()
    .notNull()
    .references(() => pessoaEquipe.id),
  tokenHash: text().notNull().unique(),
  expiraEm: dataHora().notNull(),
  usadoEm: dataHora(),
  /** Nulo quando o convite nasce pelo comando criar-admin (E33). */
  criadoPor: uuid().references(() => pessoaEquipe.id),
  ...datas,
});
