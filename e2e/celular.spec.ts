import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

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

test.describe("no celular", { tag: "@celular" }, () => {
  test.skip(({ isMobile }) => !isMobile, "só vale no projeto celular");

  test("entrar no painel e abrir o menu pelo botão, sem rolagem lateral", async ({ page }) => {
    await page.goto("/painel/entrar");
    await semRolagemLateral(page);

    await page.getByLabel("E-mail de trabalho").fill(pessoas.adm.email);
    await page.getByLabel("Senha").fill(pessoas.adm.senha);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.getByRole("button", { name: "Continuar" }).click(),
    ]);
    await page.getByLabel("Número 1 de 6").fill(await codigoTotp(pessoas.adm.segredoTotp));
    await page.getByRole("button", { name: "Confirmar e entrar" }).click();
    await expect(page).toHaveURL(/\/painel$/);
    await semRolagemLateral(page);

    // No celular o menu começa fechado e só abre pelo botão.
    const menu = page.getByRole("navigation", { name: "Menu do painel" });
    await expect(menu).toBeHidden();
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Conteúdos" }).click();

    await expect(page).toHaveURL(/\/painel\/conteudos$/);
    await expect(menu).toBeHidden();
    await semRolagemLateral(page);
  });
});
