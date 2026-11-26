import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { dataHora, datas, idUuid } from "./comum";
import { pessoaEquipe } from "./equipe";

export const versaoDestaque = pgEnum("versao_destaque", ["rascunho", "publicado"]);
export const areaDestaque = pgEnum("area_destaque", ["carrossel", "lista"]);
export const modoDestaque = pgEnum("modo_destaque", ["auto", "escolhido"]);
export const tipoItemDestaque = pgEnum("tipo_item_destaque", ["noticia", "episodio", "programa"]);

/**
 * Destaques da Home (spec §2.2, RF46, R8, E13, E62). Só a área Página inicial controla.
 * - Cada linha existe duas vezes: no `rascunho` (o que a equipe edita, salvo sozinho) e no
 *   `publicado` (o que o site mostra). “Publicar alterações” copia o rascunho para o publicado.
 * - Carrossel: até `home.carrossel_maximo` itens, sempre escolhidos. O site segue o relógio:
 *   mostra o item com `entra_em ≤ agora < sai_em` (vazios = sem limite). A T04 só grava a Atividade.
 * - Lista “Em destaque”: `home.lista_posicoes` posições, só notícias. Posição sem linha é automática.
 * - `programa` é o slide do programa Rádio Chofer, sem `item_id`.
 * - `frase_chamada`: frase opcional do carrossel, escrita pela Comunicação; no site, aparece no lugar da
 *   linha fina. O limite vem de `home.frase_chamada_maximo` (E62, #75).
 */
export const destaqueHome = pgTable(
  "destaque_home",
  {
    id: idUuid(),
    versao: versaoDestaque().notNull(),
    area: areaDestaque().notNull(),
    posicao: integer().notNull(),
    modo: modoDestaque().notNull().default("escolhido"),
    itemTipo: tipoItemDestaque(),
    itemId: uuid(),
    entraEm: dataHora(),
    saiEm: dataHora(),
    fraseChamada: text(),
    escolhidoPor: uuid().references(() => pessoaEquipe.id),
    ...datas,
  },
  (t) => [
    uniqueIndex().on(t.versao, t.area, t.posicao),
    check("destaque_home_posicao_positiva", sql`${t.posicao} >= 1`),
    check("destaque_home_carrossel_escolhido", sql`${t.area} = 'lista' OR (${t.modo} = 'escolhido' AND ${t.itemTipo} IS NOT NULL)`),
    check("destaque_home_lista_so_noticia", sql`${t.area} = 'carrossel' OR ${t.itemTipo} IS NULL OR ${t.itemTipo} = 'noticia'`),
    check("destaque_home_lista_sem_datas", sql`${t.area} = 'carrossel' OR (${t.entraEm} IS NULL AND ${t.saiEm} IS NULL)`),
    check(
      "destaque_home_item_coerente",
      sql`(${t.modo} = 'auto' AND ${t.itemTipo} IS NULL AND ${t.itemId} IS NULL)
        OR (${t.modo} = 'escolhido' AND ${t.itemTipo} = 'programa' AND ${t.itemId} IS NULL)
        OR (${t.modo} = 'escolhido' AND ${t.itemTipo} IN ('noticia', 'episodio') AND ${t.itemId} IS NOT NULL)`,
    ),
    check("destaque_home_frase_so_no_carrossel", sql`${t.area} = 'carrossel' OR ${t.fraseChamada} IS NULL`),
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
