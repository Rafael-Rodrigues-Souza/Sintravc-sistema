import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { RESPONSIVO } from "../playwright.config";
import { apertar } from "./entrar";
import { assentar, entrarComo, pessoas, semRolagemLateral, telaEstreita } from "./responsivo";

// Envia um PDF para a Mídia: por isso roda depois de midia.spec.ts (que começa com a Mídia vazia).

/**
 * Editores no celular e no tablet em pé (E49; Figma M 120:3836): topo compacto, barra fixa embaixo
 * com Salvar e Publicar, e Capa, Publicação e Fontes (no documento: Datas, Abrangência, Arquivo e
 * Publicação) como seções que abrem e fecham. Nos perfis largos, o editor é o do desktop.
 */

const barraDoEditor = (page: Page) => page.getByRole("group", { name: "Salvar e publicar" });
const status = (page: Page) => page.getByTestId("status-do-salvamento");
const salvo = (page: Page) => expect(status(page)).toContainText("Salvo automaticamente às");
const secao = (page: Page, titulo: string) => page.getByRole("button", { name: new RegExp(`^${titulo}`) });
const topo = (page: Page) => page.locator("main header").first();

/** No desktop, estreita a janela até logo abaixo do menu lateral; nos perfis, fica no tamanho deles. */
async function janelaEstreitaNoDesktop(page: Page, projeto: string) {
  if (projeto !== "chromium") return;
  await page.setViewportSize({ width: RESPONSIVO.menuLateralAPartirDe - 1, height: page.viewportSize()!.height });
  await assentar(page);
}

/** Abre a seção pelo título (se estiver fechada) e devolve o botão dela. */
async function abrirSecao(page: Page, titulo: string, toque: boolean) {
  const botao = secao(page, titulo);
  if ((await botao.getAttribute("aria-expanded")) !== "true") await apertar(botao, toque);
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  return botao;
}

async function pdfComTexto(linhas: string[]) {
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const pagina = doc.addPage();
  linhas.forEach((texto, i) => pagina.drawText(texto, { x: 50, y: 700 - i * 24, size: 14, font: fonte }));
  return Buffer.from(await doc.save());
}

