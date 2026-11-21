import { expect, test, type Page } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { diaNaBahiaDaquiA, publicarDocumentoPelaTela } from "./documentos";
import { entrarComo, pessoas, semRolagemLateral } from "./responsivo";

// Documentos no site (US03, RF04, C2, P3, E60; CA-US03.1 a CA-US03.3) pela tela: o ADM publica
// pelo painel, e o visitante entra pelo menu, busca, escolhe tipo e ano nos seletores, abre o
// documento e baixa o PDF. Envia PDFs para a Mídia: o nome do arquivo deixa este spec depois de
// midia.spec.ts (que começa com a Mídia vazia). Os números levam a marca da rodada, porque
// publicar-documento.spec.ts já publica o “Edital nº 012/2026”.

test.describe.configure({ mode: "serial" });

const MARCA = Date.now().toString(36).toUpperCase();
const PRAZO = {
  titulo: `Assembleia sobre o reajuste ${MARCA}`,
  numero: `Edital nº 012/2026-${MARCA}`,
  pdf: `Edital de convocação ${MARCA}.pdf`,
};
const ELEICAO = { titulo: `Eleição da comissão de saúde ${MARCA}`, numero: `Edital nº 077/2026-${MARCA}` };
const ACORDO = { titulo: `Acordo coletivo da garagem ${MARCA}`, numero: `ACT ${MARCA}`, inicio: diaNaBahiaDaquiA(-10) };
/** Só no texto do PDF (P3): a busca tem de achar o edital por ela. */
const SO_NO_PDF = `PALAVRA${MARCA}PDF`;
let idPrazo = "";

async function semAviso(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([{ name: "sintravc_cookies", value: "essenciais", url: baseURL! }]);
}

const lista = (page: Page) => page.getByTestId("lista-documentos");
const seletorTipo = (page: Page) => page.getByLabel("Tipo", { exact: true });
const seletorAno = (page: Page) => page.getByLabel("Ano", { exact: true });
const busca = (page: Page) => page.getByRole("searchbox");

