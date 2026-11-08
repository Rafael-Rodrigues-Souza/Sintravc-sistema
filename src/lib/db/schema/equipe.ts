import { boolean, customType, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";

const citext = customType<{ data: string }>({ dataType: () => "citext" });

export const perfil = pgEnum("perfil", ["ADM", "COM", "ATD"]);
export const situacaoPessoa = pgEnum("situacao_pessoa", ["pendente", "ativa", "desativada"]);

/**
 * Pessoa da equipe (spec §2.1). É a tabela de usuários do Better Auth (E35, E36):
 * a senha fica em conta_login e o segredo das duas etapas em duas_etapas.
 */
export const pessoaEquipe = pgTable("pessoa_equipe", {
  id: idUuid(),
  nome: text().notNull(),
  email: citext().notNull().unique(),
  perfil: perfil().notNull(),
  situacao: situacaoPessoa().notNull().default("pendente"),
  /** Exigida pelo Better Auth. O convite aceito (#5) confirma o e-mail. */
  emailVerificado: boolean().notNull().default(false),
  /** Exigida pelo Better Auth; não usada. */
  imagem: text(),
  /** twoFactorEnabled do Better Auth. Sem as duas etapas ativas, ninguém entra (RNF02). */
  duasEtapasAtivas: boolean().notNull().default(false),
  /** Bloqueio por tentativas (RN05): senha ou código errados, numa contagem só. */
  tentativasErradas: integer().notNull().default(0),
  bloqueadaAte: dataHora(),
  ultimoAcesso: dataHora(),
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

/**
 * Senhas anteriores da equipe (RN47): a senha nova não pode repetir as últimas N
 * (equipe.senhas_anteriores_bloqueadas). Guarda só o hash, inclusive o da senha atual,
 * e só as N mais recentes de cada pessoa.
 */
export const senhaAnterior = pgTable(
  "senha_anterior",
  {
    id: idUuid(),
    pessoaId: uuid()
      .notNull()
      .references(() => pessoaEquipe.id, { onDelete: "cascade" }),
    senhaHash: text().notNull(),
    criadaEm: dataHora().notNull().defaultNow(),
  },
  (t) => [index().on(t.pessoaId, t.criadaEm)],
);
