import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E } from "../playwright.config";

// Envia arquivo para a Mídia: por isso fica num arquivo que roda depois de midia.spec.ts
// (que começa com a Mídia vazia), e não em conteudos.spec.ts.

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"com", PessoaDeTeste>;

async function entrar(page: Page, p: PessoaDeTeste, voltar: string) {
  await page.goto(`/painel/entrar?voltar=${encodeURIComponent(voltar)}`);
  await page.getByLabel("E-mail de trabalho").fill(p.email);
  await page.getByLabel("Senha").fill(p.senha);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: /Continuar|Entrar e voltar/ }).click(),
  ]);
  await page.getByLabel("Número 1 de 6").fill(await codigoTotp(p.segredoTotp));
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
  await page.waitForURL((url) => url.pathname === voltar);
}

async function corpoNoBanco(id: string) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const [linha] = await sql<{ corpo: { content?: { type: string; attrs?: Record<string, string> }[] } }[]>`
      select corpo from noticia where conteudo_id = ${id}`;
    return linha?.corpo;
  } finally {
    await sql.end();
  }
}

test("imagem no corpo pela barra: escolhe na Mídia, salva e continua lá ao recarregar", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const status = page.getByTestId("status-do-salvamento");
  await page.getByLabel("Manchete").fill("Notícia com foto no corpo");
  await expect(status).toContainText("Salvo automaticamente às");
  const id = new URL(page.url()).pathname.split("/").at(-1)!;

  // Barra do corpo → Imagem da Mídia → envia uma foto nova (já vem selecionada) → usa.
  await page.getByRole("textbox", { name: "Corpo da notícia" }).click();
  await page.getByRole("toolbar", { name: "Formatação do corpo" }).getByRole("button", { name: "Imagem da Mídia" }).click();
  const seletor = page.getByRole("dialog", { name: "Imagem no corpo da notícia" });
  const foto = await sharp({ create: { width: 800, height: 450, channels: 3, background: "#02488d" } }).png().toBuffer();
  await seletor.getByTestId("entrada-arquivos").setInputFiles({ name: "onibus-frota.png", mimeType: "image/png", buffer: foto });
  await expect(seletor.getByRole("button", { name: /onibus-frota\.png/, pressed: true })).toBeVisible();
  await seletor.getByRole("button", { name: "Usar este arquivo" }).click();

  const detalhes = page.getByRole("dialog", { name: "Imagem no corpo" });
  await detalhes.getByLabel("Texto alternativo").fill("Ônibus da frota municipal");
  await detalhes.getByLabel("Legenda e crédito").fill("Foto: Comunicação/SINTRAVC");
  await detalhes.getByRole("button", { name: "Inserir imagem" }).click();

  const corpo = page.getByRole("textbox", { name: "Corpo da notícia" });
  await expect(corpo.getByRole("img", { name: "Ônibus da frota municipal" })).toBeVisible();
  await expect(status).toContainText("Salvo automaticamente às");
  await expect(page.getByText("Não foi possível salvar")).toHaveCount(0);

  // Recarrega: a imagem continua no corpo, com o arquivo da Mídia, o texto alternativo e a legenda.
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Corpo da notícia" }).getByRole("img", { name: "Ônibus da frota municipal" })).toBeVisible();
  const imagem = (await corpoNoBanco(id))?.content?.find((no) => no.type === "image");
  expect(imagem?.attrs).toMatchObject({ alt: "Ônibus da frota municipal", title: "Foto: Comunicação/SINTRAVC" });
  expect(imagem?.attrs?.midiaId).toMatch(/^[0-9a-f-]{36}$/);
});
