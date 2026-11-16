import { readFileSync } from "node:fs";

import { expect, request as novoPedido, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

import { RESPONSIVO } from "../playwright.config";
import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { office, openDocument } from "../src/testes/arquivos/gerar";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar, entrarNoPainel } from "./entrar";
import { entrarComo, pdfComTexto, semAnimacao, TOLERANCIA } from "./responsivo";

/** Ver o arquivo inteiro na Mídia (issue #54, E53): imagem em tela cheia, “Abrir PDF” e “Baixar”. */

type Pessoas = Record<"adm" | "com" | "atd", PessoaDeTeste>;
const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Pessoas;

async function entrar(page: Page, p: PessoaDeTeste, voltar = "/painel/midia") {
  await page.goto(`/painel/entrar?voltar=${encodeURIComponent(voltar)}`);
  await entrarNoPainel(page, p);
}

/** Envia pela própria tela, espera o aviso e abre os detalhes pelo cartão. */
async function enviarEAbrir(page: Page, nome: string, buffer: Buffer, mimeType: string) {
  // O campo de arquivo já vem no HTML: antes de a página carregar os scripts, a escolha se perde.
  await page.waitForLoadState("networkidle");
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

/** Logo com fundo transparente (PNG) e foto (JPG), como os que a Comunicação envia. */
const logoPng = () =>
  sharp({ create: { width: 900, height: 300, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
    .composite([{ input: { create: { width: 300, height: 100, channels: 4, background: "#02488d" } }, top: 100, left: 300 }])
    .png()
    .toBuffer();
const fotoJpg = () => sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#f2b705" } }).jpeg().toBuffer();

async function descrever(detalhes: Locator, alt: string) {
  await detalhes.getByLabel("Texto alternativo *").fill(alt);
  await detalhes.getByRole("button", { name: "Salvar" }).click();
  await expect(detalhes.page().getByText("Alterações salvas.")).toBeVisible();
}

const temFundo = (img: Locator) => img.evaluate((el) => getComputedStyle(el).backgroundImage !== "none");

test("A imagem abre em tela cheia pela prévia e por “Ver inteira”; Esc e X fecham e o foco volta", async ({ page }) => {
  await entrar(page, pessoas.com);
  const nome = `logo-parceiro-${Date.now()}.png`;
  const detalhes = await enviarEAbrir(page, nome, await logoPng(), "image/png");
  await descrever(detalhes, "Logo azul do parceiro");

  // Pela prévia, fecha com Esc: o foco volta para a prévia.
  const previa = detalhes.getByRole("button", { name: "Ver a imagem inteira" });
  await previa.click();
  const visualizador = page.getByRole("dialog", { name: nome });
  await expect(visualizador).toBeVisible();
  await expect(visualizador).toHaveAccessibleDescription(/zoom/);
  const imagem = visualizador.getByRole("img", { name: "Logo azul do parceiro" });
  await expect(imagem).toBeVisible();
  // Logo em PNG: inteiro, sobre o xadrez, como na prévia.
  expect(await temFundo(imagem)).toBe(true);
  // Tela cheia: o visualizador ocupa a janela toda.
  const caixa = (await visualizador.boundingBox())!;
  const janela = page.viewportSize()!;
  expect([Math.round(caixa.width), Math.round(caixa.height)]).toEqual([janela.width, janela.height]);
  await page.keyboard.press("Escape");
  await expect(visualizador).toBeHidden();
  await expect(previa).toBeFocused();

  // Por “Ver inteira”, fecha pelo X: o foco volta para o botão.
  const verInteira = detalhes.getByRole("button", { name: "Ver inteira" });
  await verInteira.click();
  await expect(visualizador).toBeVisible();
  await visualizador.getByRole("button", { name: "Fechar a imagem" }).click();
  await expect(visualizador).toBeHidden();
  await expect(verInteira).toBeFocused();
});

test("Foto em JPG abre sem o xadrez", async ({ page }) => {
  await entrar(page, pessoas.com);
  const nome = `assembleia-${Date.now()}.jpg`;
  const detalhes = await enviarEAbrir(page, nome, await fotoJpg(), "image/jpeg");
  await detalhes.getByRole("button", { name: "Ver a imagem inteira" }).click();
  const imagem = page.getByRole("dialog", { name: nome }).locator("img");
  await expect(imagem).toBeVisible();
  expect(await temFundo(imagem)).toBe(false);
});

/** A imagem como aparece na tela (já com o zoom). */
async function naTela(imagem: Locator) {
  const caixa = (await imagem.boundingBox())!;
  return { ...caixa, centroX: caixa.x + caixa.width / 2, centroY: caixa.y + caixa.height / 2 };
}

test("Zoom por botões, roda, duplo clique e teclado; com zoom, arrasta; Esc fecha", async ({ page }) => {
  await entrar(page, pessoas.com);
  const nome = `frota-${Date.now()}.jpg`;
  const detalhes = await enviarEAbrir(page, nome, await fotoJpg(), "image/jpeg");
  await detalhes.getByRole("button", { name: "Ver a imagem inteira" }).click();
  const visualizador = page.getByRole("dialog", { name: nome });
  const imagem = visualizador.locator("img");
  const nivel = visualizador.getByRole("status");
  const mais = visualizador.getByRole("button", { name: "Aumentar o zoom" });
  const menos = visualizador.getByRole("button", { name: "Diminuir o zoom" });
  const ajustar = visualizador.getByRole("button", { name: "Ajustar à tela" });

  await expect(nivel).toHaveText("100%");
  await expect(menos).toBeDisabled();
  await expect(ajustar).toBeDisabled();
  const base = await naTela(imagem);

  // Botões: + multiplica por 1,5; − divide; “Ajustar à tela” volta a 100%.
  await mais.click();
  await expect(nivel).toHaveText("150%");
  await expect.poll(async () => Math.round((await naTela(imagem)).width)).toBe(Math.round(base.width * 1.5));
  await mais.click();
  await expect(nivel).toHaveText("225%");
  await menos.click();
  await expect(nivel).toHaveText("150%");
  await ajustar.click();
  await expect(nivel).toHaveText("100%");
  await expect.poll(async () => Math.round((await naTela(imagem)).width)).toBe(Math.round(base.width));

  // Sem zoom, arrastar não move a imagem.
  await page.mouse.move(base.centroX, base.centroY);
  await page.mouse.down();
  await page.mouse.move(base.centroX + 80, base.centroY + 40, { steps: 5 });
  await page.mouse.up();
  expect(Math.round((await naTela(imagem)).x)).toBe(Math.round(base.x));

  // Roda do mouse para cima: aproxima.
  await page.mouse.move(base.centroX, base.centroY);
  await page.mouse.wheel(0, -200);
  await expect(nivel).not.toHaveText("100%");
  await ajustar.click();

  // Duplo clique no centro: 200%; de novo, volta a 100%.
  await imagem.dblclick();
  await expect(nivel).toHaveText("200%");
  await expect.poll(async () => Math.round((await naTela(imagem)).width)).toBe(Math.round(base.width * 2));
  const ampliada = await naTela(imagem);

  // Com zoom, arrastar move a imagem junto com o mouse.
  await page.mouse.move(base.centroX, base.centroY);
  await page.mouse.down();
  await page.mouse.move(base.centroX + 60, base.centroY + 30, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await naTela(imagem)).x - ampliada.x)).toBe(60);
  expect(Math.round((await naTela(imagem)).y - ampliada.y)).toBe(30);

  await imagem.dblclick();
  await expect(nivel).toHaveText("100%");

  // Teclado: +, − e 0; as setas movem a imagem ampliada.
  await page.keyboard.press("+");
  await expect(nivel).toHaveText("150%");
  await page.keyboard.press("+");
  await expect(nivel).toHaveText("225%");
  const antesDaSeta = await naTela(imagem);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await naTela(imagem)).x).toBeLessThan(antesDaSeta.x);
  await page.keyboard.press("ArrowDown");
  await expect.poll(async () => (await naTela(imagem)).y).toBeLessThan(antesDaSeta.y);
  await page.keyboard.press("-");
  await expect(nivel).toHaveText("150%");
  await page.keyboard.press("0");
  await expect(nivel).toHaveText("100%");

  // O foco fica preso no visualizador.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await visualizador.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(visualizador).toBeHidden();
});