test.describe("editores no celular", { tag: "@responsivo" }, () => {
  test("notícia: salvar e publicar pela barra de baixo, com as seções que abrem e fecham", async ({ page, hasTouch }, testInfo) => {
    await entrarComo(page, pessoas.com, "/painel/conteudos/noticia/nova", { toque: hasTouch });
    await janelaEstreitaNoDesktop(page, testInfo.project.name);

    if (!telaEstreita(page)) {
      // Tablet deitado, notebook e computador: botões no topo e cartões sempre abertos.
      await expect(barraDoEditor(page)).toBeHidden();
      await expect(topo(page).getByRole("button", { name: "Publicar…" })).toBeVisible();
      await expect(page.getByLabel("Texto alternativo")).toBeVisible();
      await expect(page.getByLabel("Assinatura")).toBeVisible();
      return;
    }

    // Topo compacto: Salvar e Publicar ficam só na barra de baixo, presa no fim da tela.
    await expect(barraDoEditor(page)).toBeVisible();
    await expect(barraDoEditor(page)).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Publicar…" })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Navegação do painel" })).toBeHidden();
    await semRolagemLateral(page);

    const manchete = `Plantão jurídico pelo celular (${testInfo.project.name}, tentativa ${testInfo.retry})`;
    await page.getByLabel("Manchete").fill(manchete);
    await page.getByLabel("Lide").fill("O plantão funciona às quartas, das 14h às 17h, na sede do sindicato.");
    await apertar(page.getByRole("textbox", { name: "Corpo da notícia" }), hasTouch);
    await page.keyboard.type("Leve contracheques e a carteira de trabalho.");

    // Seções fechadas mostram o resumo; a capa abre e fecha pelo título.
    await expect(page.getByLabel("Texto alternativo")).toBeHidden();
    const capa = secao(page, "Imagem de capa");
    await expect(capa).toHaveAttribute("aria-expanded", "false");
    await apertar(capa, hasTouch);
    await expect(page.getByLabel("Texto alternativo")).toBeVisible();
    await apertar(capa, hasTouch);
    await expect(page.getByLabel("Texto alternativo")).toBeHidden();

    // Publicar com pendências: o alerta leva ao campo e abre a seção dele.
    await expect(page.getByLabel("Assinatura")).toBeHidden();
    await apertar(barraDoEditor(page).getByRole("button", { name: "Publicar…" }), hasTouch);
    await expect(page.getByRole("alert").filter({ hasText: "obrigatórios para publicar" })).toContainText("Faltam 2 itens");
    await expect(page.getByLabel("Assinatura")).toBeFocused();
    await expect(secao(page, "Publicação")).toHaveAttribute("aria-expanded", "true");
    await page.getByLabel("Assinatura").fill("Redação SINTRAVC");
    await page.getByLabel("Categoria").selectOption({ label: "Jurídico" });
    await expect(secao(page, "Publicação")).toHaveAccessibleName(/Jurídico/);

    await apertar(barraDoEditor(page).getByRole("button", { name: "Salvar" }), hasTouch);
    await salvo(page);

    await apertar(barraDoEditor(page).getByRole("button", { name: "Publicar…" }), hasTouch);
    const modal = page.getByRole("dialog", { name: "Publicar notícia?" });
    await apertar(modal.getByRole("button", { name: "Publicar agora" }), hasTouch);
    await expect(modal).toBeHidden();
    // No ar e sem nada novo: a barra troca para “Publicar alterações…”, travado com a dica.
    await expect(barraDoEditor(page).getByRole("button", { name: "Publicar alterações…" })).toHaveAccessibleDescription(/Nada novo para publicar/);
    await expect(secao(page, "Publicação")).toHaveAccessibleName(/No site desde/);
    await semRolagemLateral(page);
  });

  test("documento: publicar o edital pela barra de baixo, marcando a confirmação oficial", async ({ page, hasTouch }, testInfo) => {
    await entrarComo(page, pessoas.adm, "/painel/conteudos/documento/nova?tipo=edital", { toque: hasTouch });
    await janelaEstreitaNoDesktop(page, testInfo.project.name);
    test.skip(!telaEstreita(page), "a barra do editor só existe abaixo do menu lateral");

    const sufixo = `${testInfo.project.name}-${testInfo.retry}-${Date.now()}`;
    await expect(barraDoEditor(page)).toBeVisible();
    await page.getByLabel("Título oficial").fill(`Edital de convocação pelo celular (${sufixo})`);
    await page.getByLabel("Número ou identificação").fill(`Edital celular ${sufixo}`);
    await page.getByLabel("Tipo de edital").selectOption({ label: "Convocação" });
    await page.getByLabel("Resumo").fill("Convoca os trabalhadores rodoviários para a assembleia geral.");

    // A primeira pendência é a data do documento: a seção de datas abre sozinha.
    await apertar(barraDoEditor(page).getByRole("button", { name: "Publicar…" }), hasTouch);
    await expect(page.getByLabel("Data do documento")).toBeFocused();
    await expect(secao(page, "Datas e vigência")).toHaveAttribute("aria-expanded", "true");
    await page.getByLabel("Data do documento").fill(new Date(Date.now() - 86_400_000).toISOString().slice(0, 10));

    await abrirSecao(page, "Publicação", hasTouch);
    await page.getByLabel("Categoria").selectOption({ label: "Assembleias" });

    await abrirSecao(page, "Arquivo oficial", hasTouch);
    const [seletor] = await Promise.all([page.waitForEvent("filechooser"), apertar(page.getByRole("button", { name: "Enviar PDF" }), hasTouch)]);
    await seletor.setFiles({ name: `edital-celular-${sufixo}.pdf`, mimeType: "application/pdf", buffer: await pdfComTexto(["EDITAL DE CONVOCACAO"]) });
    await expect(page.getByText(`edital-celular-${sufixo}.pdf`, { exact: true })).toBeVisible();
    // O resumo da seção passa a dizer que o PDF foi enviado.
    await expect(secao(page, "Arquivo oficial")).toHaveAccessibleName(/PDF enviado/);

    await apertar(barraDoEditor(page).getByRole("button", { name: "Salvar" }), hasTouch);
    await salvo(page);

    await apertar(barraDoEditor(page).getByRole("button", { name: "Publicar…" }), hasTouch);
    const modal = page.getByRole("alertdialog", { name: "Publicar documento oficial?" });
    await apertar(modal.getByLabel("Confirmo que o PDF é a versão oficial e assinada"), hasTouch);
    await apertar(modal.getByRole("button", { name: "Publicar documento" }), hasTouch);
    await expect(page.getByText("Documento publicado.")).toBeVisible();
    await expect(barraDoEditor(page).getByRole("button", { name: "Publicar alterações…" })).toBeVisible();
    await semRolagemLateral(page);
  });

  test("girar o tablet no editor mantém o texto e as seções, e troca a barra pelos botões do topo", async ({ page, hasTouch }, testInfo) => {
    const perfil = RESPONSIVO.perfis[testInfo.project.name as keyof typeof RESPONSIVO.perfis];
    const girado = perfil && Object.values(RESPONSIVO.perfis).find((o) => o.toque && o.largura === perfil.altura && o.altura === perfil.largura);
    test.skip(!girado, "só nos tablets, que giram");
    const [emPe, deitado] = perfil.largura < perfil.altura ? [perfil, girado!] : [girado!, perfil];
    const posicao = (p: { largura: number; altura: number }) => ({ width: p.largura, height: p.altura });

    await entrarComo(page, pessoas.com, "/painel/conteudos/noticia/nova", { toque: hasTouch });
    await page.setViewportSize(posicao(emPe));
    await assentar(page);
    const manchete = `Assembleia no tablet girado (${testInfo.project.name}, tentativa ${testInfo.retry})`;
    await page.getByLabel("Manchete").fill(manchete);
    await abrirSecao(page, "Imagem de capa", hasTouch);
    await page.getByLabel("Legenda e crédito").fill("Foto: Comunicação SINTRAVC");

    // Deitado: botões no topo, sem a barra; tudo aberto, com o que foi digitado.
    await page.setViewportSize(posicao(deitado));
    await expect(barraDoEditor(page)).toBeHidden();
    await expect(topo(page).getByRole("button", { name: "Publicar…" })).toBeVisible();
    await expect(page.getByLabel("Manchete")).toHaveValue(manchete);
    await expect(page.getByLabel("Assinatura")).toBeVisible();
    await expect(page.getByLabel("Legenda e crédito")).toHaveValue("Foto: Comunicação SINTRAVC");
    await semRolagemLateral(page);

    // Em pé de novo: a barra volta, a capa continua aberta e a Publicação, fechada.
    await page.setViewportSize(posicao(emPe));
    await expect(barraDoEditor(page)).toBeVisible();
    await expect(page.getByLabel("Legenda e crédito")).toBeVisible();
    await expect(page.getByLabel("Assinatura")).toBeHidden();
    await semRolagemLateral(page);
  });
});
