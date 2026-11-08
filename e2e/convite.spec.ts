import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E, URL_MAILPIT } from "../playwright.config";

// Convite da equipe (issue #5; US29, US40). O e-mail chega no Mailpit (E32).
type Pessoas = Record<"adm" | "com" | "bloqueio" | "expira", PessoaDeTeste>;
const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Pessoas;

const AREAS_DA_COMUNICACAO = ["Visão geral", "Conteúdos", "Comunicados", "Rádio Chofer", "Página inicial", "Mídia"];
const SENHA_NOVA = "OnibusLinha2026";

function menu(page: Page) {
  return page.getByRole("navigation", { name: "Menu do painel" });
}

async function informarSenha(page: Page, email: string, senha: string) {
  await page.getByLabel("E-mail de trabalho").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: /Continuar|Entrar e voltar/ }).click(),
  ]);
}

async function entrarComApp(page: Page, email: string, senha: string, segredo: string) {
  await page.goto("/painel/entrar");
  await informarSenha(page, email, senha);
  await expect(page.getByRole("heading", { name: "Digite o código" })).toBeVisible();
  await page.getByLabel("Número 1 de 6").fill(await codigoTotp(segredo));
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
  await expect(menu(page)).toBeVisible();
}

async function sair(page: Page) {
  await page.getByRole("button", { name: "Sair do painel" }).click();
  await expect(page).toHaveURL(/\/painel\/entrar$/);
}

