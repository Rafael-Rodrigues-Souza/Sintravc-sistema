import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { conteudo } from "./conteudo";
import { pessoaEquipe } from "./equipe";

export const estadoComunicado = pgEnum("estado_comunicado", ["rascunho", "agendado", "publicado", "encerrado"]);

/**
 * Comunicado: a faixa no topo de todas as páginas do site (spec §2.2, RN14, C3, E58). Não é Conteudo.
 * - O site mostra o que está agendado ou publicado com `inicio ≤ agora < fim`, na ordem da fila: a
 *   faixa entra e sai pelo relógio, mesmo se a tarefa T02 atrasar. A T02 só acerta o `estado` e grava
 *   a Atividade.
 * - No rascunho, as datas podem ficar vazias; são cobradas ao agendar ou publicar.
 * - `encerrado_em` é quando saiu do ar (no fim ou pelo “Encerrar agora”); `encerrado_por` fica vazio
 *   quando quem encerrou foi o sistema, no fim do período.
 * - `criado_por` decide quem pode excluir o rascunho nunca publicado (E07).
 */
export const comunicado = pgTable(
  "comunicado",
  {
    id: idUuid(),
    mensagem: text().notNull(),
    linkConteudoId: uuid().references(() => conteudo.id, { onDelete: "set null" }),
    linkUrl: text(),
    inicio: dataHora(),
    fim: dataHora(),
    ordemFila: integer().notNull(),
    estado: estadoComunicado().notNull().default("rascunho"),
    jaPublicado: boolean().notNull().default(false),
    publicadoEm: dataHora(),
    encerradoEm: dataHora(),
    encerradoPor: uuid().references(() => pessoaEquipe.id),
    criadoPor: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    atualizadoPor: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    ...datas,
  },
  (tabela) => [
    index().on(tabela.estado, tabela.ordemFila),
    check("comunicado_um_link_so", sql`${tabela.linkConteudoId} IS NULL OR ${tabela.linkUrl} IS NULL`),
    check("comunicado_mensagem_ate_140", sql`char_length(${tabela.mensagem}) <= 140`),
    check("comunicado_fim_depois_do_inicio", sql`${tabela.inicio} IS NULL OR ${tabela.fim} IS NULL OR ${tabela.fim} > ${tabela.inicio}`),
    check(
      "comunicado_periodo_fora_do_rascunho",
      sql`${tabela.estado} = 'rascunho' OR (${tabela.inicio} IS NOT NULL AND ${tabela.fim} IS NOT NULL)`,
    ),
  ],
);
