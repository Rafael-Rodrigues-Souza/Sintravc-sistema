import { expect, type Page } from "@playwright/test";

/**
 * Escreve e publica uma notícia pelo editor, como a pessoa faria (comunicados, notícias no site).
 * Com `fixar`, marca “Fixar no topo de Notícias” (a data sugerida fica) antes de publicar (E59).
 */
export async function publicarNoticiaPelaTela(
  page: Page,
  manchete: string,
  { categoria = "Jurídico", linhaFina, fixar = false }: { categoria?: string; linhaFina?: string; fixar?: boolean } = {},
) {
  await page.goto("/painel/conteudos/noticia/nova");
  const salvo = () => expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");
  await page.getByLabel("Manchete").fill(manchete);
  await salvo();
  if (linhaFina) await page.getByLabel("Linha fina").fill(linhaFina);
  await page.getByLabel("Lide").fill("O plantão funciona das 8h às 17h, na sede do sindicato.");
  await page.getByRole("textbox", { name: "Corpo da notícia" }).click();
  await page.keyboard.type("Leve contracheques e documento com foto.");
  await page.getByLabel("Assinatura").fill("Redação SINTRAVC");
  await page.getByLabel("Categoria").selectOption({ label: categoria });
  await salvo();
  if (fixar) {
    await page.getByRole("checkbox", { name: "Fixar no topo de Notícias" }).click();
    await expect(page.getByLabel("Até")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("checkbox", { name: "Fixar no topo de Notícias" })).toBeEnabled();
  }
  await page.getByRole("button", { name: "Publicar…" }).click();
  const modal = page.getByRole("dialog", { name: "Publicar notícia?" });
  if (fixar) await expect(modal.getByText(/No topo de Notícias até \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
  await modal.getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Notícia publicada.", { exact: true })).toBeVisible();
}
