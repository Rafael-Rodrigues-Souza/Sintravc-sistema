import { expect, type Page } from "@playwright/test";
import sharp from "sharp";

/**
 * Escreve e publica uma notícia pelo editor, como a pessoa faria (comunicados, notícias no site).
 * Com `fixar`, marca “Fixar no topo de Notícias” (a data sugerida fica) antes de publicar (E59).
 * Com `capa`, envia uma imagem de capa pelo seletor e usa o texto como texto alternativo (o carrossel
 * da Home só aceita notícia com capa, E62).
 */
export async function publicarNoticiaPelaTela(
  page: Page,
  manchete: string,
  { categoria = "Jurídico", linhaFina, fixar = false, capa }: { categoria?: string; linhaFina?: string; fixar?: boolean; capa?: string } = {},
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
  if (capa) {
    await page.getByRole("button", { name: "Escolher imagem" }).click();
    const seletor = page.getByRole("dialog", { name: "Imagem de capa" });
    const foto = await sharp({ create: { width: 1200, height: 675, channels: 3, background: "#0b2a5b" } }).png().toBuffer();
    const nome = `capa-${Date.now()}.png`;
    await seletor.getByTestId("entrada-arquivos").setInputFiles({ name: nome, mimeType: "image/png", buffer: foto });
    await expect(seletor.getByRole("button", { name: nome, pressed: true })).toBeVisible();
    await seletor.getByRole("button", { name: "Usar este arquivo" }).click();
    await page.getByLabel("Texto alternativo").fill(capa);
    await salvo();
  }
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
  return /\/painel\/conteudos\/noticia\/([0-9a-f-]{36})/.exec(page.url())?.[1] ?? null;
}
