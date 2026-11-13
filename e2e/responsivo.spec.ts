import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm", PessoaDeTeste>;

async function semRolagemLateral(page: Page) {
  const { conteudo, tela } = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(conteudo, "a página não pode rolar para o lado").toBeLessThanOrEqual(tela);
}

/** Toca no celular e no tablet; clica com o mouse no notebook e no desktop. */
async function apertar(alvo: Locator, toque: boolean) {
  if (toque) await alvo.tap();
  else await alvo.click();
}

// Roda no desktop e nos projetos celular, tablet e notebook (E48).
test.describe("em qualquer tamanho de tela", { tag: "@responsivo" }, () => {
  test("entrar no painel e chegar a Conteúdos pelo menu, sem rolagem lateral", async ({ page, hasTouch }, testInfo) => {
    await page.goto("/painel/entrar");
    await semRolagemLateral(page);

    await page.getByLabel("E-mail de trabalho").fill(pessoas.adm.email);
    await page.getByLabel("Senha").fill(pessoas.adm.senha);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      apertar(page.getByRole("button", { name: "Continuar" }), hasTouch),
    ]);
    await page.getByLabel("Número 1 de 6").fill(await codigoTotp(pessoas.adm.segredoTotp));
    await apertar(page.getByRole("button", { name: "Confirmar e entrar" }), hasTouch);
    await expect(page).toHaveURL(/\/painel$/);
    await semRolagemLateral(page);

    // Em tela estreita o menu começa fechado e abre pelo botão; em tela larga ele fica à vista.
    const menu = page.getByRole("navigation", { name: "Menu do painel" });
    const botaoMenu = page.getByRole("button", { name: "Menu", exact: true });
    if (await botaoMenu.isVisible()) {
      await expect(menu).toBeHidden();
      await apertar(botaoMenu, hasTouch);
    }
    await expect(menu).toBeVisible();
    await apertar(menu.getByRole("link", { name: "Conteúdos" }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/conteudos$/);
    await expect(page.getByRole("heading", { name: "Conteúdos", level: 1 })).toBeVisible();
    await semRolagemLateral(page);

    if (testInfo.project.name === "tablet") {
      // Gira o tablet sem recarregar: deitado, o menu lateral aparece; em pé de novo, volta o botão.
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(menu).toBeVisible();
      await expect(botaoMenu).toBeHidden();
      await semRolagemLateral(page);

      await page.setViewportSize({ width: 800, height: 1280 });
      await expect(botaoMenu).toBeVisible();
      await expect(menu).toBeHidden();
      await semRolagemLateral(page);
    }
  });
});
