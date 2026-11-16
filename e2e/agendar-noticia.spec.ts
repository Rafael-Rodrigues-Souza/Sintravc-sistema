import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { bahiaEmCampos, bahiaParaUtc } from "../src/lib/datas";
import { ambienteE2E } from "../playwright.config";
import { acaoDaLinha } from "./responsivo";

// Agendar (CA-US21.2), calendário (RF36) e Edição rápida pela tela, como uma pessoa faria.
// O banco só é lido para conferir o resultado.

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"com" | "atd", PessoaDeTeste>;

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
  await page.waitForURL((url) => url.pathname + url.search === voltar || url.pathname === voltar);
}

async function consultar<T extends object>(consulta: (sql: postgres.Sql) => Promise<T[]>) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await consulta(sql);
  } finally {
    await sql.end();
  }
}

async function noBanco(id: string) {
  const [linha] = await consultar((sql) => sql<{ estado: string; titulo: string; agendado_para: Date | null; versao: number }[]>`
    select estado, titulo, agendado_para, versao from conteudo where id = ${id}`);
  return linha!;
}

async function acoesNaAtividade(id: string) {
  const linhas = await consultar((sql) => sql<{ acao: string }[]>`select acao from atividade where alvo_id = ${id} order by id`);
  return linhas.map((l) => l.acao);
}

/** Um dia "AAAA-MM-DD" daqui a `dias` dias, no horário da Bahia. */
const diaDaqui = (dias: number) => bahiaEmCampos(new Date(Date.now() + dias * 24 * 60 * 60 * 1000)).data;
const mesDe = (dia: string) => dia.slice(0, 7);
const textoDoDia = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;

const salvo = (page: Page) => expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");

/** Escreve uma notícia completa pelo editor e devolve o id. */
async function escreverNoticia(page: Page, manchete: string) {
  await page.goto("/painel/conteudos/noticia/nova");
  await page.getByLabel("Manchete").fill(manchete);
  await page.getByLabel("Lide").fill("Reunião aberta a toda a categoria, com pauta sobre a escala de fim de ano.");
  await page.getByRole("textbox", { name: "Corpo da notícia" }).click();
  await page.keyboard.type("A diretoria convida todos os rodoviários para a reunião na sede.");
  await page.getByLabel("Assinatura").fill("Redação SINTRAVC");
  await page.getByLabel("Categoria").selectOption({ label: "Geral" });
  await salvo(page);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

test.describe.configure({ mode: "serial" });

const AMANHA = diaDaqui(1);
const DEPOIS_DE_AMANHA = diaDaqui(2);
const PRIMEIRA = "Reunião sobre a escala de fim de ano";
const SEGUNDA = "Mutirão de exames na sede";
let primeiraId = "";
let segundaId = "";

test("CA-US21.2 · agendar no editor: escolhe data e hora, confirma e fica Agendada", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos");
  primeiraId = await escreverNoticia(page, PRIMEIRA);

  await page.getByRole("radio", { name: /Agendar/ }).click();
  await page.getByLabel("Data", { exact: true }).fill(AMANHA);
  await page.getByLabel("Hora", { exact: true }).fill("08:00");
  await page.getByRole("button", { name: "Agendar…" }).click();

  const modal = page.getByRole("dialog", { name: "Agendar publicação?" });
  await expect(modal).toContainText(`${textoDoDia(AMANHA)} às 08h00`);
  await modal.getByRole("button", { name: "Confirmar agendamento" }).click();

  await expect(page.getByText(`Notícia agendada para ${textoDoDia(AMANHA)} às 08h00.`)).toBeVisible();
  await expect(page.locator("[data-editor-noticia] > header").getByText("Agendado", { exact: true })).toBeVisible();
  await expect(page.getByText(`Agendada para ${textoDoDia(AMANHA)} às 08h00`, { exact: true })).toBeVisible();

  // 08h00 na Bahia é 11h00 em UTC (E44), não importa o fuso do computador.
  expect(await noBanco(primeiraId)).toMatchObject({ estado: "agendado", agendado_para: bahiaParaUtc(AMANHA, "08:00"), versao: 0 });
  expect((await acoesNaAtividade(primeiraId)).at(-1)).toBe("noticia.agendar");

  // A lista mostra quando entra no ar.
  await page.goto("/painel/conteudos");
  await expect(page.getByRole("row", { name: new RegExp(PRIMEIRA) })).toContainText(`Agendada para ${textoDoDia(AMANHA)} às 08h00`);
});

test("calendário: arrastar a agendada para outro dia pede confirmação, mantém a hora e vai para a Atividade", async ({ page }) => {
  await entrar(page, pessoas.com, `/painel/conteudos?visao=calendario&mes=${mesDe(AMANHA)}`);
  const item = page.locator(`li[data-dia="${AMANHA}"]`).getByRole("link", { name: new RegExp(PRIMEIRA) });
  await expect(item).toBeVisible();

  await item.dragTo(page.locator(`li[data-dia="${DEPOIS_DE_AMANHA}"]`));
  const confirmacao = page.getByRole("alertdialog", { name: "Reagendar notícia?" });
  await expect(confirmacao).toContainText(`${textoDoDia(DEPOIS_DE_AMANHA)} às 08h00`);
  await confirmacao.getByRole("button", { name: "Reagendar" }).click();

  await expect(page.getByText(`Reagendada para ${textoDoDia(DEPOIS_DE_AMANHA)} às 08h00.`)).toBeVisible();
  await expect(page.locator(`li[data-dia="${DEPOIS_DE_AMANHA}"]`).getByRole("link", { name: new RegExp(PRIMEIRA) })).toBeVisible();
  expect((await noBanco(primeiraId)).agendado_para).toEqual(bahiaParaUtc(DEPOIS_DE_AMANHA, "08:00"));
  expect((await acoesNaAtividade(primeiraId)).at(-1)).toBe("noticia.reagendar");
});

