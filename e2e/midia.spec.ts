import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E } from "../playwright.config";

type Pessoas = Record<"com" | "atd", PessoaDeTeste>;
const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Pessoas;

async function entrar(page: Page, p: PessoaDeTeste, voltar = "/painel/midia") {
  await page.goto(`/painel/entrar?voltar=${encodeURIComponent(voltar)}`);
  await page.getByLabel("E-mail de trabalho").fill(p.email);
  await page.getByLabel("Senha").fill(p.senha);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: /Continuar|Entrar e voltar/ }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Digite o código" })).toBeVisible();
  await page.getByLabel("Número 1 de 6").fill(await codigoTotp(p.segredoTotp));
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
}

async function imagem(formato: "png" | "gif") {
  return sharp({ create: { width: 640, height: 360, channels: 3, background: "#02488d" } })
    .toFormat(formato)
    .toBuffer();
}

async function enviar(page: Page, nome: string, buffer: Buffer, mimeType: string) {
  await page.getByTestId("entrada-arquivos").setInputFiles({ name: nome, mimeType, buffer });
}

/** Cria no navegador um DataTransfer com um arquivo (ou só texto), como o sistema faz ao arrastar. */
async function arrastado(page: Page, conteudo: { nome: string; tipo: string; buffer: Buffer } | { texto: string }) {
  return page.evaluateHandle((c) => {
    const dados = new DataTransfer();
    if ("texto" in c) {
      dados.setData("text/plain", c.texto);
      dados.setData("text/uri-list", c.texto);
    } else {
      const bytes = Uint8Array.from(atob(c.base64), (letra) => letra.charCodeAt(0));
      dados.items.add(new File([bytes], c.nome, { type: c.tipo }));
    }
    return dados;
  }, "texto" in conteudo ? conteudo : { nome: conteudo.nome, tipo: conteudo.tipo, base64: conteudo.buffer.toString("base64") });
}

async function soltar(page: Page, nome: string, buffer: Buffer, tipo: string) {
  const area = page.getByTestId("area-de-soltar");
  const dados = await arrastado(page, { nome, tipo, buffer });
  // Entra pela lista de filtros (um filho qualquer), como o mouse faria.
  await page.getByRole("navigation", { name: "Filtros da Mídia" }).dispatchEvent("dragenter", { dataTransfer: dados });
  await expect(page.getByText("Solte os arquivos para enviar")).toBeVisible();
  await area.dispatchEvent("dragover", { dataTransfer: dados });
  await area.dispatchEvent("drop", { dataTransfer: dados });
  await expect(page.getByText("Solte os arquivos para enviar")).toBeHidden();
}

function cartao(page: Page, nome: string) {
  return page.getByRole("list", { name: "Arquivos" }).getByRole("link").filter({ hasText: nome });
}

async function atividadesDaMidia(rotulo: string) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const linhas = await sql<{ acao: string }[]>`
      select acao from atividade where area = 'midia' and alvo_rotulo = ${rotulo} order by id`;
    return linhas.map((l) => l.acao);
  } finally {
    await sql.end();
  }
}

test.describe.configure({ mode: "serial" });

