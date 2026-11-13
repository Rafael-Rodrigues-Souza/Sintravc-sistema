import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import postgres from "postgres";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E } from "../playwright.config";

// Envia PDFs para a Mídia: por isso roda depois de midia.spec.ts (que começa com a Mídia vazia).
// Tudo é feito pela tela, como uma pessoa faria; o banco só é lido para conferir o resultado.

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm" | "com", PessoaDeTeste>;

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
  await page.waitForURL((url) => url.pathname + url.search === voltar);
}

async function consultar<T extends object>(consulta: (sql: postgres.Sql) => Promise<T[]>) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await consulta(sql);
  } finally {
    await sql.end();
  }
}

async function documentoNoBanco(id: string) {
  const [linha] = await consultar((sql) => sql<{ estado: string; versao: number; confirmou: string | null; texto: string; numero: string }[]>`
    select c.estado, c.versao, p.nome as confirmou, d.texto_pesquisavel as texto, d.numero
    from conteudo c join documento d on d.conteudo_id = c.id left join pessoa_equipe p on p.id = d.confirmado_oficial_por
    where c.id = ${id}`);
  return linha!;
}

/** PDF com texto de verdade, como o edital assinado que o sindicato digitaliza. */
async function pdfComTexto(linhas: string[]) {
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const pagina = doc.addPage();
  linhas.forEach((texto, i) => pagina.drawText(texto, { x: 50, y: 700 - i * 24, size: 14, font: fonte }));
  return Buffer.from(await doc.save());
}

/** Dia daqui a N dias, no formato do campo de data ("AAAA-MM-DD"). */
const daquiA = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

/** Envia o PDF pelo botão, como a pessoa faria (abre o seletor de arquivos). */
async function enviarPdf(page: Page, nome: string, linhas: string[]) {
  const [seletor] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /Enviar PDF|Substituir/ }).click()]);
  await seletor.setFiles({ name: nome, mimeType: "application/pdf", buffer: await pdfComTexto(linhas) });
  await expect(page.getByText(nome)).toBeVisible();
}

const status = (page: Page) => page.getByTestId("status-do-salvamento");
const salvo = (page: Page) => expect(status(page)).toContainText("Salvo automaticamente às");
const idDaUrl = (page: Page) => new URL(page.url()).pathname.split("/").at(-1)!;

test.describe.configure({ mode: "serial" });

const TITULO_EDITAL = "Edital de convocação · Assembleia geral extraordinária";
const NUMERO_EDITAL = "Edital nº 012/2026";
let idEdital = "";