test.describe("Documentos no site", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
  });

  test("o ADM publica dois editais e um acordo pelo painel", async ({ page }) => {
    await entrarComo(page, pessoas.adm, "/painel");
    idPrazo = await publicarDocumentoPelaTela(page, {
      tipo: "edital",
      titulo: PRAZO.titulo,
      numero: PRAZO.numero,
      subtipo: "Convocação",
      categoria: "Assembleias",
      resumo: "Convoca a categoria para votar a proposta de reajuste.",
      prazo: { dia: diaNaBahiaDaquiA(2), hora: "19:00" },
      pdf: { nome: PRAZO.pdf, linhas: ["EDITAL DE CONVOCACAO", SO_NO_PDF] },
    });
    await publicarDocumentoPelaTela(page, {
      tipo: "edital",
      titulo: ELEICAO.titulo,
      numero: ELEICAO.numero,
      subtipo: "Eleição",
      categoria: "Assembleias",
      resumo: "Abre as inscrições de chapas para a comissão de saúde.",
      pdf: { nome: `eleicao-${MARCA}.pdf`, linhas: ["EDITAL DE ELEICAO"] },
    });
    await publicarDocumentoPelaTela(page, {
      tipo: "acordo",
      titulo: ACORDO.titulo,
      numero: ACORDO.numero,
      subtipo: "ACT · Acordo coletivo de trabalho",
      categoria: "Acordos e convenções",
      resumo: "Reajuste e cláusulas sociais da garagem.",
      vigencia: { inicio: ACORDO.inicio, fim: diaNaBahiaDaquiA(355) },
      abrangencia: "Garagem de exemplo",
      partes: "SINTRAVC e empresa de exemplo",
      pdf: { nome: `act-${MARCA}.pdf`, linhas: ["ACORDO COLETIVO DE TRABALHO"] },
    });
  });

  test("CA-US03.3 · pelo menu, Editais destaca o prazo em aberto com “Faltam 2 dias”", async ({ page }) => {
    await page.goto("/");
    const documentos = page.getByRole("navigation", { name: "Principal" }).getByRole("button", { name: "Documentos" });
    await documentos.click();
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Editais" }).click();
    await expect(page).toHaveURL(/\/documentos\/editais$/);
    await expect(page.getByRole("heading", { level: 1, name: "Editais" })).toBeVisible();

    const destaque = page.getByRole("article").filter({ has: page.getByText("Em destaque") });
    await expect(destaque.getByRole("heading", { name: PRAZO.titulo })).toBeVisible();
    await expect(destaque.getByText("Faltam 2 dias")).toBeVisible();
    // O cartão da lista concorda com o destaque: selo de prazo e a mesma data.
    const cartao = lista(page).getByRole("article").filter({ hasText: PRAZO.titulo });
    await expect(cartao).toContainText(/Prazo: \d{2}\/\d{2}\/\d{4} · 19h00/);
  });

  test("CA-US03.1 · buscar “012” acha o edital, com data, prazo e tamanho do PDF; a busca também lê o PDF (P3)", async ({ page }) => {
    await page.goto("/documentos/editais");
    await busca(page).fill("012");
    await busca(page).press("Enter");
    await expect(page).toHaveURL(/busca=012/);
    const cartao = lista(page).getByRole("article").filter({ hasText: PRAZO.titulo });
    await expect(cartao).toContainText(PRAZO.numero);
    await expect(cartao).toContainText(/Publicado em \d{2}\/\d{2}\/\d{4}/);
    await expect(cartao).toContainText(/Prazo: /);
    await expect(cartao).toContainText(/PDF · \d+(,\d+)? (KB|MB)/);
    await expect(lista(page).getByText(ELEICAO.titulo)).toHaveCount(0);

    await busca(page).fill(SO_NO_PDF.toLowerCase());
    await busca(page).press("Enter");
    await expect(lista(page).getByRole("article")).toHaveCount(1);
    await expect(lista(page)).toContainText(PRAZO.titulo);
  });

  test("tipo e ano pelos seletores mudam o endereço e a lista; limpar e Voltar mostram o que a URL diz", async ({ page }) => {
    await page.goto("/documentos/editais");
    await seletorTipo(page).selectOption("eleicao");
    await expect(page).toHaveURL(/tipo=eleicao/);
    await expect(lista(page)).toContainText(ELEICAO.titulo);
    await expect(lista(page).getByText(PRAZO.titulo)).toHaveCount(0);
    await expect(seletorTipo(page).locator("option:checked")).toHaveText(/^Eleições \(\d+\)$/);

    const ano = diaNaBahiaDaquiA(0).slice(0, 4);
    await seletorAno(page).selectOption(ano);
    await expect(page).toHaveURL(new RegExp(`ano=${ano}`));
    await expect(page).toHaveURL(/tipo=eleicao/);
    await expect(lista(page)).toContainText(ELEICAO.titulo);

    // Sem resultado: o vazio com “Limpar filtros”, que zera os seletores e a busca.
    await busca(page).fill("nada-com-isso");
    await busca(page).press("Enter");
    await expect(page.getByText("Nenhum documento encontrado")).toBeVisible();
    await page.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(page).toHaveURL(/\/documentos\/editais$/);
    await expect(seletorTipo(page)).toHaveValue("");
    await expect(seletorAno(page)).toHaveValue("");
    await expect(busca(page)).toHaveValue("");

    // Voltar: os seletores e a busca voltam para o que a URL anterior dizia.
    await page.goBack();
    await expect(page).toHaveURL(/busca=nada-com-isso/);
    await expect(seletorTipo(page)).toHaveValue("eleicao");
    await expect(seletorAno(page)).toHaveValue(ano);
    await expect(busca(page)).toHaveValue("nada-com-isso");

    // “Limpar a busca” (o ×) tira só a busca: tipo e ano ficam.
    await page.getByRole("link", { name: "Limpar a busca" }).click();
    await expect(page).not.toHaveURL(/busca=/);
    await expect(busca(page)).toHaveValue("");
    await expect(seletorTipo(page)).toHaveValue("eleicao");
    await expect(seletorAno(page)).toHaveValue(ano);
  });

  test("CA-US03.2 · o título abre o documento; “Abrir PDF” abre no navegador e “Baixar PDF” baixa o arquivo oficial", async ({ page }) => {
    await page.goto("/documentos/editais");
    await lista(page).getByRole("link", { name: PRAZO.titulo, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: PRAZO.titulo })).toBeVisible();
    await expect(page.getByText("Faltam 2 dias")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Você está em" }).getByRole("link", { name: "Editais" })).toHaveAttribute("href", "/documentos/editais");

    const [aba, resposta] = await Promise.all([
      page.waitForEvent("popup"),
      page.context().waitForEvent("response", (r) => r.url().includes("/pdf?modo=abrir")),
      page.getByRole("link", { name: /Abrir PDF/ }).click(),
    ]);
    expect(resposta.status()).toBe(200);
    expect(resposta.headers()["content-type"]).toBe("application/pdf");
    expect(resposta.headers()["content-disposition"]).toMatch(/^inline;/);
    expect(resposta.headers()["cache-control"]).toBe("private, no-cache");
    await aba.close();

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Baixar PDF/ }).click()]);
    expect(download.suggestedFilename()).toBe(PRAZO.pdf);
  });

  test("Acordos coletivos: o topo mostra o acordo em vigor e leva a ele; a lista tem o quadro do ano", async ({ page }) => {
    await page.goto("/documentos/editais");
    await page.getByRole("navigation", { name: "Documentos", exact: true }).getByRole("link", { name: "Acordos coletivos" }).click();
    await expect(page).toHaveURL(/\/documentos\/acordos-coletivos$/);
    const anoInicio = ACORDO.inicio.slice(0, 4);
    await expect(page.getByText(`ACT ${anoInicio} em vigor`)).toBeVisible();

    const cartao = lista(page).getByRole("article").filter({ hasText: ACORDO.titulo });
    await expect(cartao).toContainText(`Ano${anoInicio}`);
    await expect(cartao).toContainText("Vigente");
    await expect(cartao).toContainText("Garagem de exemplo");

    await seletorTipo(page).selectOption("act");
    await expect(page).toHaveURL(/tipo=act/);
    await expect(lista(page)).toContainText(ACORDO.titulo);

    await page.getByRole("link", { name: "Ver acordo vigente" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/documentos\/acordos-coletivos\/[a-z0-9-]+$/);
  });

  test("documento fora do ar dá 404: outra aba, slug inexistente e, depois de ocultar, a página e o PDF", async ({ page }) => {
    await page.goto("/documentos/editais");
    const href = (await lista(page).getByRole("link", { name: PRAZO.titulo, exact: true }).getAttribute("href"))!;
    expect((await page.goto(href.replace("/editais/", "/acordos-coletivos/")))!.status()).toBe(404);
    expect((await page.goto("/documentos/editais/nao-existe-mesmo"))!.status()).toBe(404);

    await entrarComo(page, pessoas.adm, `/painel/conteudos/documento/${idPrazo}`);
    await page.getByRole("button", { name: "Mais ações" }).click();
    await page.getByRole("menuitem", { name: "Ocultar do site" }).click();
    const modal = page.getByRole("alertdialog", { name: "Ocultar do site?" });
    await modal.getByLabel(/Motivo/).fill("Edital com data errada");
    await modal.getByRole("button", { name: "Ocultar do site" }).click();
    await expect(page.getByText("Conteúdo oculto do site.")).toBeVisible();

    // Na hora: a página, o PDF e a lista já não mostram o edital.
    expect((await page.goto(href))!.status()).toBe(404);
    expect((await page.request.get(`${href}/pdf?modo=baixar`)).status()).toBe(404);
    await page.goto("/documentos/editais");
    await expect(page.getByText(PRAZO.titulo)).toHaveCount(0);
  });
});

