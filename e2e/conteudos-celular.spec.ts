import { expect, test, type Page } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import { apertar } from "./entrar";
import { assentar, entrarComo, pessoas, semAnimacao, semRolagemLateral, telaEstreita, TOLERANCIA } from "./responsivo";

/**
 * Conteúdos no celular e no tablet em pé (E49; Figma M 120:3650): calendário pelo ícone do título,
 * filtros numa folha aberta pelo ícone da busca, abas numa linha que rola só por dentro e lista em
 * cartões. Criar conteúdo fica no “+” da barra de baixo. Nos perfis largos, a tela é a do desktop.
 */

const principal = (page: Page) => page.getByRole("main");
const abas = (page: Page) => page.getByRole("navigation", { name: "Tipos de conteúdo" });

/** No desktop, estreita a janela até logo abaixo do menu lateral; nos perfis, fica no tamanho deles. */
async function janelaEstreitaNoDesktop(page: Page, projeto: string) {
  if (projeto !== "chromium") return;
  await page.setViewportSize({ width: RESPONSIVO.menuLateralAPartirDe - 1, height: page.viewportSize()!.height });
  await assentar(page);
}

test.describe("Conteúdos no celular", { tag: "@responsivo" }, () => {
  test("filtrar pela folha de filtros, rolar as abas e abrir o calendário pelo ícone", async ({ page, hasTouch }, testInfo) => {
    // Um rascunho próprio, para o filtro ter o que achar sem depender de outro teste.
    const manchete = `Plantão do jurídico no celular (${testInfo.project.name}, tentativa ${testInfo.retry})`;
    await entrarComo(page, pessoas.adm, "/painel/conteudos/noticia/nova", { toque: hasTouch });
    await page.getByLabel("Manchete").fill(manchete);
    await expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");
    await page.goto("/painel/conteudos");
    await janelaEstreitaNoDesktop(page, testInfo.project.name);

    if (!telaEstreita(page)) {
      // Tablet deitado, notebook e computador: filtros em linha, Lista/Calendário e “Criar conteúdo” no topo.
      await expect(principal(page).getByRole("navigation", { name: "Modo de ver" })).toBeVisible();
      await expect(principal(page).getByRole("button", { name: "Criar conteúdo" })).toBeVisible();
      await expect(principal(page).getByRole("combobox", { name: /Estado/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Filtros/ })).toBeHidden();
      return;
    }

    // O topo é o do Figma: título e ícone do calendário; criar é pelo “+” da barra de baixo.
    await expect(principal(page).getByRole("navigation", { name: "Modo de ver" })).toBeHidden();
    await expect(principal(page).getByRole("button", { name: "Criar conteúdo" })).toBeHidden();
    await expect(principal(page).getByRole("combobox", { name: /Estado/ })).toBeHidden();
    await semRolagemLateral(page);

    // Abas numa linha só: rolam por dentro, sem a página rolar para o lado.
    await expect(abas(page).getByRole("link", { name: /Todos/ })).toBeVisible();
    const centros = await abas(page).getByRole("link").evaluateAll((links) => links.map((l) => l.getBoundingClientRect()).map((r) => r.top + r.height / 2));
    expect(centros.length).toBeGreaterThan(1);
    expect(Math.max(...centros) - Math.min(...centros), "as abas ficam numa linha só").toBeLessThan(TOLERANCIA.mesmaLinha);
    const arquivados = abas(page).getByRole("link", { name: /Arquivados/ });
    await arquivados.scrollIntoViewIfNeeded();
    await expect(arquivados).toBeInViewport({ ratio: 1 });
    await semRolagemLateral(page);

    // Filtros: o ícone da busca abre a folha; a escolha vale na hora e o ícone conta os ativos.
    const botaoFiltros = page.getByRole("button", { name: /^Filtros/ });
    await expect(botaoFiltros).toHaveAccessibleName("Filtros");
    await apertar(botaoFiltros, hasTouch);
    const folha = page.getByRole("dialog", { name: "Filtros" });
    await expect(folha).toBeVisible();
    await folha.getByRole("combobox", { name: /Estado/ }).selectOption({ label: "Rascunho" });
    await expect(page).toHaveURL(/estado=rascunho/);
    await expect(folha.getByRole("combobox", { name: /Estado/ })).toHaveValue("rascunho");
    await apertar(folha.getByRole("button", { name: "Ver resultados" }), hasTouch);
    await expect(folha).toBeHidden();
    await expect(page.getByRole("button", { name: "Filtros, 1 ativo" })).toBeVisible();

    // A lista vem em cartões, com o tipo, o estado e o título.
    const busca = page.getByRole("searchbox", { name: "Buscar conteúdo" });
    await busca.fill(manchete);
    await busca.press("Enter");
    await expect(page).toHaveURL(/busca=/);
    const titulo = page.getByRole("link", { name: manchete, exact: true });
    await expect(titulo).toBeVisible();
    const cartao = page.locator("tr").filter({ has: titulo });
    await expect(cartao.getByText("Notícia", { exact: true })).toBeVisible();
    await expect(cartao.getByTestId("selo-estado")).toHaveText(/Rascunho/i);
    await semRolagemLateral(page);

    // Limpar pela folha tira os filtros dela e mantém a busca.
    await apertar(page.getByRole("button", { name: "Filtros, 1 ativo" }), hasTouch);
    await semAnimacao(page);
    await apertar(folha.getByRole("link", { name: "Limpar filtros" }), hasTouch);
    await expect(page).not.toHaveURL(/estado=/);
    await expect(page).toHaveURL(/busca=/);
    await expect(folha).toBeHidden();
    await expect(page.getByRole("button", { name: "Filtros" })).toBeVisible();
    await page.goto("/painel/conteudos");

    // Calendário pelo ícone do título, e de volta à lista.
    await apertar(principal(page).getByRole("link", { name: "Ver calendário" }), hasTouch);
    await expect(page).toHaveURL(/visao=calendario/);
    await semRolagemLateral(page);
    await apertar(principal(page).getByRole("link", { name: "Ver lista" }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/conteudos$/);
  });
});
