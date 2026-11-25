import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import { apertar } from "./entrar";
import { consultar } from "./radio";

/**
 * Ajudantes dos e2e da Página inicial (E62). A Home é uma só no banco: cada teste volta ao estado da
 * migração (só o slide do programa, no rascunho e no publicado), para não mexer na Home que os
 * outros specs abrem.
 */
export async function limparHome() {
  await consultar((sql) => sql`delete from destaque_home returning id`);
  await consultar(
    (sql) => sql`
      insert into destaque_home (versao, area, posicao, modo, item_tipo)
      values ('rascunho', 'carrossel', 1, 'escolhido', 'programa'), ('publicado', 'carrossel', 1, 'escolhido', 'programa')
      returning id`,
  );
  await consultar((sql) => sql`update pagina_inicial set revisao = revisao + 1, salvo_em = null, salvo_por = null returning id`);
  await consultar((sql) => sql`delete from episodio where titulo like 'Home e2e%' returning id`);
}

/** Um episódio no ar, direto no banco (o fluxo do episódio tem os próprios e2e, #17). */
export async function episodioNoAr(titulo: string) {
  const [criador] = await consultar((sql) => sql<{ id: string }[]>`select id from pessoa_equipe where perfil = 'COM' order by criado_em limit 1`);
  const [linha] = await consultar(
    (sql) => sql<{ id: string }[]>`
      insert into episodio (numero, youtube_id, titulo, estado, ja_publicado, exibicao_em, publicado_em, criado_por, atualizado_por)
      values (
        (select coalesce(max(numero), 0) + 1 from episodio), ${randomUUID().replace(/-/g, "").slice(0, 11)}, ${titulo},
        'publicado', true, now() - interval '1 day', now() - interval '1 day', ${criador!.id}, ${criador!.id})
      returning id`,
  );
  return linha!.id;
}

export const itensDoCarrossel = (page: Page) => page.getByTestId("item-carrossel");

/** Os títulos do carrossel no painel, na ordem. */
export async function ordemNoPainel(page: Page) {
  return (await itensDoCarrossel(page).locator("p.texto-titulo-card-pequeno").allTextContents()).map((t) => t.trim());
}

/** Os títulos dos slides da Home (site ou prévia), na ordem. */
export async function ordemNaHome(page: Page) {
  // O texto de verdade (o CSS põe o título em maiúsculas).
  return (await page.getByTestId("slide-home").getByRole("heading", { level: 2, includeHidden: true }).allTextContents()).map((t) => t.trim());
}

export async function esperarSalvo(page: Page) {
  await expect(page.getByTestId("status-do-salvamento")).toContainText(/Salvo automaticamente às|Salvo às/);
}

/**
 * “Adicionar destaque” pela tela: o tipo, a busca e a escolha na lista. As datas são opcionais
 * (valor do campo datetime-local, no horário da Bahia).
 */
export async function adicionarDestaquePelaTela(
  page: Page,
  { tipo, titulo, entraEm, saiEm }: { tipo: "Notícia" | "Episódio" | "Programa Rádio Chofer"; titulo?: string; entraEm?: string; saiEm?: string },
  { toque = false } = {},
) {
  await apertar(page.getByRole("button", { name: "Adicionar destaque" }), toque);
  const janela = page.getByRole("dialog", { name: "Adicionar destaque" });
  await expect(janela).toBeVisible();
  await apertar(janela.getByText(tipo, { exact: true }), toque);
  if (titulo) {
    await janela.getByLabel(tipo === "Episódio" ? "Buscar episódio" : "Buscar notícia").fill(titulo);
    await apertar(janela.getByRole("radio", { name: new RegExp(titulo) }).locator(".."), toque);
  }
  if (entraEm) await janela.getByLabel("Entra em").fill(entraEm);
  if (saiEm) await janela.getByLabel("Sai em").fill(saiEm);
  await apertar(janela.getByRole("button", { name: "Pôr no carrossel" }), toque);
  await expect(janela).toBeHidden();
}
