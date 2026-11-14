import { expect, test } from "@playwright/test";

import { apertar, entrarNoPainel } from "./entrar";
import { pessoas, semRolagemLateral, telaEstreita } from "./responsivo";

// Roda no desktop e em cada perfil de RESPONSIVO do playwright.config.ts (E48).
test.describe("em qualquer tamanho de tela", { tag: "@responsivo" }, () => {
  test("entrar no painel e chegar a Conteúdos pelo menu, sem rolagem lateral", async ({ page, hasTouch }) => {
    await page.goto("/painel/entrar");
    await semRolagemLateral(page);
    await entrarNoPainel(page, pessoas.adm, { toque: hasTouch });
    await expect(page).toHaveURL(/\/painel$/);
    await semRolagemLateral(page);

    const menu = page.getByRole("navigation", { name: "Menu do painel" });
    const botaoMenu = page.getByRole("button", { name: "Menu", exact: true });
    if (telaEstreita(page)) {
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