/**
 * Dedos na tela pelo protocolo do Chromium (todos os projetos são Chromium): o Playwright só toca com
 * um dedo e não faz pinça. Cada toque vira Pointer Events de toque, como no aparelho.
 */
async function dedos(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  type Ponto = { x: number; y: number };
  const pontos = (lista: Ponto[]) => lista.map((p, id) => ({ x: Math.round(p.x), y: Math.round(p.y), id }));
  const enviar = (type: "touchStart" | "touchMove" | "touchEnd", lista: Ponto[]) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pontos(lista) });
  return {
    /** Encosta os dedos em `de`, leva até `ate` em passos e solta. */
    async deslizar(de: Ponto[], ate: Ponto[], passos = 8) {
      await enviar("touchStart", de);
      for (let i = 1; i <= passos; i++) {
        await enviar(
          "touchMove",
          de.map((p, j) => ({ x: p.x + ((ate[j]!.x - p.x) * i) / passos, y: p.y + ((ate[j]!.y - p.y) * i) / passos })),
        );
      }
      await enviar("touchEnd", []);
    },
    /** Dois toques rápidos no mesmo ponto. */
    async toqueDuplo(ponto: Ponto) {
      for (let i = 0; i < 2; i++) {
        await enviar("touchStart", [ponto]);
        await enviar("touchEnd", []);
      }
    },
  };
}

