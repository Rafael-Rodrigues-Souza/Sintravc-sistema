import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { URL_MAILPIT } from "../playwright.config";

// Recuperar acesso da equipe (issue #6; US41, US42, CA-US19.4). Os e-mails chegam no Mailpit (E32).
type Pessoas = Record<"adm" | "expira" | "esqueceu" | "semCelular" | "bloqueioAviso", PessoaDeTeste>;
const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Pessoas;

const SENHA_NOVA = "TrocaDeTurno2026";

type MensagemMailpit = { Subject: string; Text: string };

function buscaPor(para: string) {
  return `${URL_MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`;
}

/** Apaga do Mailpit os e-mails deste endereço (o Mailpit não é recriado a cada rodada). */
async function limparEmails(para: string) {
  await fetch(buscaPor(para), { method: "DELETE" });
}

/** Os e-mails que chegaram para este endereço, mais novos primeiro. */
async function emailsPara(para: string): Promise<MensagemMailpit[]> {
  const { messages } = (await (await fetch(buscaPor(para))).json()) as { messages: { ID: string }[] };
  return Promise.all(
    messages.map(async (m) => (await (await fetch(`${URL_MAILPIT}/api/v1/message/${m.ID}`)).json()) as MensagemMailpit),
  );
}

async function assuntosPara(para: string) {
  return (await emailsPara(para)).map((m) => m.Subject);
}

async function informarSenha(page: Page, email: string, senha: string) {
  await page.getByLabel("E-mail de trabalho").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: /Continuar|Entrar e voltar/ }).click(),
  ]);
}

function menu(page: Page) {
  return page.getByRole("navigation", { name: "Menu do painel" });
}

test("CA-US41.1 e 41.4 · pede o link, cria a senha nova, recebe “senha alterada” e entra com o código", async ({ page }) => {
  const p = pessoas.esqueceu;
  await limparEmails(p.email);

  await page.goto("/painel/entrar");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page.getByRole("heading", { name: "Esqueceu a senha?" })).toBeVisible();
  await page.getByLabel("E-mail de trabalho").fill(p.email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Reenviar link \(00:\d\d\)/ })).toBeDisabled();

  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const [mensagem] = await emailsPara(p.email);
        link = mensagem?.Text.match(/https?:\/\/\S+\/painel\/nova-senha\/[\w-]+/)?.[0];
        return mensagem?.Subject;
      },
      { message: `e-mail de nova senha para ${p.email}`, timeout: 15_000 },
    )
    .toBe("Redefinir sua senha do painel");

  // RN47: a senha atual não vale.
  await page.goto(link!);
  await expect(page.getByRole("heading", { name: "Crie uma nova senha" })).toBeVisible();
  await page.getByLabel("Nova senha *", { exact: true }).fill(p.senha);
  await page.getByLabel("Confirmar nova senha *").fill(p.senha);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText(/Esta senha já foi usada/)).toBeVisible();

  await page.getByLabel("Nova senha *", { exact: true }).fill(SENHA_NOVA);
  await page.getByLabel("Confirmar nova senha *").fill(SENHA_NOVA);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/\/painel\/entrar\?motivo=senha_alterada$/);
  await expect(page.getByText("Senha alterada", { exact: true })).toBeVisible();
  await expect.poll(() => assuntosPara(p.email), { timeout: 15_000 }).toContain("Sua senha do painel foi alterada");

  // O link não vale de novo (CA-US41.3).
  await page.goto(link!);
  await expect(page.getByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir outro link" })).toHaveAttribute("href", "/painel/entrar/esqueci");

  // As duas etapas continuam sendo pedidas.
  await page.goto("/painel/entrar");
  await informarSenha(page, p.email, SENHA_NOVA);
  await expect(page.getByRole("heading", { name: "Digite o código" })).toBeVisible();
  await page.getByLabel("Número 1 de 6").fill(await codigoTotp(p.segredoTotp));
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
  await expect(menu(page)).toBeVisible();
});

test("CA-US41.2 · e-mail sem acesso vê a mesma resposta e nada é enviado", async ({ page }) => {
  const email = "ninguem-aqui@sintravc.local";
  await limparEmails(email);

  await page.goto("/painel/entrar/esqueci");
  await page.getByLabel("E-mail de trabalho").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();

  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(await emailsPara(email)).toEqual([]);
});

test("CA-US42.1 e 42.2 · entra com um código de recuperação, que depois não vale mais", async ({ page }) => {
  const p = pessoas.semCelular;
  // Digitado em minúsculas e sem o hífen: a tela converte (E37).
  const codigo = p.codigosRecuperacao[0]!.replace("-", "").toLowerCase();

  await page.goto("/painel/entrar");
  await informarSenha(page, p.email, p.senha);
  await page.getByRole("link", { name: "Usar um código de recuperação" }).click();
  await expect(page.getByRole("heading", { name: "Use um código de recuperação" })).toBeVisible();
  await page.getByLabel("Código de recuperação").fill(codigo);
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
  await expect(menu(page)).toBeVisible();

  await page.getByRole("button", { name: "Sair do painel" }).click();
  await expect(page).toHaveURL(/\/painel\/entrar$/);
  await informarSenha(page, p.email, p.senha);
  await page.getByRole("link", { name: "Usar um código de recuperação" }).click();
  await page.getByLabel("Código de recuperação").fill(codigo);
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
  await expect(page.getByText("Código inválido ou já usado.", { exact: false })).toBeVisible();
  await expect(menu(page)).toBeHidden();
});

test("CA-US19.4 · na 5ª tentativa errada, a pessoa e os administradores gerais recebem e-mail", async ({ page }) => {
  const p = pessoas.bloqueioAviso;
  for (const email of [p.email, pessoas.adm.email, pessoas.expira.email]) await limparEmails(email);

  await page.goto("/painel/entrar");
  for (let i = 0; i < 5; i++) await informarSenha(page, p.email, "senha-errada-1");
  await expect(page.getByText("Acesso bloqueado por segurança")).toBeVisible();

  await expect
    .poll(() => assuntosPara(p.email), { timeout: 15_000 })
    .toEqual(["Seu acesso ao painel foi bloqueado por 15 minutos"]);
  for (const adm of [pessoas.adm, pessoas.expira]) {
    await expect
      .poll(() => assuntosPara(adm.email), { timeout: 15_000 })
      .toContain(`A conta de ${p.nome} foi bloqueada por tentativas`);
  }
});
