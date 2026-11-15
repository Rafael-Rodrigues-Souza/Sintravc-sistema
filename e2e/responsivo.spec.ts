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

    // Abaixo do menu lateral, a navegação é a barra de baixo (E49); acima, o menu lateral.
    const menu = telaEstreita(page)
      ? page.getByRole("navigation", { name: "Navegação do painel" })
      : page.getByRole("navigation", { name: "Menu do painel" });
    await expect(menu).toBeVisible();
    await apertar(menu.getByRole("link", { name: "Conteúdos" }), hasTouch);

    await expect(page).toHaveURL(/\/painel\/conteudos$/);
    await expect(page.getByRole("heading", { name: "Conteúdos", level: 1 })).toBeVisible();
    await semRolagemLateral(page);
  });
});
