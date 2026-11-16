import { readFileSync } from "node:fs";

import { expect, request as novoPedido, test, type Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { office, openDocument } from "../src/testes/arquivos/gerar";
import { entrarNoPainel } from "./entrar";
import { pdfComTexto } from "./responsivo";

/** Ver o arquivo inteiro na Mídia (issue #54, E53): imagem em tela cheia, “Abrir PDF” e “Baixar”. */

type Pessoas = Record<"adm" | "com" | "atd", PessoaDeTeste>;
const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Pessoas;

async function entrar(page: Page, p: PessoaDeTeste, voltar = "/painel/midia") {
  await page.goto(`/painel/entrar?voltar=${encodeURIComponent(voltar)}`);
  await entrarNoPainel(page, p);
}

/** Envia pela própria tela, espera o aviso e abre os detalhes pelo cartão. */
async function enviarEAbrir(page: Page, nome: string, buffer: Buffer, mimeType: string) {
  await page.getByTestId("entrada-arquivos").setInputFiles({ name: nome, mimeType, buffer });
  await expect(page.getByText(`${nome} está na Mídia.`)).toBeVisible();
  await page.getByRole("list", { name: "Arquivos" }).getByRole("link").filter({ hasText: nome }).click();
  const detalhes = page.getByRole("complementary", { name: "Detalhes do arquivo" });
  await expect(detalhes.getByLabel("Nome do arquivo")).toHaveValue(nome);
  return detalhes;
}

test.describe.configure({ mode: "serial" });

let enderecoDoPdf = "";

test("“Abrir PDF” abre o PDF numa aba nova, no leitor do navegador (inline)", async ({ page }) => {
  await entrar(page, pessoas.com);
  const nome = `acordo-coletivo-${Date.now()}.pdf`;
  const detalhes = await enviarEAbrir(page, nome, await pdfComTexto(["ACORDO COLETIVO 2026"]), "application/pdf");

  const abrir = detalhes.getByRole("link", { name: "Abrir PDF" });
  await expect(abrir).toHaveAttribute("target", "_blank");
  await expect(abrir).toHaveAttribute("rel", /noopener/);

  // O Chromium sem janela dos testes não tem leitor de PDF: a conferência é pela resposta.
  const [aba, resposta] = await Promise.all([
    page.waitForEvent("popup"),
    page.context().waitForEvent("response", (r) => /\/painel\/midia\/[^/]+\/pdf\?modo=abrir$/.test(r.url())),
    abrir.click(),
  ]);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toBe("application/pdf");
  expect(resposta.headers()["content-disposition"]).toMatch(new RegExp(`^inline; filename="${nome.replace(/\./g, "\\.")}"`));
  enderecoDoPdf = resposta.url();
  await aba.close();
});

test("A rota do PDF recusa quem não tem sessão (401) e o Atendimento (403)", async ({ page, baseURL }) => {
  expect(enderecoDoPdf).not.toBe("");
  const semSessao = await novoPedido.newContext({ baseURL });
  try {
    expect((await semSessao.get(enderecoDoPdf)).status()).toBe(401);
  } finally {
    await semSessao.dispose();
  }

  await entrar(page, pessoas.atd, "/painel");
  await expect(page.getByRole("navigation", { name: "Menu do painel" })).toBeVisible();
  expect((await page.request.get(enderecoDoPdf)).status()).toBe(403);
});

test("“Baixar” baixa o documento com o nome original", async ({ page }) => {
  await entrar(page, pessoas.com);
  const casos = [
    { nome: `ata-assembleia-${Date.now()}.docx`, bytes: office("docx"), tipo: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { nome: `escala-folgas-${Date.now()}.ods`, bytes: openDocument("ods"), tipo: "application/vnd.oasis.opendocument.spreadsheet" },
  ];
  for (const { nome, bytes, tipo } of casos) {
    const detalhes = await enviarEAbrir(page, nome, Buffer.from(bytes), tipo);
    await expect(detalhes.getByRole("link", { name: "Abrir PDF" })).toHaveCount(0);
    const [download] = await Promise.all([page.waitForEvent("download"), detalhes.getByRole("link", { name: "Baixar" }).click()]);
    expect(download.suggestedFilename()).toBe(nome);
  }
});
