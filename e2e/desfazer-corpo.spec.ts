import { readFileSync } from "node:fs";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { apertar } from "./entrar";
import { assentar, entrarComo } from "./responsivo";

/**
 * Desfazer e Refazer do corpo da notícia (#50; E40, E42, E45, E47): o histórico guarda só o que a
 * pessoa mudou no corpo. Abrir, clicar e as trocas feitas pelo sistema (descartar, conflito, restaurar
 * versão) não acendem o Desfazer. Tudo pela tela, como a pessoa faria.
 * Este arquivo não envia nada para a Mídia.
 */

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"com" | "com2", PessoaDeTeste>;

const status = (page: Page) => page.getByTestId("status-do-salvamento");
const salvo = (page: Page) => expect(status(page)).toContainText("Salvo automaticamente às");
const corpo = (page: Page) => page.getByRole("textbox", { name: "Corpo da notícia" });
const barra = (page: Page) => page.getByRole("toolbar", { name: "Formatação do corpo" });
const botoes = (page: Page) => ({
  topoDesfazer: page.getByRole("button", { name: "Desfazer no corpo (Ctrl+Z)" }),
  topoRefazer: page.getByRole("button", { name: "Refazer no corpo (Ctrl+Shift+Z)" }),
  barraDesfazer: barra(page).getByRole("button", { name: "Desfazer (Ctrl+Z)" }),
  barraRefazer: barra(page).getByRole("button", { name: "Refazer (Ctrl+Shift+Z)" }),
});
const aviso = (page: Page) => page.getByText("Há alterações que ainda não estão no site");

/** Desfazer e Refazer apagados no topo e na barra do corpo. */
async function historicoVazio(page: Page) {
  const b = botoes(page);
  await expect(barra(page)).toBeVisible();
  await assentar(page);
  await expect(b.topoDesfazer).toBeDisabled();
  await expect(b.barraDesfazer).toBeDisabled();
  await expect(b.barraRefazer).toBeDisabled();
}

/** Põe o cursor no fim do corpo e escreve. */
async function escreverNoCorpo(page: Page, texto: string, toque = false) {
  await apertar(corpo(page), toque);
  await page.keyboard.press("Control+End");
  await page.keyboard.type(texto);
}