test("US27 · Comunicação envia, descreve e exclui um arquivo da Mídia", async ({ page }) => {
  await entrar(page, pessoas.com);
  await expect(page.getByRole("heading", { name: "Mídia", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A Mídia ainda está vazia" })).toBeVisible();

  // Envio com sucesso: aparece na grade, com a imagem servida pelo armazenamento.
  await enviar(page, "assembleia-outubro.png", await imagem("png"), "image/png");
  await expect(page.getByText("assembleia-outubro.png está na Mídia.")).toBeVisible();
  const card = cartao(page, "assembleia-outubro.png");
  await expect(card).toBeVisible();
  await expect(card).toContainText("PNG · 640 × 360");
  await expect(card).toContainText("Sem uso");
  await expect(card).toContainText("Sem alt");
  await expect
    .poll(() => card.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBe(640);
  await expect(page.getByRole("link", { name: /Sem texto alternativo · 1/ })).toBeVisible();

  // Formato recusado (C1: o exemplo de erro é um formato realmente não aceito).
  await enviar(page, "convite-assembleia.gif", await imagem("gif"), "image/gif");
  const erro = page.getByRole("alert").filter({ hasText: "convite-assembleia.gif" });
  await expect(erro).toContainText("Formato não aceito.");
  await expect(erro.getByRole("button", { name: "Tentar outro arquivo" })).toBeVisible();

  // Detalhes: texto alternativo e legenda.
  await card.click();
  const detalhes = page.getByRole("complementary", { name: "Detalhes do arquivo" });
  await expect(detalhes.getByLabel("Nome do arquivo")).toHaveValue("assembleia-outubro.png");
  await detalhes.getByLabel("Texto alternativo *").fill("Trabalhadores reunidos em assembleia na sede do sindicato");
  await detalhes.getByLabel("Legenda e crédito").fill("Foto: Comunicação/SINTRAVC");
  await detalhes.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Sem texto alternativo · 0/ })).toBeVisible();
  await expect(card).not.toContainText("Sem alt");

  // Excluir pede confirmação (AlertDialog) e vai para a Atividade.
  await detalhes.getByRole("button", { name: "Excluir arquivo" }).click();
  const confirmacao = page.getByRole("alertdialog", { name: "Excluir arquivo da Mídia?" });
  await expect(confirmacao).toContainText("“assembleia-outubro.png” não está em uso");
  await confirmacao.getByRole("button", { name: "Excluir arquivo" }).click();
  await expect(page.getByText("assembleia-outubro.png foi excluído.")).toBeVisible();
  await expect(cartao(page, "assembleia-outubro.png")).toHaveCount(0);

  expect(await atividadesDaMidia("assembleia-outubro.png")).toEqual(["midia.enviar", "midia.excluir"]);
});

test("CA-US27.2 · arquivo em uso não pode ser excluído e mostra onde é usado", async ({ page }) => {
  await entrar(page, pessoas.com);
  await enviar(page, "frota-municipal.png", await imagem("png"), "image/png");
  await expect(cartao(page, "frota-municipal.png")).toBeVisible();

  // A notícia ainda não existe (#8): o uso entra direto na tabela, como o editor fará.
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await sql`
      insert into midia_uso (midia_id, dono_tipo, dono_id)
      select id, 'noticia', ${randomUUID()} from midia where nome_arquivo = 'frota-municipal.png'`;
  } finally {
    await sql.end();
  }

  await page.reload();
  const card = cartao(page, "frota-municipal.png");
  await expect(card).toContainText("Usado em 1");
  await card.click();
  const detalhes = page.getByRole("complementary", { name: "Detalhes do arquivo" });
  await expect(detalhes).toContainText("Usado em");
  await expect(detalhes).toContainText("Notícia");
  await expect(detalhes).toContainText("Não é possível excluir: o arquivo está em uso em 1 conteúdo.");
  await expect(detalhes.getByRole("button", { name: "Excluir arquivo" })).toHaveCount(0);
});

test("Arrastar e soltar arquivos na Mídia usa a mesma fila do botão", async ({ page }) => {
  await entrar(page, pessoas.com);
  await expect(page.getByRole("heading", { name: "Mídia", level: 1 })).toBeVisible();
  const area = page.getByTestId("area-de-soltar");
  const camada = page.getByText("Solte os arquivos para enviar");

  // Texto ou link arrastado não mostra a camada.
  const link = await arrastado(page, { texto: "https://sintravc.org.br" });
  await area.dispatchEvent("dragenter", { dataTransfer: link });
  await expect(camada).toBeHidden();

  // Arquivo sobre a tela mostra a camada; ao sair, ela some.
  const jpg = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#f2b705" } }).jpeg().toBuffer();
  const sobre = await arrastado(page, { nome: "passeata-rodoviarios.jpg", tipo: "image/jpeg", buffer: jpg });
  await area.dispatchEvent("dragenter", { dataTransfer: sobre });
  await expect(camada).toBeVisible();
  await area.dispatchEvent("dragleave", { dataTransfer: sobre });
  await expect(camada).toBeHidden();

  // JPG solto entra na grade.
  await soltar(page, "passeata-rodoviarios.jpg", jpg, "image/jpeg");
  await expect(page.getByText("passeata-rodoviarios.jpg está na Mídia.")).toBeVisible();
  await expect(cartao(page, "passeata-rodoviarios.jpg")).toContainText("JPG · 800 × 600");

  // GIF solto é recusado com a mesma mensagem de formato.
  await soltar(page, "convite-festa.gif", await imagem("gif"), "image/gif");
  const erro = page.getByRole("alert").filter({ hasText: "convite-festa.gif" });
  await expect(erro).toContainText("Formato não aceito.");
  await expect(erro.getByRole("button", { name: "Tentar outro arquivo" })).toBeVisible();
});

test("O Atendimento não entra na Mídia, nem pelo endereço direto (403)", async ({ page }) => {
  await entrar(page, pessoas.atd, "/painel");
  await expect(page.getByRole("navigation", { name: "Menu do painel" })).toBeVisible();
  const resposta = await page.goto("/painel/midia");
  expect(resposta?.status()).toBe(403);
});
