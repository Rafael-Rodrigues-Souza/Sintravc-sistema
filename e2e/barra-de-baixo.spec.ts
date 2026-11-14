import { expect, test, type Page } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import { apertar } from "./entrar";
import { assentar, entrarComo, pessoas, semAnimacao, semRolagemLateral, telaEstreita } from "./responsivo";

/**
 * Painel no celular e no tablet em pé (E49; Figma M 119:3528 e M 120:3650): barra de baixo, “Mais”
 * e “+”. Roda em cada perfil de RESPONSIVO; no desktop (“chromium”), a janela vai para logo abaixo
 * de RESPONSIVO.menuLateralAPartirDe, onde a barra tem de aparecer, e para essa largura, onde some.
 */

const barra = (page: Page) => page.getByRole("navigation", { name: "Navegação do painel" });
const menuLateral = (page: Page) => page.getByRole("navigation", { name: "Menu do painel" });
const folhaMais = (page: Page) => page.getByRole("dialog", { name: "Mais" });

/** Toca (ou clica) num ponto da tela: o “fora” da folha, no fundo escurecido. */
async function tocarEm(page: Page, x: number, y: number, toque: boolean) {
  if (toque) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** No desktop, estreita a janela até logo abaixo do menu lateral; nos perfis, fica no tamanho deles. */
async function janelaEstreitaNoDesktop(page: Page, projeto: string) {
  if (projeto !== "chromium") return;
  await page.setViewportSize({ width: RESPONSIVO.menuLateralAPartirDe - 1, height: page.viewportSize()!.height });
  await assentar(page);
}

test.describe("barra de baixo do painel", { tag: "@responsivo" }, () => {
  test("navegar pela barra e pelo “Mais”, que abre em folha e fecha ao tocar fora, ao arrastar e ao escolher", async ({ page, hasTouch }, testInfo) => {
    await entrarComo(page, pessoas.adm, "/painel", { toque: hasTouch });
    await janelaEstreitaNoDesktop(page, testInfo.project.name);

    if (!telaEstreita(page)) {
      // Tablet deitado, notebook e computador: menu lateral, sem barra de baixo nem topo mobile.
      await expect(menuLateral(page)).toBeVisible();
      await expect(barra(page)).toBeHidden();
      await expect(page.getByRole("button", { name: "Buscar" })).toBeHidden();
      return;
    }

    await expect(menuLateral(page)).toBeHidden();
    await expect(barra(page)).toBeVisible();
    await expect(barra(page).getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
    await semRolagemLateral(page);

    // Busca e sino: como no Figma, mas travados até a #23 (E49); o toque mostra o aviso.
    const buscar = page.getByRole("button", { name: "Buscar" });
    await expect(buscar).toHaveAttribute("aria-disabled", "true");
    await expect(buscar).toHaveAccessibleDescription("Disponível em breve");
    // aria-disabled: o Playwright não toca sozinho num botão travado, mas a pessoa toca.
    await (hasTouch ? buscar.tap({ force: true }) : buscar.click({ force: true }));
    await expect(page.getByText("A busca do painel está disponível em breve.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Notificações" })).toHaveAttribute("aria-disabled", "true");

    await apertar(barra(page).getByRole("link", { name: "Conteúdos" }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/conteudos$/);
    await expect(barra(page).getByRole("link", { name: "Conteúdos" })).toHaveAttribute("aria-current", "page");
    await semRolagemLateral(page);

    await apertar(barra(page).getByRole("link", { name: "Comunicados" }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/comunicados$/);
    await expect(page.getByRole("heading", { name: "Esta área chega em breve" })).toBeVisible();

    // “Mais”: folha de altura parcial com o resto do menu; fecha ao tocar fora.
    const mais = barra(page).getByRole("button", { name: "Mais" });
    await apertar(mais, hasTouch);
    await expect(folhaMais(page)).toBeVisible();
    await semAnimacao(page);
    const caixa = (await folhaMais(page).boundingBox())!;
    expect(caixa.y, "a folha não ocupa a tela inteira").toBeGreaterThan(0);
    for (const area of ["Rádio Chofer", "Página inicial", "Benefícios", "Mídia", "Atividade", "Equipe e perfis", "Configurações"]) {
      await expect(folhaMais(page).getByRole("link", { name: area })).toBeVisible();
    }
    await expect(folhaMais(page).getByRole("link", { name: "Conteúdos" })).toHaveCount(0);
    await expect(folhaMais(page).getByRole("button", { name: "Sair do painel" })).toBeVisible();
    await tocarEm(page, caixa.width / 2, Math.max(8, caixa.y / 2), hasTouch);
    await expect(folhaMais(page)).toBeHidden();

    // Fecha ao arrastar para baixo, pela alça.
    await apertar(mais, hasTouch);
    await expect(folhaMais(page)).toBeVisible();
    await semAnimacao(page);
    const topo = (await folhaMais(page).boundingBox())!;
    await page.mouse.move(topo.x + topo.width / 2, topo.y + 8);
    await page.mouse.down();
    await page.mouse.move(topo.x + topo.width / 2, topo.y + topo.height * 0.8, { steps: 12 });
    await page.mouse.up();
    await expect(folhaMais(page)).toBeHidden();

    // Escolher um item leva à área, fecha a folha e marca o “Mais”.
    await apertar(mais, hasTouch);
    await apertar(folhaMais(page).getByRole("link", { name: "Mídia" }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/midia$/);
    await expect(folhaMais(page)).toBeHidden();
    await expect(mais).toHaveAttribute("aria-current", "page");
    await semRolagemLateral(page);

    // O avatar do topo também abre o “Mais”.
    await apertar(page.getByRole("button", { name: /Abrir o menu Mais/ }), hasTouch);
    await expect(folhaMais(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(folhaMais(page)).toBeHidden();
  });

  test("Comunicação: o “+” abre o menu Criar com Edital e Acordo travados, e o “Mais” não tem Administração", async ({ page, hasTouch }, testInfo) => {
    await entrarComo(page, pessoas.com, "/painel/conteudos", { toque: hasTouch });
    await janelaEstreitaNoDesktop(page, testInfo.project.name);
    test.skip(!telaEstreita(page), "a barra de baixo só existe abaixo do menu lateral");

    await apertar(barra(page).getByRole("button", { name: "Criar conteúdo" }), hasTouch);
    const criar = page.getByRole("dialog", { name: "Criar conteúdo" });
    await expect(criar).toBeVisible();
    await expect(criar.getByText("Para falar de um acordo ou edital, escreva uma notícia")).toBeVisible();
    await expect(criar.getByRole("link", { name: /Edital/ })).toHaveCount(0);
    await apertar(criar.getByRole("link", { name: /Notícia/ }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/conteudos\/noticia\/nova$/);
    // O editor tem barra própria: sem a barra de navegação nem o topo mobile (E49).
    await expect(barra(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "Buscar" })).toBeHidden();

    await page.goto("/painel");
    await apertar(barra(page).getByRole("button", { name: "Mais" }), hasTouch);
    await expect(folhaMais(page).getByRole("link", { name: "Mídia" })).toBeVisible();
    await expect(folhaMais(page).getByText("Administração")).toHaveCount(0);
    await expect(folhaMais(page).getByRole("link", { name: "Equipe e perfis" })).toHaveCount(0);
  });

  test("girar o tablet com o “Mais” aberto não deixa nada preso por cima", async ({ page, hasTouch }, testInfo) => {
    const perfil = RESPONSIVO.perfis[testInfo.project.name as keyof typeof RESPONSIVO.perfis];
    const girado = perfil && Object.values(RESPONSIVO.perfis).find((o) => o.toque && o.largura === perfil.altura && o.altura === perfil.largura);
    test.skip(!girado, "só nos tablets, que giram");
    const [emPe, deitado] = perfil.largura < perfil.altura ? [perfil, girado!] : [girado!, perfil];
    const posicao = (p: { largura: number; altura: number }) => ({ width: p.largura, height: p.altura });

    await entrarComo(page, pessoas.adm, "/painel/conteudos", { toque: hasTouch });
    await page.setViewportSize(posicao(emPe));
    await assentar(page);
    await apertar(barra(page).getByRole("button", { name: "Mais" }), hasTouch);
    await expect(folhaMais(page)).toBeVisible();

    // Deitado: o menu lateral volta e a folha fecha sozinha.
    await page.setViewportSize(posicao(deitado));
    await expect(menuLateral(page)).toBeVisible();
    await expect(folhaMais(page)).toBeHidden();
    await expect(barra(page)).toBeHidden();
    await semRolagemLateral(page);
    await apertar(menuLateral(page).getByRole("link", { name: "Mídia" }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/midia$/);

    // Em pé de novo: a barra volta e funciona.
    await page.setViewportSize(posicao(emPe));
    await expect(barra(page)).toBeVisible();
    await expect(menuLateral(page)).toBeHidden();
    await semRolagemLateral(page);
    await apertar(barra(page).getByRole("link", { name: "Conteúdos" }), hasTouch);
    await expect(page).toHaveURL(/\/painel\/conteudos$/);
  });
});