/** O link do convite no e-mail que chegou no Mailpit para este endereço. */
async function linkDoEmail(para: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const busca = await fetch(`${URL_MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`);
        const { messages } = (await busca.json()) as { messages: { ID: string }[] };
        if (!messages[0]) return undefined;
        const mensagem = (await (await fetch(`${URL_MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as {
          Subject: string;
          Text: string;
        };
        expect(mensagem.Subject).toBe("Você foi convidado para o painel do SINTRAVC");
        link = mensagem.Text.match(/https?:\/\/\S+\/painel\/convite\/[\w-]+/)?.[0];
        return link;
      },
      { message: `e-mail do convite para ${para}`, timeout: 15_000 },
    )
    .toBeDefined();
  return link!;
}

async function criarSenha(page: Page, senha = SENHA_NOVA) {
  await expect(page.getByRole("heading", { name: "Crie sua senha" })).toBeVisible();
  await page.getByLabel("Nova senha *").fill(senha);
  await page.getByLabel("Confirmar senha *").fill(senha);
  await page.getByRole("button", { name: "Criar senha e continuar" }).click();
  await expect(page.getByRole("heading", { name: "Ative as duas etapas" })).toBeVisible();
}

test.describe.serial("convite de uma pessoa da Comunicação, do e-mail ao painel", () => {
  const email = `paulo.${Date.now()}@sintravc.local`;
  let link: string;
  let segredo: string;

  test("CA-US29.3 e CA-US29.2 · o ADM convida pela tela; a pessoa fica Pendente", async ({ page }) => {
    await entrarComApp(page, pessoas.adm.email, pessoas.adm.senha, pessoas.adm.segredoTotp);
    await page.goto("/painel/equipe");
    await expect(page.getByRole("heading", { name: "Equipe e perfis" })).toBeVisible();

    await page.getByRole("button", { name: "Convidar pessoa" }).click();
    const modal = page.getByRole("dialog", { name: "Convidar pessoa" });
    await expect(modal.getByRole("radio")).toHaveCount(2);
    await expect(modal.getByText("Administrador geral", { exact: true })).toBeVisible();
    await expect(modal.getByText("Comunicação", { exact: true })).toBeVisible();
    await expect(modal.getByText("Atendimento")).toHaveCount(0);
    await expect(modal.getByText(/Serviços sob responsabilidade/)).toHaveCount(0);

    await modal.getByLabel("Nome *").fill("Paulo Lima");
    await modal.getByLabel("E-mail de trabalho *").fill(email);
    await modal.getByText("Comunicação", { exact: true }).click();
    await modal.getByRole("button", { name: "Enviar convite" }).click();

    await expect(page.getByText(`Convite enviado para ${email}.`)).toBeVisible();
    await expect(modal).toBeHidden();
    const linha = page.getByRole("row").filter({ hasText: "Paulo Lima" });
    await expect(linha).toContainText("Comunicação");
    await expect(linha).toContainText("Pendente");
    await expect(linha).toContainText("Convite enviado");

    link = await linkDoEmail(email);
  });

  test("CA-US40.1 e CA-US40.2 · cria a senha, mas sem as duas etapas não entra no painel", async ({ page }) => {
    await page.goto(link);
    await expect(page.getByText("Mariana Souza convidou você para o painel do SINTRAVC.")).toBeVisible();
    await criarSenha(page);

    // Tentar pular as duas etapas: o painel manda para o login, e o login não aceita.
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/painel\/entrar/);
    await informarSenha(page, email, SENHA_NOVA);
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  });

  test("CA-US40.2 e CA-US40.3 · ativa as duas etapas, guarda os 8 códigos e entra só nas áreas da Comunicação (CA-US29.1)", async ({
    page,
  }) => {
    // Abrir o link de novo recomeça do "Crie sua senha".
    await page.goto(link);
    await criarSenha(page);

    segredo = (await page.getByTestId("chave-totp").innerText()).replace(/\s/g, "");
    await page.getByLabel("Número 1 de 6").fill("000000");
    await page.getByRole("button", { name: "Ativar e continuar" }).click();
    await expect(page.getByText("Código incorreto.")).toBeVisible();

    await page.getByLabel("Número 1 de 6").fill(await codigoTotp(segredo));
    await page.getByRole("button", { name: "Ativar e continuar" }).click();
    await expect(page.getByRole("heading", { name: "Guarde seus códigos" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Códigos de recuperação" }).getByRole("listitem")).toHaveCount(8);
    await expect(page.getByText(/Se você recarregar esta página antes de confirmar, serão gerados códigos novos/)).toBeVisible();

    const entrarNoPainel = page.getByRole("button", { name: "Entrar no painel" });
    await expect(entrarNoPainel).toBeDisabled();
    await page.getByLabel("Guardei os códigos em um lugar seguro").check();
    await entrarNoPainel.click();

    await expect(page).toHaveURL(/\/painel$/);
    const nomes = await menu(page).getByRole("link").allInnerTexts();
    const areas = nomes.map((n) => n.trim()).filter((n) => !["Criar conteúdo", "Ver site público", ""].includes(n));
    expect(areas).toEqual(AREAS_DA_COMUNICACAO);
    await expect(menu(page)).toContainText("Paulo Lima");

    // CA-US40.3 e CA-US40.4: o link já usado não mostra os códigos de novo.
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Este convite não vale mais" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Códigos de recuperação" })).toHaveCount(0);
  });

  test("depois do aceite, sai e entra de novo pelo login normal com a senha nova e o código do app", async ({ page }) => {
    await entrarComApp(page, email, SENHA_NOVA, segredo);
    await expect(menu(page)).toContainText("Paulo Lima");
    await sair(page);
  });

  test("a lista da equipe mostra a pessoa como Ativa", async ({ page }) => {
    await entrarComApp(page, pessoas.adm.email, pessoas.adm.senha, pessoas.adm.segredoTotp);
    await page.goto("/painel/equipe");
    const linha = page.getByRole("row").filter({ hasText: "Paulo Lima" });
    await expect(linha).toContainText("Ativa");
    await expect(linha).not.toContainText("Convite enviado");
  });
});

test("o link do pnpm criar-admin abre a mesma tela; vencido, mostra Este convite não vale mais (CA-US40.4)", async ({
  page,
}) => {
  const email = `rita.${Date.now()}@sintravc.local`;
  const saida = execSync(`pnpm -s criar-admin --email ${email} --nome "Rita Prado" --sem-email`, {
    env: { ...process.env, ...ambienteE2E },
    encoding: "utf8",
  });
  const link = saida.match(/https?:\/\/\S+\/painel\/convite\/[\w-]+/)?.[0];
  expect(link).toBeDefined();

  await page.goto(link!);
  await expect(page.getByRole("heading", { name: "Crie sua senha" })).toBeVisible();
  await expect(page.getByText("Você recebeu um convite para o painel do SINTRAVC.")).toBeVisible();
  await expect(page.getByText("Administrador geral", { exact: true })).toBeVisible();

  const banco = postgres(ambienteE2E.DATABASE_URL, { max: 1 });
  await banco`UPDATE convite SET expira_em = now() - interval '1 minute'
    WHERE pessoa_id = (SELECT id FROM pessoa_equipe WHERE email = ${email})`;
  await banco.end();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Este convite não vale mais" })).toBeVisible();
  await page.getByRole("link", { name: "Ir para o login" }).click();
  await expect(page).toHaveURL(/\/painel\/entrar$/);
});