test("CA-US23.1 · o ADM cria o edital pelo menu, envia o PDF e só publica marcando a confirmação oficial", async ({ page }) => {
  await entrar(page, pessoas.adm, "/painel/conteudos");
  await page.getByRole("button", { name: "Criar conteúdo" }).first().click();
  await page.getByRole("menu").getByRole("menuitem", { name: /Edital/ }).click();
  await expect(page.getByRole("heading", { name: "Novo edital", level: 1 })).toBeVisible();

  await page.getByLabel("Título oficial").fill(TITULO_EDITAL);
  await page.getByLabel("Número ou identificação").fill(NUMERO_EDITAL);
  await page.getByLabel("Tipo de edital").selectOption({ label: "Convocação" });
  await page.getByLabel("Data do documento").fill(daquiA(-1));
  await page.getByLabel("Data do evento ou prazo").fill(daquiA(5));
  await page.getByLabel("Hora do evento ou prazo").fill("19:00");
  await page.getByLabel("Resumo").fill("Convoca os trabalhadores rodoviários para a assembleia geral extraordinária.");
  await page.getByLabel("Categoria").selectOption({ label: "Assembleias" });
  await salvo(page);
  idEdital = idDaUrl(page);

  // O texto pesquisável vem do PDF no envio (P3).
  await enviarPdf(page, "edital-012-2026.pdf", ["EDITAL DE CONVOCACAO", "Assembleia geral extraordinaria"]);
  await expect(page.getByLabel("Texto pesquisável")).toHaveValue(/EDITAL DE CONVOCACAO[\s\S]*Assembleia geral extraordinaria/);
  await salvo(page);

  await page.getByRole("button", { name: "Publicar…" }).click();
  const modal = page.getByRole("alertdialog", { name: "Publicar documento oficial?" });
  const publicar = modal.getByRole("button", { name: "Publicar documento" });
  await expect(publicar).toBeDisabled();
  await modal.getByLabel("Confirmo que o PDF é a versão oficial e assinada").check();
  await publicar.click();

  await expect(page.getByText("Documento publicado.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Publicado");
  // Prazo daqui a 5 dias: o selo calculado é “Prazo” (C2).
  await expect(page.getByText("Vigência: Prazo").first()).toBeAttached();
  expect(await documentoNoBanco(idEdital)).toMatchObject({ estado: "publicado", versao: 1, confirmou: "Mariana Souza", numero: NUMERO_EDITAL });
});

test("“Visualizar” abre o PDF numa aba nova, no navegador; “Baixar PDF” baixa", async ({ page }) => {
  await entrar(page, pessoas.adm, `/painel/conteudos/documento/${idEdital}`);
  // Abre uma aba nova, e o que chega nela é o PDF para ver no navegador (inline), não para baixar.
  // (O Chromium sem janela dos testes não tem leitor de PDF: por isso a conferência é pela resposta.)
  const [aba, resposta] = await Promise.all([
    page.waitForEvent("popup"),
    page.context().waitForEvent("response", (r) => r.url().includes(`/painel/documentos/${idEdital}/pdf?modo=abrir`)),
    page.getByRole("link", { name: "Visualizar" }).click(),
  ]);
  expect(aba).toBeTruthy();
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toBe("application/pdf");
  expect(resposta.headers()["content-disposition"]).toMatch(/^inline; filename="edital-012-2026.pdf"/);
  await aba.close();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Baixar PDF" }).click()]);
  expect(download.suggestedFilename()).toBe("edital-012-2026.pdf");
});

test("E47 · ligar e desligar “Tem vigência” no edital publicado não deixa aviso de alterações", async ({ page }) => {
  await entrar(page, pessoas.adm, `/painel/conteudos/documento/${idEdital}`);
  const vigencia = page.getByRole("switch", { name: "Este documento tem vigência" });
  const aviso = page.getByText("Há alterações que ainda não estão no site");
  await expect(vigencia).toHaveAttribute("aria-checked", "false");
  await expect(aviso).toHaveCount(0);

  // Cada mudança espera o seu salvamento automático: são duas gravações, como na issue #40.
  await vigencia.click();
  await expect(status(page)).not.toContainText("Salvo automaticamente às");
  await salvo(page);
  await expect(aviso).toBeVisible();

  await vigencia.click();
  await expect(status(page)).not.toContainText("Salvo automaticamente às");
  await salvo(page);
  await expect(aviso).toHaveCount(0);

  // Ao abrir de novo, continua sem aviso, e nenhuma versão nova foi criada.
  await page.reload();
  await expect(vigencia).toHaveAttribute("aria-checked", "false");
  await expect(aviso).toHaveCount(0);
  expect(await documentoNoBanco(idEdital)).toMatchObject({ estado: "publicado", versao: 1 });
});

test("o número é único por tipo: outro edital com o mesmo número mostra o erro no campo", async ({ page }) => {
  await entrar(page, pessoas.adm, "/painel/conteudos/documento/nova?tipo=edital");
  await page.getByLabel("Título oficial").fill("Outro edital");
  await page.getByLabel("Número ou identificação").fill(` ${NUMERO_EDITAL.toUpperCase()} `);
  await expect(page.locator("#numero")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(`Já existe um edital com o número “${NUMERO_EDITAL}”.`).first()).toBeVisible();
});

test("acordo ou convenção: abrangência, partes e vigência; agendar também pede a confirmação oficial", async ({ page }) => {
  await entrar(page, pessoas.adm, "/painel/conteudos/documento/nova?tipo=acordo");
  await page.getByLabel("Título oficial").fill("Convenção coletiva 2026/2027");
  await page.getByLabel("Número ou identificação").fill("CCT 2026/2027");
  await page.getByLabel("Tipo de acordo").selectOption({ label: "CCT · Convenção coletiva de trabalho" });
  await page.getByLabel("Data do documento").fill(daquiA(-10));
  await page.getByLabel("Início da vigência").fill(daquiA(-10));
  await page.getByLabel("Fim da vigência").fill(daquiA(355));
  await page.getByLabel("Abrangência", { exact: true }).fill("Transporte coletivo urbano de Vitória da Conquista");
  await page.getByLabel("Partes signatárias", { exact: true }).fill("SINTRAVC e sindicato das empresas de transporte");
  await page.getByLabel("Resumo").fill("Reajuste salarial e cláusulas sociais da categoria.");
  await page.getByLabel("Categoria").selectOption({ label: "Acordos e convenções" });
  await enviarPdf(page, "cct-2026-2027.pdf", ["CONVENCAO COLETIVA DE TRABALHO 2026/2027"]);
  await salvo(page);
  const id = idDaUrl(page);

  await page.getByLabel("Agendar").check();
  await page.getByRole("button", { name: "Agendar…" }).click();
  const modal = page.getByRole("alertdialog", { name: "Agendar documento oficial?" });
  await expect(modal.getByRole("button", { name: "Agendar documento" })).toBeDisabled();
  await modal.getByLabel("Confirmo que o PDF é a versão oficial e assinada").check();
  await modal.getByRole("button", { name: "Agendar documento" }).click();

  await expect(page.getByText(/Documento agendado para/)).toBeVisible();
  expect(await documentoNoBanco(id)).toMatchObject({ estado: "agendado", confirmou: "Mariana Souza" });
  // Agendado: trocar o PDF espera o cancelamento do agendamento (E46).
  await expect(page.getByText("Para trocar o PDF, cancele o agendamento antes.").first()).toBeVisible();
});

test("CA-US23.2 · a Comunicação abre o edital para ver e baixar, sem editar, substituir ou remover", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos?tipo=edital");
  const linha = page.getByRole("row").filter({ hasText: TITULO_EDITAL });
  await expect(linha.getByRole("button", { name: /Mais ações/ })).toHaveCount(0);
  await linha.getByRole("link", { name: `Abrir “${TITULO_EDITAL}”` }).click();

  await expect(page.getByText("Você pode ver e baixar este documento")).toBeVisible();
  await expect(page.getByRole("link", { name: "Baixar PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visualizar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Publicar|Salvar|Substituir|Enviar PDF|Mais ações/ })).toHaveCount(0);
  await expect(page.getByLabel("Título oficial")).toHaveCount(0);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Baixar PDF" }).click()]);
  expect(download.suggestedFilename()).toBe("edital-012-2026.pdf");
});
