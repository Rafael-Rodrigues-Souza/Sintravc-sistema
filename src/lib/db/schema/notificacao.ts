import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { pessoaEquipe } from "./equipe";

/**
 * Notificações do painel (spec §2; RN59, E21). O sino e o painel lateral chegam no #23; quem
 * grava agora é a publicação agendada que falhou (#10). A limpeza de 90 dias é do #25 (E25).
 */
export const notificacaoEquipe = pgTable(
  "notificacao_equipe",
  {
    id: idUuid(),
    pessoaId: uuid()
      .notNull()
      .references(() => pessoaEquipe.id, { onDelete: "cascade" }),
    /** O que aconteceu, no formato área.evento (ex.: "noticia.agendamento_falhou"). */
    tipo: text().notNull(),
    texto: text().notNull(),
    /** Endereço no painel para resolver (ex.: o editor da notícia). */
    link: text(),
    lidaEm: dataHora(),
    ...datas,
  },
  (tabela) => [index().on(tabela.pessoaId, tabela.lidaEm)],
);