test("calendário: arrastar um rascunho sem data para um dia agenda na hora escolhida", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos");
  segundaId = await escreverNoticia(page, SEGUNDA);

  await page.goto(`/painel/conteudos?visao=calendario&mes=${mesDe(AMANHA)}`);
  const rascunho = page.getByRole("region", { name: "Rascunhos sem data" }).getByRole("link", { name: new RegExp(SEGUNDA) });
  await rascunho.dragTo(page.locator(`li[data-dia="${AMANHA}"]`));

  const confirmacao = page.getByRole("alertdialog", { name: "Agendar notícia?" });
  await confirmacao.getByLabel("Hora", { exact: true }).fill("10:30");
  await expect(confirmacao).toContainText(`${textoDoDia(AMANHA)} às 10h30`);
  await confirmacao.getByRole("button", { name: "Agendar" }).click();

  await expect(page.getByText(`Agendada para ${textoDoDia(AMANHA)} às 10h30.`)).toBeVisible();
  await expect(page.getByRole("region", { name: "Rascunhos sem data" }).getByRole("link", { name: new RegExp(SEGUNDA) })).toHaveCount(0);
  expect(await noBanco(segundaId)).toMatchObject({ estado: "agendado", agendado_para: bahiaParaUtc(AMANHA, "10:30") });
});

test("Edição rápida: muda título e data sem sair da lista; fechar com mudança pergunta antes", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos");
  await acaoDaLinha(page.getByRole("row").filter({ hasText: SEGUNDA }), `Edição rápida de “${SEGUNDA}”`);
  const painel = page.getByRole("dialog", { name: "Edição rápida" });
  await expect(painel).toBeVisible();
  await expect(painel.getByRole("radio", { name: /Agendado/ })).toBeChecked();
  // As "Últimas ações" vêm da Atividade, que só o ADM vê (spec §2.3).
  await expect(painel.getByRole("region", { name: "Últimas ações" })).toHaveCount(0);

  // Esc com mudança não salva pergunta antes de fechar.
  await painel.getByLabel("Título").fill(`${SEGUNDA} e vacinação`);
  await page.keyboard.press("Escape");
  const perguntar = page.getByRole("alertdialog", { name: "Fechar sem salvar?" });
  await perguntar.getByRole("button", { name: "Continuar editando" }).click();
  await expect(painel).toBeVisible();

  await painel.getByLabel("Data", { exact: true }).fill(DEPOIS_DE_AMANHA);
  await painel.getByLabel("Hora", { exact: true }).fill("09:15");
  await painel.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByText(`Notícia agendada para ${textoDoDia(DEPOIS_DE_AMANHA)} às 09h15.`)).toBeVisible();
  await expect(painel).toHaveCount(0);
  await expect(page.getByRole("row", { name: new RegExp(`${SEGUNDA} e vacinação`) })).toContainText(
    `Agendada para ${textoDoDia(DEPOIS_DE_AMANHA)} às 09h15`,
  );
  expect(await noBanco(segundaId)).toMatchObject({
    estado: "agendado",
    titulo: `${SEGUNDA} e vacinação`,
    agendado_para: bahiaParaUtc(DEPOIS_DE_AMANHA, "09:15"),
  });
  expect(await acoesNaAtividade(segundaId)).toEqual(expect.arrayContaining(["noticia.editar", "noticia.reagendar"]));
});

test("Edição rápida: voltar para Rascunho cancela o agendamento", async ({ page }) => {
  await entrar(page, pessoas.com, `/painel/conteudos?editar=${primeiraId}`);
  const painel = page.getByRole("dialog", { name: "Edição rápida" });
  await expect(painel.getByRole("radio", { name: /Agendado/ })).toBeChecked();
  await painel.getByRole("radio", { name: /Rascunho/ }).click();
  await painel.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByText("Alterações salvas.", { exact: true })).toBeVisible();
  expect(await noBanco(primeiraId)).toMatchObject({ estado: "rascunho", agendado_para: null });
  expect((await acoesNaAtividade(primeiraId)).at(-1)).toBe("noticia.cancelar_agendamento");
});

test("CA-US21.2 · a notícia agendada entra no ar sozinha na hora marcada", async ({ page }) => {
  test.setTimeout(240_000);
  await entrar(page, pessoas.com, `/painel/conteudos?editar=${primeiraId}`);
  // Daqui a 2 minutos, no horário da Bahia (os campos são de minuto em minuto).
  const daquiA2 = bahiaEmCampos(new Date(Date.now() + 2 * 60 * 1000));
  const painel = page.getByRole("dialog", { name: "Edição rápida" });
  await painel.getByRole("radio", { name: /Agendado/ }).click();
  await painel.getByLabel("Data", { exact: true }).fill(daquiA2.data);
  await painel.getByLabel("Hora", { exact: true }).fill(daquiA2.hora);
  await painel.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText(/Notícia agendada para/)).toBeVisible();

  await expect.poll(async () => (await noBanco(primeiraId)).estado, { timeout: 200_000, intervals: [2_000] }).toBe("publicado");
  expect(await noBanco(primeiraId)).toMatchObject({ versao: 1, agendado_para: null });
  expect((await acoesNaAtividade(primeiraId)).at(-1)).toBe("noticia.publicar_agendado");

  // A tela mostra a mudança ao recarregar.
  await page.goto("/painel/conteudos");
  await expect(page.getByRole("row", { name: new RegExp(PRIMEIRA) })).toContainText("Publicado");
});
