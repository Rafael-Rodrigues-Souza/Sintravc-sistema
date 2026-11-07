import { boolean, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { pessoaEquipe } from "./equipe";

// Tabelas geridas pelo Better Auth (E36), com nomes em português. O mapeamento dos campos
// (expiresAt → expiraEm…) está em src/lib/acesso/auth.ts. Não grave nelas por fora do Better Auth,
// a não ser a coluna ultimo_uso da sessão, que é nossa.

const pessoa = () =>
  uuid()
    .notNull()
    .references(() => pessoaEquipe.id, { onDelete: "cascade" });

/** Sessão da equipe (spec §2.1). */
export const sessao = pgTable("sessao", {
  id: idUuid(),
  pessoaId: pessoa(),
  token: text().notNull().unique(),
  expiraEm: dataHora().notNull(),
  ip: text(),
  agenteUsuario: text(),
  /** Último uso, gravado pelo painel (no máximo 1 vez por minuto). Base das 2 h sem uso (E05). */
  ultimoUso: dataHora().notNull().defaultNow(),
  ...datas,
});

/** Credenciais. Na equipe, só a senha (providerId "credential"). */
export const contaLogin = pgTable("conta_login", {
  id: idUuid(),
  pessoaId: pessoa(),
  idNoProvedor: text().notNull(),
  provedor: text().notNull(),
  tokenAcesso: text(),
  tokenRenovacao: text(),
  tokenId: text(),
  tokenAcessoExpiraEm: dataHora(),
  tokenRenovacaoExpiraEm: dataHora(),
  escopo: text(),
  senhaHash: text(),
  ...datas,
});

/** Valores temporários do Better Auth (desafio das duas etapas, links). */
export const verificacao = pgTable("verificacao", {
  id: idUuid(),
  identificador: text().notNull(),
  valor: text().notNull(),
  expiraEm: dataHora().notNull(),
  ...datas,
});

/** Duas etapas: segredo TOTP e códigos de recuperação, criptografados com BETTER_AUTH_SECRET. */
export const duasEtapas = pgTable("duas_etapas", {
  id: idUuid(),
  pessoaId: pessoa(),
  segredo: text().notNull(),
  codigosRecuperacao: text().notNull(),
  verificado: boolean().notNull().default(true),
  falhasSeguidas: integer().notNull().default(0),
  bloqueadoAte: dataHora(),
});
