import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E } from "../playwright.config";

type Pessoas = Record<"adm" | "com" | "bloqueio" | "expira", PessoaDeTeste>;
const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Pessoas;

async function informarSenha(page: Page, p: PessoaDeTeste, senha = p.senha) {
  await page.getByLabel("E-mail de trabalho").fill(p.email);
  await page.getByLabel("Senha").fill(senha);
  // Espera a resposta da server action antes de seguir (o React limpa o formulário ao terminar).
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: /Continuar|Entrar e voltar/ }).click(),
  ]);
}

async function informarCodigo(page: Page, p: PessoaDeTeste) {
  await expect(page.getByRole("heading", { name: "Digite o código" })).toBeVisible();
  await page.getByLabel("Número 1 de 6").fill(await codigoTotp(p.segredoTotp));
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
}

async function entrar(page: Page, p: PessoaDeTeste) {
  await page.goto("/painel/entrar");
  await informarSenha(page, p);
  await informarCodigo(page, p);
  await expect(menu(page)).toBeVisible();
}

function menu(page: Page) {
  return page.getByRole("navigation", { name: "Menu do painel" });
}

test("sem login, o painel manda para a tela de entrar", async ({ page }) => {
  await page.goto("/painel/conteudos");
  await expect(page).toHaveURL(/\/painel\/entrar\?voltar=%2Fpainel%2Fconteudos$/);
  await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
});

test("CA-US19.1 · Administrador geral entra com senha e código e vê as áreas do perfil", async ({ page }) => {
  await entrar(page, pessoas.adm);

  await expect(page).toHaveURL(/\/painel$/);
  const links = menu(page).getByRole("link");
  for (const area of ["Visão geral", "Conteúdos", "Comunicados", "Rádio Chofer", "Página inicial", "Benefícios", "Mídia", "Atividade", "Equipe e perfis", "Configurações"]) {
    await expect(links.filter({ hasText: area })).toHaveCount(1);
  }
  await expect(menu(page)).toContainText("Mariana Souza");
  await expect(menu(page)).toContainText("Administrador geral");
});

test("CA-US19.1 · Comunicação vê só as áreas da Comunicação", async ({ page }) => {
  await entrar(page, pessoas.com);

  const nomes = await menu(page).getByRole("link").allInnerTexts();
  const areas = nomes.map((n) => n.trim()).filter((n) => !["Criar conteúdo", "Ver site público", ""].includes(n));
  expect(areas).toEqual(["Visão geral", "Conteúdos", "Comunicados", "Rádio Chofer", "Página inicial", "Mídia"]);
});

test("CA-US19.3 · Comunicação que digita o endereço de Equipe e perfis recebe 403", async ({ page }) => {
  await entrar(page, pessoas.com);

  const resposta = await page.goto("/painel/equipe");
  expect(resposta?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Você não tem acesso a esta área" })).toBeVisible();
  await expect(page.getByText("Seu perfil (Comunicação) não abre Equipe e perfis.")).toBeVisible();

  await page.getByRole("link", { name: "Voltar para a Visão geral" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("código errado não entra", async ({ page }) => {
  await page.goto("/painel/entrar");
  await informarSenha(page, pessoas.adm);
  await page.getByLabel("Número 1 de 6").fill("000000");
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();

  await expect(page.getByText("Código incorreto.")).toBeVisible();
  await expect(page).toHaveURL(/\/painel\/entrar\/codigo/);
});

test("CA-US19.2 · 5 senhas erradas bloqueiam; nem a senha certa entra", async ({ page }) => {
  await page.goto("/painel/entrar");
  for (let i = 1; i <= 4; i++) {
    await informarSenha(page, pessoas.bloqueio, "senha-errada-1");
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  }
  await informarSenha(page, pessoas.bloqueio, "senha-errada-1");
  await expect(page.getByText("Acesso bloqueado por segurança")).toBeVisible();

  await informarSenha(page, pessoas.bloqueio);
  await expect(page.getByText("Acesso bloqueado por segurança")).toBeVisible();
  await expect(page).toHaveURL(/\/painel\/entrar$/);
});

test("sessão expirada (2 h sem uso) volta para a mesma página depois de entrar de novo", async ({ page }) => {
  await entrar(page, pessoas.expira);
  await page.goto("/painel/equipe");
  await expect(page.getByRole("heading", { name: "Equipe e perfis" })).toBeVisible();

  // Simula 3 h sem uso.
  const banco = postgres(ambienteE2E.DATABASE_URL, { max: 1 });
  await banco`UPDATE sessao SET ultimo_uso = now() - interval '3 hours' WHERE pessoa_id = ${pessoas.expira.id}`;
  await banco.end();

  await page.reload();
  await expect(page).toHaveURL(/\/painel\/entrar\?motivo=expirada&voltar=%2Fpainel%2Fequipe$/);
  await expect(page.getByRole("heading", { name: "Entre de novo" })).toBeVisible();
  await expect(page.getByText("Você estava em Equipe e perfis.")).toBeVisible();

  await informarSenha(page, pessoas.expira);
  await informarCodigo(page, pessoas.expira);
  await expect(page).toHaveURL(/\/painel\/equipe$/);
});

test("sessão com mais de 12 h acaba, mesmo em uso", async ({ page }) => {
  await entrar(page, pessoas.expira);

  const banco = postgres(ambienteE2E.DATABASE_URL, { max: 1 });
  await banco`UPDATE sessao SET criado_em = now() - interval '12 hours 1 minute', ultimo_uso = now() WHERE pessoa_id = ${pessoas.expira.id}`;
  await banco.end();

  await page.goto("/painel/midia");
  await expect(page).toHaveURL(/motivo=expirada/);
});

test("Sair encerra a sessão", async ({ page }) => {
  await entrar(page, pessoas.adm);
  await page.getByRole("button", { name: "Sair do painel" }).click();
  await expect(page).toHaveURL(/\/painel\/entrar$/);

  await page.goto("/painel");
  await expect(page).toHaveURL(/\/painel\/entrar/);
  await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
});