const naPagina = (page: Page) => page.evaluate(() => ({ escala: window.visualViewport!.scale, rolagem: window.scrollY }));

test.describe("visualizador no celular, no tablet e no computador", { tag: "@responsivo" }, () => {
  test("abre em tela cheia; no toque, pinça, arrasta e toque duplo sem mexer na página; voltar fecha", async ({ page, hasTouch }) => {
    await entrarComo(page, pessoas.com, "/painel/midia", { toque: hasTouch });
    const nome = `onibus-novos-${Date.now()}.jpg`;
    // O campo de arquivo já vem no HTML: antes de a página carregar os scripts, a escolha se perde.
    await page.waitForLoadState("networkidle");
    await page.getByTestId("entrada-arquivos").setInputFiles({ name: nome, mimeType: "image/jpeg", buffer: await fotoJpg() });
    await expect(page.getByText(`${nome} está na Mídia.`)).toBeVisible({ timeout: 20_000 });
    await apertar(page.getByRole("list", { name: "Arquivos" }).getByRole("link").filter({ hasText: nome }), hasTouch);
    const detalhes = page.getByRole("complementary", { name: "Detalhes do arquivo" });
    await expect(detalhes.getByLabel("Nome do arquivo")).toHaveValue(nome);
    const enderecoDosDetalhes = page.url();
    // “Ver inteira” fica abaixo da prévia: Copiar link e Salvar continuam numa linha, como no Figma (116:2727).
    const centroY = async (nome: string) => {
      const caixa = (await detalhes.getByRole("button", { name: nome }).boundingBox())!;
      return caixa.y + caixa.height / 2;
    };
    expect(Math.abs((await centroY("Copiar link")) - (await centroY("Salvar")))).toBeLessThan(TOLERANCIA.mesmaLinha);
    const verInteira = (await detalhes.getByRole("button", { name: "Ver inteira" }).boundingBox())!;
    const campoDoNome = (await detalhes.getByLabel("Nome do arquivo").boundingBox())!;
    expect(verInteira.y + verInteira.height, "“Ver inteira” fica entre a prévia e o nome do arquivo").toBeLessThan(campoDoNome.y);

    await apertar(detalhes.getByRole("button", { name: "Ver a imagem inteira" }), hasTouch);
    const visualizador = page.getByRole("dialog", { name: nome });
    await expect(visualizador).toBeVisible();
    await semAnimacao(page);
    const janela = page.viewportSize()!;
    const caixa = (await visualizador.boundingBox())!;
    expect([Math.round(caixa.width), Math.round(caixa.height)]).toEqual([janela.width, janela.height]);
    // A imagem aparece inteira, dentro da tela.
    const imagem = visualizador.locator("img");
    const inicial = (await imagem.boundingBox())!;
    expect(inicial.x).toBeGreaterThanOrEqual(0);
    expect(inicial.y).toBeGreaterThanOrEqual(0);
    expect(inicial.x + inicial.width).toBeLessThanOrEqual(janela.width);
    expect(inicial.y + inicial.height).toBeLessThanOrEqual(janela.height);
    const nivel = visualizador.getByRole("status");
    await expect(nivel).toHaveText("100%");

    if (hasTouch) {
      expect(await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "[role=dialog]" })).toEqual([]);
      const pagina = await naPagina(page);
      const toque = await dedos(page);
      const centro = { x: inicial.x + inicial.width / 2, y: inicial.y + inicial.height / 2 };

      // Pinça: os dedos se afastam de 80 px para 240 px → 300%. A página não dá zoom nem rola.
      await toque.deslizar(
        [
          { x: centro.x - 40, y: centro.y },
          { x: centro.x + 40, y: centro.y },
        ],
        [
          { x: centro.x - 120, y: centro.y },
          { x: centro.x + 120, y: centro.y },
        ],
      );
      await expect(nivel).toHaveText("300%");
      expect(await naPagina(page)).toEqual(pagina);

      // Com zoom, um dedo arrasta a imagem. Na horizontal, porque no celular em pé a imagem ampliada
      // passa pouco da tela na vertical (e não sai da tela).
      await semAnimacao(page);
      const antes = (await imagem.boundingBox())!;
      await toque.deslizar([centro], [{ x: centro.x + 30, y: centro.y }]);
      await expect.poll(async () => Math.round((await imagem.boundingBox())!.x - antes.x)).toBe(30);

      // Toque duplo: ampliada, volta a 100%; em 100%, vai a 200%.
      await toque.toqueDuplo(centro);
      await expect(nivel).toHaveText("100%");
      await toque.toqueDuplo(centro);
      await expect(nivel).toHaveText("200%");
      expect(await naPagina(page)).toEqual(pagina);
    }

    // O voltar do celular fecha o visualizador; a pessoa continua nos detalhes do mesmo arquivo.
    await page.goBack();
    await expect(visualizador).toBeHidden();
    expect(page.url()).toBe(enderecoDosDetalhes);
    await expect(detalhes.getByLabel("Nome do arquivo")).toHaveValue(nome);
  });
});

