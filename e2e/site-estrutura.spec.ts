import { expect, test, type Page } from "@playwright/test";

import { apertar } from "./entrar";
import { janelaEstreitaNoDesktop, semAnimacao, semRolagemLateral, telaEstreita } from "./responsivo";

/**
 * Estrutura do site público na Fase 1 (#13): cabeçalho, menu mobile, rodapé, Filiar-se e aviso de
 * cookies (RF07, RF09; N13, E01, E56). Os dados de contato vêm da ConfigSite do seed (RN43).
 */

const TELEFONE = "(77) 3423-4959";
const WHATSAPP = "https://wa.me/557734234959";
const FILIACAO = `${WHATSAPP}?text=${encodeURIComponent("Olá! Quero me filiar ao SINTRAVC.")}`;

const avisoCookies = (page: Page) => page.getByRole("region", { name: "Aviso de cookies" });
const menuPrincipal = (page: Page) => page.getByRole("navigation", { name: "Principal" });
const rodape = (page: Page) => page.getByRole("contentinfo");

/** Já com a escolha feita, para o aviso não cobrir o rodapé nos testes que não são dele. */
async function semAviso(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([{ name: "sintravc_cookies", value: "essenciais", url: baseURL! }]);
}

test.describe("cabeçalho e rodapé do site (desktop)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
  });

  test("contato da ConfigSite na barra superior e no rodapé, e Filiar-se com a mensagem pronta (CA-US05.1, CA-US06.1)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("barra-telefone")).toHaveText(TELEFONE);
    await expect(rodape(page).getByTestId("rodape-telefone")).toHaveText(TELEFONE);
    await expect(rodape(page)).toContainText("Rua Laudicéia Gusmão, 586 - Centro, Vitória da Conquista - BA");

    const filiar = page.getByRole("link", { name: "Filiar-se pelo WhatsApp" });
    await expect(filiar).toHaveCount(2); // cabeçalho e rodapé
    for (const link of await filiar.all()) {
      await expect(link).toHaveAttribute("href", FILIACAO);
      await expect(link).toHaveAttribute("target", "_blank");
    }

    // Fase 1: nada de “Entrar” no cabeçalho, no menu ou no rodapé (E01).
    await expect(page.getByRole("link", { name: /entrar/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /entrar/i })).toHaveCount(0);
  });

  test("menu principal com o mouse: Sindicato abre o submenu, com Instituição, Diretoria e Benefícios", async ({ page }) => {
    await page.goto("/");
    const inicio = menuPrincipal(page).getByRole("link", { name: "Início" });
    await expect(inicio).toHaveAttribute("aria-current", "page");

    const sindicato = menuPrincipal(page).getByRole("button", { name: "Sindicato" });
    await expect(sindicato).toHaveAttribute("aria-expanded", "false");
    await sindicato.click();
    await expect(sindicato).toHaveAttribute("aria-expanded", "true");
    await expect(menuPrincipal(page).getByRole("link", { name: "Instituição" })).toHaveAttribute("href", "/sindicato/instituicao");
    await expect(menuPrincipal(page).getByRole("link", { name: "Diretoria" })).toHaveAttribute("href", "/sindicato/diretoria");
    await expect(menuPrincipal(page).getByRole("link", { name: "Benefícios" })).toBeVisible();
  });

  test("teclado: pular para o conteúdo, abrir o submenu com Enter e fechar com Esc", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(pular).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#conteudo")).toBeFocused();

    const documentos = menuPrincipal(page).getByRole("button", { name: "Documentos" });
    await documentos.focus();
    await page.keyboard.press("Enter");
    await expect(documentos).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await expect(menuPrincipal(page).getByRole("link", { name: "Acordos coletivos" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(documentos).toHaveAttribute("aria-expanded", "false");
    await expect(documentos).toBeFocused();
  });
});