test.describe("Documentos no celular e no tablet", { tag: "@responsivo" }, () => {
  // Nos perfis do CI rodam só os @responsivo: sem o primeiro describe, pode não haver edital nem
  // acordo no ar. Então o ADM publica um de cada pela tela, numa janela de computador.
  test.beforeAll(async ({ browser, baseURL }, testInfo) => {
    testInfo.setTimeout(120_000);
    const contexto = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
    const page = await contexto.newPage();
    try {
      const vazias: string[] = [];
      for (const endereco of ["/documentos/editais", "/documentos/acordos-coletivos"]) {
        await page.goto(endereco);
        if ((await lista(page).count()) === 0) vazias.push(endereco);
      }
      if (vazias.length === 0) return;
      const marca = `${testInfo.project.name.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      await entrarComo(page, pessoas.adm, "/painel");
      if (vazias.includes("/documentos/editais")) {
        await publicarDocumentoPelaTela(page, {
          tipo: "edital",
          titulo: `Assembleia de prestação de contas ${marca}`,
          numero: `Edital nº 090/2026-${marca}`,
          subtipo: "Convocação",
          categoria: "Assembleias",
          resumo: "Convoca a categoria para a prestação de contas.",
          prazo: { dia: diaNaBahiaDaquiA(3), hora: "19:00" },
          pdf: { nome: `edital-${marca}.pdf`, linhas: ["EDITAL DE CONVOCACAO"] },
        });
      }
      if (vazias.includes("/documentos/acordos-coletivos")) {
        await publicarDocumentoPelaTela(page, {
          tipo: "acordo",
          titulo: `Acordo coletivo da oficina ${marca}`,
          numero: `ACT ${marca}`,
          subtipo: "ACT · Acordo coletivo de trabalho",
          categoria: "Acordos e convenções",
          resumo: "Reajuste e cláusulas sociais da oficina.",
          vigencia: { inicio: diaNaBahiaDaquiA(-5), fim: diaNaBahiaDaquiA(360) },
          abrangencia: "Oficina de exemplo",
          partes: "SINTRAVC e empresa de exemplo",
          pdf: { nome: `act-${marca}.pdf`, linhas: ["ACORDO COLETIVO DE TRABALHO"] },
        });
      }
    } finally {
      await contexto.close();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
  });

  for (const endereco of ["/documentos/editais", "/documentos/acordos-coletivos"]) {
    test(`${endereco}: sem rolagem lateral, seletores lado a lado e alvos de toque de 44 px`, async ({ page, hasTouch }) => {
      await page.goto(endereco);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await semRolagemLateral(page);
      const [tipo, ano] = [await seletorTipo(page).boundingBox(), await seletorAno(page).boundingBox()];
      expect(Math.abs(tipo!.y - ano!.y), "tipo e ano na mesma linha").toBeLessThanOrEqual(1);
      expect(tipo!.height).toBeGreaterThanOrEqual(RESPONSIVO.alvoDeToque);
      if (hasTouch) expect(await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "main" })).toEqual([]);

      // O documento aberto (N18), pelo título do primeiro cartão.
      await lista(page).getByRole("article").first().getByRole("heading").getByRole("link").click();
      await expect(page.getByRole("link", { name: /Abrir PDF/ })).toBeVisible();
      await semRolagemLateral(page);
      if (hasTouch) expect(await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "main" })).toEqual([]);
    });
  }
});
