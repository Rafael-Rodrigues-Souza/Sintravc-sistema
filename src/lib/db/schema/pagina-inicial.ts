import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { pessoaEquipe } from "./equipe";
import { midia } from "./midia";

export const versaoDestaque = pgEnum("versao_destaque", ["rascunho", "publicado"]);
export const tipoItemDestaque = pgEnum("tipo_item_destaque", ["noticia", "episodio", "programa", "chamada"]);
/** Para onde vai o botão da Chamada (E63): lista fechada de endereços do site. A #19 acrescenta o benefício ou parceiro. */
export const destinoChamada = pgEnum("destino_chamada", ["filie_se", "beneficios"]);

/**
 * Destaques da Home (spec §2.2, RF46, R8, E13, E62). Só a área Página inicial controla.
 * - Cada linha existe duas vezes: no `rascunho` (o que a equipe edita, salvo sozinho) e no
 *   `publicado` (o que o site mostra). “Publicar alterações” copia o rascunho para o publicado.
 * - Carrossel: até `home.carrossel_maximo` itens, sempre escolhidos. O site segue o relógio:
 *   mostra o item com `entra_em ≤ agora < sai_em` (vazios = sem limite). A T04 só grava a Atividade.
 * - A lista “Em destaque” saiu do site e do painel (E63, #75).
 * - `chamada` (E63): slide escrito pela Comunicação, com foto da Mídia (`foto_midia_id`, `foto_alt`),
 *   a frase (`frase_chamada`), o texto de apoio, o texto do botão (vazio = o padrão do destino) e o
 *   destino. O `item_id` é gerado no painel e identifica a Chamada no rascunho e no publicado; a foto
 *   fica presa pelo MidiaUso (`dono_tipo = 'destaque'`, `dono_id` = esse `item_id`).
 * - `programa` é o slide do programa Rádio Chofer, sem `item_id`.
 * - `frase_chamada`: frase opcional do carrossel, escrita pela Comunicação; no site, aparece no lugar da
 *   linha fina. O limite vem de `home.frase_chamada_maximo` (E62, #75).
 */
export const destaqueHome = pgTable(
  "destaque_home",
  {
    id: idUuid(),
    versao: versaoDestaque().notNull(),
    posicao: integer().notNull(),
    itemTipo: tipoItemDestaque().notNull(),
    itemId: uuid(),
    entraEm: dataHora(),
    saiEm: dataHora(),
    fraseChamada: text(),
    fotoMidiaId: uuid().references(() => midia.id, { onDelete: "restrict" }),
    fotoAlt: text(),
    textoApoio: text(),
    botaoTexto: text(),
    destino: destinoChamada(),
    escolhidoPor: uuid().references(() => pessoaEquipe.id),
    ...datas,
  },
  (t) => [
    uniqueIndex().on(t.versao, t.posicao),
    check("destaque_home_posicao_positiva", sql`${t.posicao} >= 1`),
    check(
      "destaque_home_item_coerente",
      sql`(${t.itemTipo}::text = 'programa' AND ${t.itemId} IS NULL) OR (${t.itemTipo}::text IN ('noticia', 'episodio', 'chamada') AND ${t.itemId} IS NOT NULL)`,
    ),
    check(
      "destaque_home_chamada_completa",
      sql`(${t.itemTipo}::text = 'chamada') = (${t.fotoMidiaId} IS NOT NULL)
        AND (${t.itemTipo}::text <> 'chamada' OR (${t.fraseChamada} IS NOT NULL AND btrim(coalesce(${t.fotoAlt}, '')) <> '' AND btrim(coalesce(${t.textoApoio}, '')) <> '' AND ${t.destino} IS NOT NULL))
        AND (${t.itemTipo}::text = 'chamada' OR (${t.fotoAlt} IS NULL AND ${t.textoApoio} IS NULL AND ${t.botaoTexto} IS NULL AND ${t.destino} IS NULL))`,
    ),
    check("destaque_home_frase_nao_vazia", sql`${t.fraseChamada} IS NULL OR btrim(${t.fraseChamada}) <> ''`),
    check("destaque_home_sai_depois_de_entrar", sql`${t.entraEm} IS NULL OR ${t.saiEm} IS NULL OR ${t.saiEm} > ${t.entraEm}`),
  ],
);

/**
 * Controle do rascunho da Home (E62). Registro único, `id = 'home'`.
 * - `revisao` sobe a cada salvamento que muda algo e detecta o conflito entre duas pessoas.
 * - O aviso de alterações não publicadas compara o rascunho com o publicado, não a revisão.
 */
export const paginaInicial = pgTable(
  "pagina_inicial",
  {
    id: text().primaryKey().default("home"),
    revisao: integer().notNull().default(0),
    salvoEm: dataHora(),
    salvoPor: uuid().references(() => pessoaEquipe.id),
    publicadoEm: dataHora(),
    publicadoPor: uuid().references(() => pessoaEquipe.id),
    ...datas,
  },
  (t) => [check("pagina_inicial_registro_unico", sql`${t.id} = 'home'`)],
);
