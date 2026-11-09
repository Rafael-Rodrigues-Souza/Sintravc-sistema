import { readFileSync } from "node:fs";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import postgres from "postgres";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E } from "../playwright.config";

// Este arquivo não envia nada para a Mídia: o e2e da Mídia (que roda depois) começa com ela vazia.

type Pessoas = Record<"adm" | "com" | "com2" | "atd", PessoaDeTeste>;
const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Pessoas;

async function entrar(page: Page, p: PessoaDeTeste, voltar = "/painel/conteudos") {
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
  await page.waitForURL((url) => url.pathname === voltar);
}

async function consultar<T extends object>(consulta: (sql: postgres.Sql) => Promise<T[]>) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await consulta(sql);
  } finally {
    await sql.end();
  }
}

async function noticiaNoBanco(id: string) {
  const [linha] = await consultar((sql) => sql<{ titulo: string; lide: string }[]>`
    select c.titulo, n.lide from conteudo c join noticia n on n.conteudo_id = c.id where c.id = ${id}`);
  return linha;
}

async function atividadesDa(id: string) {
  return consultar((sql) => sql<{ acao: string; nome: string; escolha: string | null }[]>`
    select a.acao, p.nome, a.detalhe->>'escolha' as escolha
    from atividade a join pessoa_equipe p on p.id::text = a.ator_id
    where a.alvo_id = ${id} order by a.id`);
}

const status = (page: Page) => page.getByTestId("status-do-salvamento");
const manchete = (page: Page) => page.getByLabel("Manchete");
const idDaUrl = (page: Page) => new URL(page.url()).pathname.split("/").at(-1)!;

/** Cria uma notícia pelo editor e devolve o id (o endereço muda depois do primeiro salvamento). */
async function criarNoticia(page: Page, titulo: string) {
  await page.goto("/painel/conteudos/noticia/nova");
  await manchete(page).fill(titulo);
  await expect(status(page)).toContainText("Salvo automaticamente às");
  await expect(page).toHaveURL(/\/painel\/conteudos\/noticia\/[0-9a-f-]{36}$/);
  return idDaUrl(page);
}

async function novoContexto(browser: { newContext: () => Promise<BrowserContext> }, pessoa: PessoaDeTeste, voltar?: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await entrar(page, pessoa, voltar);
  return { contexto, page };
}

test.describe.configure({ mode: "serial" });

test("menu Criar: a Comunicação vê Edital e Acordo travados", async ({ page }) => {
  await entrar(page, pessoas.com);
  await expect(page.getByRole("heading", { name: "Conteúdos", level: 1 })).toBeVisible();
  await expect(page.getByText("Editais e acordos coletivos: só o Administrador geral publica")).toBeVisible();

  await page.getByRole("button", { name: "Criar conteúdo" }).first().click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: /Notícia/ })).toBeEnabled();
  await expect(menu.getByText("Só Administrador geral")).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /Edital/ })).toHaveAttribute("aria-disabled", "true");
  await expect(menu.getByRole("menuitem", { name: /Acordo ou convenção/ })).toHaveAttribute("aria-disabled", "true");
  await expect(menu).toContainText("escreva uma notícia e coloque o link do documento oficial");

  await menu.getByRole("menuitem", { name: /Notícia/ }).click();
  await expect(page).toHaveURL(/\/painel\/conteudos\/noticia\/nova$/);
  await expect(page.getByRole("heading", { name: "Nova notícia" })).toBeVisible();
});

test("CA-US21.1 · rascunho salvo sozinho, e continua lá ao recarregar", async ({ page }) => {
  await entrar(page, pessoas.com);
  const id = await criarNoticia(page, "Plantão jurídico em novo horário");
  await page.getByLabel("Lide").fill("A partir de segunda, o plantão funciona das 8h às 17h.");
  await expect(status(page)).toContainText("Salvo automaticamente às");

  await page.reload();
  await expect(manchete(page)).toHaveValue("Plantão jurídico em novo horário");
  await expect(page.getByLabel("Lide")).toHaveValue("A partir de segunda, o plantão funciona das 8h às 17h.");
  expect(await noticiaNoBanco(id)).toEqual({
    titulo: "Plantão jurídico em novo horário",
    lide: "A partir de segunda, o plantão funciona das 8h às 17h.",
  });

  // Aparece na lista, como rascunho.
  await page.goto("/painel/conteudos");
  const linha = page.getByRole("row").filter({ hasText: "Plantão jurídico em novo horário" }).first();
  await expect(linha).toContainText("Rascunho");
  await expect(linha).toContainText("Carlos Ribeiro");
});

