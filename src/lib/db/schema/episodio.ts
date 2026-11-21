import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { categoria } from "./conteudo";
import { pessoaEquipe } from "./equipe";
import { midia } from "./midia";

export const estadoEpisodio = pgEnum("estado_episodio", ["rascunho", "agendado", "publicado"]);

/**
 * Episódio do Rádio Chofer (spec §2.2, RN17, E61). Nenhum vídeo é guardado: só o id do YouTube.
 * - O site mostra o agendado ou publicado com `exibicao_em ≤ agora` (segue o relógio, como o E58);
 *   a T03 só acerta o `estado` e grava a Atividade.
 * - `exibicao_em` pode ficar vazia só no rascunho.
 * - A capa é a do YouTube (servida pela rota do site) ou a imagem da Mídia em `capa_midia_id`.
 * - `ultimo_programa`: só um true, pelo índice único parcial (R12).
 * - `titulo_youtube` e `canal_youtube` guardam o que o oEmbed devolveu, para o quadro “Vídeo encontrado”.
 */
export const episodio = pgTable(
  "episodio",
  {
    id: idUuid(),
    numero: integer().notNull().unique(),
    youtubeId: text().notNull().unique(),
    titulo: text().notNull(),
    tituloYoutube: text(),
    canalYoutube: text(),
    resumo: text(),
    temaCategoriaId: uuid().references(() => categoria.id, { onDelete: "set null" }),
    exibicaoEm: dataHora(),
    duracaoSeg: integer(),
    capaMidiaId: uuid().references(() => midia.id),
    transcricao: text(),
    ultimoPrograma: boolean().notNull().default(false),
    estado: estadoEpisodio().notNull().default("rascunho"),
    jaPublicado: boolean().notNull().default(false),
    publicadoEm: dataHora(),
    criadoPor: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    atualizadoPor: uuid()
      .notNull()
      .references(() => pessoaEquipe.id),
    ...datas,
  },
  (tabela) => [
    index().on(tabela.estado, tabela.exibicaoEm),
    uniqueIndex("episodio_um_ultimo_programa").on(tabela.ultimoPrograma).where(sql`${tabela.ultimoPrograma}`),
    check("episodio_numero_positivo", sql`${tabela.numero} > 0`),
    check("episodio_youtube_id_formato", sql`${tabela.youtubeId} ~ '^[A-Za-z0-9_-]{11}$'`),
    check("episodio_titulo_ate_120", sql`char_length(${tabela.titulo}) BETWEEN 1 AND 120`),
    check("episodio_resumo_ate_200", sql`${tabela.resumo} IS NULL OR char_length(${tabela.resumo}) <= 200`),
    check(
      "episodio_transcricao_ate_150000",
      sql`${tabela.transcricao} IS NULL OR char_length(${tabela.transcricao}) <= 150000`,
    ),
    check("episodio_duracao_positiva", sql`${tabela.duracaoSeg} IS NULL OR ${tabela.duracaoSeg} > 0`),
    check("episodio_exibicao_fora_do_rascunho", sql`${tabela.estado} = 'rascunho' OR ${tabela.exibicaoEm} IS NOT NULL`),
  ],
);
