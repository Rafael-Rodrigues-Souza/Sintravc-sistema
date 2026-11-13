import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { apertar, entrarNoPainel } from "./entrar";

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm", PessoaDeTeste>;

/** Projetos em que o painel é estreito (abaixo de lg) e o menu lateral vira o botão “Menu”. */
const MENU_PELO_BOTAO = ["celular", "tablet-em-pe"];

async function semRolagemLateral(page: Page) {
  const { conteudo, tela } = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(conteudo, "a página não pode rolar para o lado").toBeLessThanOrEqual(tela);
}

// Roda no desktop e em cada perfil de RESPONSIVO do playwright.config.ts (E48).
test.describe("em qualquer tamanho de tela", { tag: "@responsivo" }, () => {
  test("entrar no painel e chegar a Conteúdos pelo menu, sem rolagem lateral", async ({ page, hasTouch }, testInfo) => {
    await page.goto("/painel/entrar");
    await semRolagemLateral(page);
    await entrarNoPainel(page, pessoas.adm, { toque: hasTouch });
    await expect(page).toHaveURL(/\/painel$/);
    await semRolagemLateral(page);

    const menu = page.getByRole("navigation", { name: "Menu do painel" });
    const botaoMenu = page.getByRole("button", { name: "Menu", exact: true });
    if (MENU_PELO_BOTAO.includes(testInfo.project.name)) {
      // Tela estreita: o menu começa fechado e só abre pelo botão.
      await expect(menu).toBeHidden();
      await apertar(botaoMenu, hasTouch);
    } else {
      // Tela larga: o menu lateral fica à vista e não há botão.
      await expect(botaoMenu).toBeHidden();
    }
    await expect(menu).toBeVisible();
    await apertar(menu.getByRole("link", { name: "Conteúdos" }), hasTouch);

    await expect(page).toHaveURL(/\/painel\/conteudos$/);
    await expect(page.getByRole("heading", { name: "Conteúdos", level: 1 })).toBeVisible();
    await semRolagemLateral(page);
  });
});