test("limites: manchete 110 e linha fina 200", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  await manchete(page).fill("m".repeat(130));
  await expect(manchete(page)).toHaveValue("m".repeat(110));
  await expect(page.getByText("110/110")).toBeVisible();
  await page.getByLabel("Linha fina").fill("l".repeat(230));
  await expect(page.getByLabel("Linha fina")).toHaveValue("l".repeat(200));
  await expect(page.getByText("200/200")).toBeVisible();
});

test("CA-US21.4 · sair com alteração pendente: Voltar, Descartar e Salvar e sair", async ({ page }) => {
  await entrar(page, pessoas.com);
  const id = await criarNoticia(page, "Sair sem salvar");
  const visaoGeral = page.getByRole("navigation", { name: "Menu do painel" }).getByRole("link", { name: "Visão geral" });
  const modal = page.getByRole("alertdialog", { name: "Sair sem salvar?" });

  // Voltar: fecha o modal e continua no editor.
  await manchete(page).fill("Sair sem salvar — 1");
  await visaoGeral.click();
  await expect(modal).toContainText("“Sair sem salvar — 1”");
  await modal.getByRole("button", { name: "Voltar" }).click();
  await expect(modal).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/noticia/${id}$`));
  await expect(status(page)).toContainText("Salvo automaticamente às");

  // Descartar: sai sem gravar.
  await manchete(page).fill("Descartada");
  await visaoGeral.click();
  await modal.getByRole("button", { name: "Descartar alterações" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  expect((await noticiaNoBanco(id))?.titulo).toBe("Sair sem salvar — 1");

  // Salvar e sair: grava e sai.
  await page.goto(`/painel/conteudos/noticia/${id}`);
  await manchete(page).fill("Salva ao sair");
  await visaoGeral.click();
  await modal.getByRole("button", { name: "Salvar e sair" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  expect((await noticiaNoBanco(id))?.titulo).toBe("Salva ao sair");
});

test("CA-US21.5 · outra pessoa da Comunicação edita, e a Atividade registra o nome dela", async ({ browser, page }) => {
  await entrar(page, pessoas.com);
  const id = await criarNoticia(page, "Notícia do Carlos");

  const { contexto, page: daJoana } = await novoContexto(browser, pessoas.com2, `/painel/conteudos/noticia/${id}`);
  await manchete(daJoana).fill("Notícia do Carlos, revisada pela Joana");
  await expect(status(daJoana)).toContainText("Salvo automaticamente às");
  await contexto.close();

  expect((await noticiaNoBanco(id))?.titulo).toBe("Notícia do Carlos, revisada pela Joana");
  expect(await atividadesDa(id)).toEqual([
    { acao: "noticia.criar", nome: "Carlos Ribeiro", escolha: null },
    { acao: "noticia.editar", nome: "Joana Lima", escolha: null },
  ]);
});

test("E02 · sem internet: faixa, Publicar travado, Mídia travada e envio quando a conexão volta", async ({ page, context }) => {
  await entrar(page, pessoas.com);
  const id = await criarNoticia(page, "Escrita no ônibus");

  await context.setOffline(true);
  await expect(page.getByText("Você está sem internet")).toBeVisible();
  const publicar = page.getByRole("button", { name: "Publicar…" });
  await expect(publicar).toHaveAttribute("aria-disabled", "true");
  await expect(publicar).toHaveAccessibleDescription(/Sem internet/);
  await expect(page.getByRole("button", { name: "Escolher imagem" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("button", { name: /Conecte-se à internet para enviar ou escolher arquivos da Mídia/ })).toBeVisible();
  await expect(page.getByText("Conecte-se à internet para enviar ou escolher arquivos da Mídia").first()).toBeVisible();

  // O texto continua editável e fica guardado neste computador.
  await manchete(page).fill("Escrita no ônibus, sem sinal");
  await expect(status(page)).toContainText("Sem internet · guardado neste computador");
  expect((await noticiaNoBanco(id))?.titulo).toBe("Escrita no ônibus");

  await context.setOffline(false);
  await expect(page.getByText("Você está sem internet")).toBeHidden();
  await expect(status(page)).toContainText("Salvo automaticamente às");
  expect((await noticiaNoBanco(id))?.titulo).toBe("Escrita no ônibus, sem sinal");
});

test("N4 · conflito de versões: a versão escolhida vence e vai para a Atividade", async ({ browser, page }) => {
  await entrar(page, pessoas.com);
  const id = await criarNoticia(page, "Versão original");

  // Carlos fica sem internet e edita.
  await page.context().setOffline(true);
  await manchete(page).fill("Versão do Carlos, sem internet");
  await expect(status(page)).toContainText("Sem internet");

  // Enquanto isso, Joana salva outra versão no servidor.
  const { contexto, page: daJoana } = await novoContexto(browser, pessoas.com2, `/painel/conteudos/noticia/${id}`);
  await manchete(daJoana).fill("Versão da Joana");
  await expect(status(daJoana)).toContainText("Salvo automaticamente às");
  await contexto.close();

  // A conexão do Carlos volta: aparece a escolha.
  await page.context().setOffline(false);
  const modal = page.getByRole("dialog", { name: "Há duas versões do rascunho" });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Salva por Joana Lima");
  await expect(modal).toContainText("Mudou: manchete");
  await modal.getByRole("button", { name: "Manter a versão escolhida" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByText("Sua versão foi mantida.")).toBeVisible();

  expect((await noticiaNoBanco(id))?.titulo).toBe("Versão do Carlos, sem internet");
  expect((await atividadesDa(id)).at(-1)).toEqual({ acao: "noticia.resolver_conflito", nome: "Carlos Ribeiro", escolha: "minha" });
});

test("computador compartilhado: o rascunho guardado de uma pessoa não aparece para outra", async ({ page, context }) => {
  await entrar(page, pessoas.com);
  const id = await criarNoticia(page, "Rascunho no computador da sede");

  // Carlos edita sem internet e fecha a aba: a alteração fica guardada neste navegador.
  await context.setOffline(true);
  await manchete(page).fill("Alteração só do Carlos");
  await expect(status(page)).toContainText("Sem internet");
  // Sai do editor ainda sem internet, aceitando o aviso de alterações pendentes: quando a conexão
  // voltar, o editor já foi descarregado e não envia nada (a cópia fica só no navegador).
  page.on("dialog", (aviso) => void aviso.accept());
  await page.goto("about:blank");
  await context.setOffline(false);

  // Carlos sai do painel em outra aba.
  const outra = await context.newPage();
  await outra.goto("/painel");
  await outra.getByRole("button", { name: "Sair do painel" }).click();
  await outra.waitForURL(/\/painel\/entrar/);

  // Joana entra no mesmo navegador: não vê nem envia a alteração do Carlos.
  await entrar(outra, pessoas.com2, `/painel/conteudos/noticia/${id}`);
  await expect(manchete(outra)).toHaveValue("Rascunho no computador da sede");
  await expect(outra.getByText("Recuperamos as alterações guardadas neste computador.")).toBeHidden();
  await outra.waitForTimeout(3000); // mais que o intervalo do salvamento automático
  expect((await noticiaNoBanco(id))?.titulo).toBe("Rascunho no computador da sede");
  await outra.getByRole("button", { name: "Sair do painel" }).click();
  await outra.waitForURL(/\/painel\/entrar/);

  // Carlos entra de novo: a alteração dele volta e é salva.
  await entrar(outra, pessoas.com, `/painel/conteudos/noticia/${id}`);
  await expect(outra.getByText("Recuperamos as alterações guardadas neste computador.")).toBeVisible();
  await expect(manchete(outra)).toHaveValue("Alteração só do Carlos");
  await expect(status(outra)).toContainText("Salvo automaticamente às");
  expect((await noticiaNoBanco(id))?.titulo).toBe("Alteração só do Carlos");
});

test("menu Criar: o Administrador geral vê os documentos como “Disponível em breve”", async ({ page }) => {
  await entrar(page, pessoas.adm);
  await expect(page.getByText("Editais e acordos coletivos: só o Administrador geral publica")).toBeHidden();
  await page.getByRole("button", { name: "Criar conteúdo" }).first().click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText("Só Administrador geral")).toBeHidden();
  await expect(menu.getByRole("menuitem", { name: /Edital/ })).toContainText("Disponível em breve");
});

test("o Atendimento não abre o editor (403)", async ({ page }) => {
  await entrar(page, pessoas.atd, "/painel");
  const resposta = await page.goto("/painel/conteudos/noticia/nova");
  expect(resposta?.status()).toBe(403);
  await expect(page.getByRole("navigation", { name: "Menu do painel" }).getByRole("button", { name: "Criar conteúdo" })).toHaveCount(0);
});