test.describe("voltar depois de fechar", () => {
  let enderecoDosDetalhes = "";

  test.beforeEach(async ({ page }) => {
    await entrar(page, pessoas.com);
    if (!enderecoDosDetalhes) {
      await enviarEAbrir(page, `garagem-${Date.now()}.jpg`, await fotoJpg(), "image/jpeg");
      enderecoDosDetalhes = page.url();
    }
    // Vem do início do painel para os detalhes: o voltar tem de levar de novo ao início.
    await page.goto("/painel");
    await page.goto(enderecoDosDetalhes);
  });

  const abrir = async (page: Page) => {
    await page.getByRole("button", { name: "Ver a imagem inteira" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  };
  const fechar = async (page: Page, como: "X" | "Esc") => {
    if (como === "X") await page.getByRole("button", { name: "Fechar a imagem" }).click();
    else await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  };
  const voltarSaiDaMidia = async (page: Page) => {
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === "/painel");
  };

  for (const como of ["X", "Esc"] as const) {
    test(`fechar pelo ${como} não deixa um “voltar” que não faz nada`, async ({ page }) => {
      await abrir(page);
      await fechar(page, como);
      await voltarSaiDaMidia(page);
    });
  }

  test("abrir e fechar duas vezes seguidas: um só “voltar” sai da Mídia", async ({ page }) => {
    await abrir(page);
    await fechar(page, "X");
    await abrir(page);
    await fechar(page, "Esc");
    await voltarSaiDaMidia(page);
  });
});