/** Escreve uma notícia nova com texto no corpo e devolve o id. */
async function escrever(page: Page, manchete: string, texto: string, toque = false) {
  await page.getByLabel("Manchete").fill(manchete);
  await escreverNoCorpo(page, texto, toque);
  await salvo(page);
  await expect(page).toHaveURL(/\/painel\/conteudos\/noticia\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

/** Completa os obrigatórios e publica pela confirmação. */
async function publicar(page: Page) {
  await page.getByLabel("Lide").fill("O plantão funciona das 8h às 17h, na sede do sindicato.");
  await page.getByLabel("Assinatura").fill("Redação SINTRAVC");
  await page.getByLabel("Categoria").selectOption({ label: "Jurídico" });
  await salvo(page);
  await page.getByRole("button", { name: "Publicar…" }).click();
  await page.getByRole("dialog", { name: "Publicar notícia?" }).getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Notícia publicada.", { exact: true })).toBeVisible();
}

async function outraPessoaMudaOLide(browser: { newContext: () => Promise<BrowserContext> }, id: string, lide: string) {
  const contexto = await browser.newContext();
  const daJoana = await contexto.newPage();
  await entrarComo(daJoana, pessoas.com2, `/painel/conteudos/noticia/${id}`);
  await daJoana.getByLabel("Lide").fill(lide);
  await salvo(daJoana);
  await contexto.close();
}

const ORIGINAL = "Leve contracheques e documento com foto.";

test("abrir e clicar no corpo não acendem Desfazer; digitar acende, e desfazer e refazer agem só no corpo", { tag: "@responsivo" }, async ({ page, hasTouch }) => {
  await entrarComo(page, pessoas.com, "/painel/conteudos/noticia/nova", { toque: hasTouch });
  await historicoVazio(page);
  await escrever(page, "Plantão jurídico às quartas", ORIGINAL, hasTouch);

  // Reabre a notícia salva: o corpo vem do banco (jsonb, com as chaves em outra ordem).
  await page.reload();
  await expect(corpo(page)).toContainText(ORIGINAL);
  await historicoVazio(page);

  // Só clicar no corpo não muda nada.
  await apertar(corpo(page), hasTouch);
  await historicoVazio(page);

  // Digitar acende; Refazer continua apagado.
  const b = botoes(page);
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Mais um trecho.");
  await expect(b.topoDesfazer).toBeEnabled();
  await expect(b.barraDesfazer).toBeEnabled();
  await expect(b.barraRefazer).toBeDisabled();

  // Desfazer pela barra; refazer com Ctrl+Shift+Z.
  await apertar(b.barraDesfazer, hasTouch);
  await expect(corpo(page)).not.toContainText("Mais um trecho.");
  await expect(b.barraRefazer).toBeEnabled();
  await expect(b.topoDesfazer).toBeDisabled();
  await page.keyboard.press("Control+Shift+Z");
  await expect(corpo(page)).toContainText("Mais um trecho.");

  // Desfazer pelo topo, com o foco fora do corpo: age no corpo.
  await page.getByLabel("Manchete").focus();
  await apertar(b.topoDesfazer, hasTouch);
  await expect(corpo(page)).not.toContainText("Mais um trecho.");
  await expect(b.topoDesfazer).toBeDisabled();
  await expect(corpo(page)).toBeFocused();

  // Ctrl+Y refaz; Ctrl+Z dentro do corpo desfaz.
  await page.keyboard.press("Control+Y");
  await expect(corpo(page)).toContainText("Mais um trecho.");
  await page.keyboard.press("Control+Z");
  await expect(corpo(page)).not.toContainText("Mais um trecho.");
  await expect(corpo(page)).toContainText(ORIGINAL);

  // Ctrl+Z em outro campo não mexe no corpo (E40: não há desfazer entre campos).
  await page.keyboard.press("Control+Y");
  await expect(corpo(page)).toContainText("Mais um trecho.");
  await page.getByLabel("Lide").fill("Lide novo");
  await page.getByLabel("Lide").press("Control+Z");
  await expect(corpo(page)).toContainText("Mais um trecho.");
});

test("E42 · depois de descartar alterações, Desfazer fica apagado e não traz de volta o texto descartado", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/conteudos/noticia/nova");
  await escrever(page, "Assembleia da categoria na sexta", ORIGINAL);
  await publicar(page);

  await escreverNoCorpo(page, " Trecho que vai ser descartado.");
  await salvo(page);
  await expect(aviso(page)).toBeVisible();

  await page.getByRole("button", { name: "Descartar alterações" }).click();
  await page.getByRole("alertdialog", { name: "Descartar alterações?" }).getByRole("button", { name: "Descartar alterações" }).click();
  await expect(page.getByText("Alterações descartadas.")).toBeVisible();
  await expect(corpo(page)).not.toContainText("Trecho que vai ser descartado.");
  await historicoVazio(page);

  // Ctrl+Z no corpo não traz o texto de volta, e o aviso não volta.
  await apertar(corpo(page), false);
  await page.keyboard.press("Control+Z");
  await expect(corpo(page)).not.toContainText("Trecho que vai ser descartado.");
  await page.waitForTimeout(3000); // mais que o intervalo do salvamento automático
  await expect(aviso(page)).toHaveCount(0);
});

test("N4 · “Usar a versão do servidor” no conflito: o corpo é o do servidor e Desfazer fica apagado", async ({ browser, page, context }) => {
  await entrarComo(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const id = await escrever(page, "Mudança no horário da sede", ORIGINAL);

  // Carlos escreve no corpo sem internet; enquanto isso, Joana salva outra versão.
  await context.setOffline(true);
  await escreverNoCorpo(page, " Linha do Carlos, sem internet.");
  await expect(status(page)).toContainText("Sem internet");
  await outraPessoaMudaOLide(browser, id, "Lide da Joana.");

  await context.setOffline(false);
  const modal = page.getByRole("dialog", { name: "Há duas versões do rascunho" });
  await expect(modal).toBeVisible();
  await modal.getByRole("radio", { name: /Usar a versão do servidor/ }).click();
  await modal.getByRole("button", { name: "Manter a versão escolhida" }).click();
  await expect(page.getByText("A versão do servidor foi mantida.")).toBeVisible();

  await expect(corpo(page)).toContainText(ORIGINAL);
  await expect(corpo(page)).not.toContainText("Linha do Carlos");
  await historicoVazio(page);
});

test("N14 · “Restaurar como rascunho” no Histórico: o corpo é o da versão e Desfazer fica apagado", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/conteudos/noticia/nova");
  await escrever(page, "Campanha salarial 2027", ORIGINAL);
  await publicar(page);

  // A versão 2 tem um trecho a mais no corpo (a que está no site não pode ser restaurada).
  await escreverNoCorpo(page, " Trecho que a versão 1 não tem.");
  await salvo(page);
  await page.getByRole("button", { name: "Publicar alterações…" }).click();
  await page.getByRole("dialog", { name: "Publicar alterações?" }).getByRole("button", { name: "Publicar alterações" }).click();
  await expect(page.getByText("Alterações publicadas.", { exact: true })).toBeVisible();

  await escreverNoCorpo(page, " Trecho que não foi publicado.");
  await salvo(page);

  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("menuitem", { name: "Histórico de versões" }).click();
  const painel = page.getByRole("dialog", { name: "Histórico de versões" });
  const versoes = painel.getByRole("list", { name: "Versões publicadas" }).getByRole("listitem");
  await expect(versoes).toHaveCount(2);
  await versoes.nth(1).getByRole("button", { name: "Restaurar como rascunho" }).click();
  await page.getByRole("alertdialog", { name: "Restaurar a versão 1 como rascunho?" }).getByRole("button", { name: "Restaurar como rascunho" }).click();
  await expect(page.getByText("Versão 1 restaurada como rascunho.")).toBeVisible();

  await expect(corpo(page)).toContainText(ORIGINAL);
  await expect(corpo(page)).not.toContainText("Trecho que a versão 1 não tem.");
  await expect(corpo(page)).not.toContainText("Trecho que não foi publicado.");
  await historicoVazio(page);
});

test("E02 · conflito ao abrir, com “Manter a minha versão”: o corpo é o que a pessoa escreveu e Desfazer fica apagado", async ({ browser, page, context }) => {
  await entrarComo(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const id = await escrever(page, "Plantão no feriado", ORIGINAL);

  // Carlos escreve no corpo sem internet e fecha a aba: a cópia fica só neste navegador.
  await context.setOffline(true);
  await escreverNoCorpo(page, " Linha do Carlos, guardada no navegador.");
  await expect(status(page)).toContainText("Sem internet");
  page.on("dialog", (aviso) => void aviso.accept());
  await page.goto("about:blank");
  await context.setOffline(false);

  // Joana salva outra versão no servidor.
  await outraPessoaMudaOLide(browser, id, "Lide da Joana.");

  // Carlos abre de novo, já com internet: escolhe a versão dele.
  await page.goto(`/painel/conteudos/noticia/${id}`);
  const modal = page.getByRole("dialog", { name: "Há duas versões do rascunho" });
  await expect(modal).toBeVisible();
  await modal.getByRole("radio", { name: /Manter a minha versão/ }).click();
  await modal.getByRole("button", { name: "Manter a versão escolhida" }).click();
  await expect(page.getByText("Sua versão foi mantida.")).toBeVisible();

  await expect(corpo(page)).toContainText("Linha do Carlos, guardada no navegador.");
  await historicoVazio(page);
});