test.describe("aviso de cookies (CA-US08.2, E56)", () => {
  test("aparece na primeira visita; depois de aceitar, não volta; o link Cookies do rodapé reabre", async ({ page, context }) => {
    await page.goto("/");
    await expect(avisoCookies(page)).toBeVisible();
    await expect(avisoCookies(page).getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/politica-de-privacidade");

    await avisoCookies(page).getByRole("button", { name: "Aceitar todos" }).click();
    await expect(avisoCookies(page)).toBeHidden();
    await expect.poll(async () => (await context.cookies()).find((c) => c.name === "sintravc_cookies")?.value).toBe("todos");

    await page.reload();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(avisoCookies(page)).toBeHidden();

    // A escolha vale pelo tempo do Parametro (365 dias no seed).
    const cookie = (await context.cookies()).find((c) => c.name === "sintravc_cookies")!;
    const dias = (cookie.expires * 1000 - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(364);
    expect(dias).toBeLessThanOrEqual(365);

    await rodape(page).getByRole("button", { name: "Cookies" }).click();
    await expect(avisoCookies(page)).toBeVisible();
    await expect(avisoCookies(page)).toBeFocused();
    await expect(avisoCookies(page).getByRole("button", { name: "Aceitar todos" })).toHaveAttribute("aria-pressed", "true");
    await avisoCookies(page).getByRole("button", { name: "Só essenciais" }).click();
    await expect(avisoCookies(page)).toBeHidden();
    await expect.poll(async () => (await context.cookies()).find((c) => c.name === "sintravc_cookies")?.value).toBe("essenciais");
  });
});

test.describe("menu mobile do visitante", { tag: "@responsivo" }, () => {
  test("abre com as seções e Filiar-se pelo WhatsApp, sem Entrar, e fecha pelo X e pelo Esc (CA-US08.1)", async ({ page, hasTouch, baseURL }, testInfo) => {
    await semAviso(page, baseURL);
    await page.goto("/");
    await janelaEstreitaNoDesktop(page, testInfo.project.name);
    await semRolagemLateral(page);

    const abrir = page.getByRole("button", { name: "Abrir menu" });
    if (!telaEstreita(page)) {
      // Tablet deitado, notebook e computador: menu principal no cabeçalho, sem o botão do menu.
      await expect(menuPrincipal(page)).toBeVisible();
      await expect(abrir).toBeHidden();
      return;
    }

    await expect(menuPrincipal(page)).toBeHidden();
    await apertar(abrir, hasTouch);
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await semAnimacao(page);

    for (const nome of ["Início", "Notícias", "Rádio Chofer", "Contato"]) {
      await expect(menu.getByRole("link", { name: nome, exact: true })).toBeVisible();
    }
    await expect(menu.getByRole("link", { name: "Início", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(menu.getByRole("link", { name: /entrar/i })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Filiar-se pelo WhatsApp" })).toHaveAttribute("href", FILIACAO);

    // Sindicato abre e fecha no toque, com aria-expanded.
    const sindicato = menu.getByRole("button", { name: "Sindicato" });
    await expect(sindicato).toHaveAttribute("aria-expanded", "false");
    await expect(menu.getByRole("link", { name: "Diretoria" })).toBeHidden();
    await apertar(sindicato, hasTouch);
    await expect(sindicato).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: "Diretoria" })).toBeVisible();

    await apertar(menu.getByRole("button", { name: "Fechar menu" }), hasTouch);
    await expect(menu).toBeHidden();
    await expect(abrir).toBeFocused();

    await apertar(abrir, hasTouch);
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

test.describe("Sindicato: Instituição e Diretoria (US07)", { tag: "@responsivo" }, () => {
  test("chegar pelo menu, usar a linha do tempo como índice da história e trocar de aba", async ({ page, hasTouch, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/");

    // Pelo menu, como a pessoa faria: submenu no desktop, menu mobile no celular.
    if (telaEstreita(page)) {
      await apertar(page.getByRole("button", { name: "Abrir menu" }), hasTouch);
      const menu = page.getByRole("dialog", { name: "Menu" });
      await apertar(menu.getByRole("button", { name: "Sindicato" }), hasTouch);
      await apertar(menu.getByRole("link", { name: "Instituição" }), hasTouch);
    } else {
      await apertar(menuPrincipal(page).getByRole("button", { name: "Sindicato" }), hasTouch);
      await apertar(menuPrincipal(page).getByRole("link", { name: "Instituição" }), hasTouch);
    }
    await expect(page).toHaveURL(/\/sindicato\/instituicao$/);
    await expect(page.getByRole("heading", { level: 1, name: "Juntos, somos mais fortes." })).toBeVisible();
    await semRolagemLateral(page);

    // Ano de fundação confirmado (1993) e o que falta como marcador visível.
    await expect(page.getByRole("region", { name: "O SINTRAVC em números" })).toContainText("1993");
    await expect(page.getByRole("main").locator("[data-marcador]").first()).toBeVisible();

    // A linha do tempo leva ao subtítulo do texto da história.
    const linha = page.getByRole("navigation", { name: "Linha do tempo" });
    await apertar(linha.getByRole("link", { name: /Marco de crescimento/ }), hasTouch);
    await expect(page).toHaveURL(/#marco-de-crescimento$/);
    await expect(page.locator("h3#marco-de-crescimento")).toBeInViewport();

    // Aba Diretoria.
    const abas = page.getByRole("navigation", { name: "Sindicato" });
    await expect(abas.getByRole("link", { name: "Instituição" })).toHaveAttribute("aria-current", "page");
    await apertar(abas.getByRole("link", { name: "Diretoria" }), hasTouch);
    await expect(page).toHaveURL(/\/sindicato\/diretoria$/);
    await expect(page.getByRole("heading", { level: 1, name: "Diretoria" })).toBeVisible();
    await semRolagemLateral(page);
  });

  test("Diretoria: presidente e vice em destaque, os outros 7 em cartões e o WhatsApp da recepção", async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/sindicato/diretoria");
    await expect(page.getByRole("article", { name: "Presidente" }).getByRole("heading", { name: "Álvaro Silva Souza" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Vice-presidente" }).getByRole("heading", { name: "Eduardo Cesar Dutra de Oliveira" })).toBeVisible();

    const grade = page.getByRole("region", { name: "Nossa diretoria" }).getByRole("listitem");
    await expect(grade).toHaveCount(8); // 7 pessoas e o cartão “Quer falar com a diretoria?”
    await expect(grade.filter({ hasText: "José Evaristo Pereira Neto" })).toContainText("Diretor Jurídico");
    await expect(page.getByRole("link", { name: "Fale no WhatsApp" })).toHaveAttribute("href", WHATSAPP);
    await expect(page.getByText("9", { exact: true })).toBeVisible();
    await semRolagemLateral(page);
  });
});
