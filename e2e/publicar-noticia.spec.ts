import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E } from "../playwright.config";

// Envia a capa para a Mídia: por isso roda depois de midia.spec.ts (que começa com a Mídia vazia).
// Tudo é feito pela tela, como uma pessoa faria; o banco só é lido para conferir o resultado.

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

async function situacaoNoBanco(id: string) {
  const [linha] = await consultar((sql) => sql<
    { estado: string; ja_publicado: boolean; publicado_em: Date | null; versao: number; slug: string | null; versoes: number }[]
  >`
    select c.estado, c.ja_publicado, c.publicado_em, c.versao, c.slug,
      (select count(*)::int from conteudo_versao v where v.conteudo_id = c.id) as versoes
    from conteudo c where c.id = ${id}`);
  return linha!;
}

async function acoesNaAtividade(id: string) {
  const linhas = await consultar((sql) => sql<{ acao: string }[]>`
    select acao from atividade where alvo_id = ${id} order by id`);
  return linhas.map((l) => l.acao);
}

const status = (page: Page) => page.getByTestId("status-do-salvamento");
const salvo = (page: Page) => expect(status(page)).toContainText("Salvo automaticamente às");

test.describe.configure({ mode: "serial" });

let id = "";
const MANCHETE = "Plantão jurídico passa a atender às quartas";
const LIDE = "A partir de 3 de novembro, o plantão funciona das 14h às 17h, na sede do sindicato.";

test("CA-US21.3 · faltando obrigatórios, a publicação é impedida e cada campo é indicado", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  await page.getByLabel("Manchete").fill(MANCHETE);
  await salvo(page);
  id = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.getByRole("button", { name: "Publicar…" }).click();
  const alerta = page.getByRole("alert").filter({ hasText: "obrigatórios para publicar" });
  await expect(alerta).toContainText("Faltam 4 itens obrigatórios para publicar");
  await expect(page.getByLabel("Lide")).toBeFocused();
  await expect(page.getByLabel("Lide")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // A pessoa vai preenchendo; a lista do alerta diminui junto.
  await page.getByLabel("Lide").fill(LIDE);
  await page.getByRole("textbox", { name: "Corpo da notícia" }).click();
  await page.keyboard.type("Leve contracheques, carteira de trabalho e comunicados da empresa.");
  await page.getByLabel("Assinatura").fill("Redação SINTRAVC");
  await page.getByLabel("Categoria").selectOption({ label: "Jurídico" });
  await expect(alerta).toHaveCount(0);

  // Capa nova, enviada pelo seletor, sem texto alternativo.
  await page.getByRole("button", { name: "Escolher imagem" }).click();
  const seletor = page.getByRole("dialog", { name: "Imagem de capa" });
  const foto = await sharp({ create: { width: 1200, height: 675, channels: 3, background: "#0b2a5b" } }).png().toBuffer();
  await seletor.getByTestId("entrada-arquivos").setInputFiles({ name: "plantao-juridico.png", mimeType: "image/png", buffer: foto });
  await expect(seletor.getByRole("button", { name: /plantao-juridico\.png/, pressed: true })).toBeVisible();
  await seletor.getByRole("button", { name: "Usar este arquivo" }).click();
  await expect(page.getByLabel("Texto alternativo")).toHaveValue("");
  await salvo(page);

  await page.getByRole("button", { name: "Publicar…" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Falta 1 item obrigatório para publicar" })).toContainText(
    "Texto alternativo da capa",
  );
  await expect(page.getByLabel("Texto alternativo")).toBeFocused();
  await expect(page.getByLabel("Texto alternativo")).toHaveAttribute("aria-invalid", "true");
  expect(await situacaoNoBanco(id)).toMatchObject({ estado: "rascunho", ja_publicado: false, versoes: 0 });

  await page.getByLabel("Texto alternativo").fill("Advogada atende trabalhador na sede do sindicato");
  await salvo(page);
  const antes = page.getByRole("region", { name: "Antes de publicar" });
  await expect(antes.getByText(": falta preencher")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Destacar na Home" })).toHaveAttribute("href", `/painel/pagina-inicial?sugerir=${id}`);
});

test("pré-visualizar como no site, trocar para Celular e publicar pela confirmação", async ({ page }) => {
  await entrar(page, pessoas.com, `/painel/conteudos/noticia/${id}`);

  // Pré-visualizar salva o que estiver pendente e abre a prévia.
  await page.getByRole("button", { name: "Pré-visualizar" }).click();
  await expect(page).toHaveURL(`/painel/conteudos/noticia/${id}/previa`);
  await expect(page.getByRole("heading", { level: 1, name: MANCHETE })).toBeVisible();
  await expect(page.getByText("Prévia · ainda não publicada")).toBeVisible();
  await expect(page.getByRole("img", { name: "Advogada atende trabalhador na sede do sindicato" })).toBeVisible();
  await page.getByRole("button", { name: "Celular" }).click();
  await expect(page.getByRole("button", { name: "Celular" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("moldura-da-previa")).toHaveAttribute("data-tela", "celular");

  // "Publicar…" da prévia volta ao editor com a confirmação aberta.
  await page.getByRole("link", { name: "Publicar…" }).click();
  const modal = page.getByRole("dialog", { name: "Publicar notícia?" });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(MANCHETE);
  await expect(modal).toContainText("Notícia · Jurídico · Redação SINTRAVC");
  await expect(modal).toContainText("Agora, ao confirmar");
  await expect(modal).not.toContainText("Brasília");

  // Esc fecha sem publicar e devolve o foco ao botão.
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  expect((await situacaoNoBanco(id)).estado).toBe("rascunho");

  await page.getByRole("button", { name: "Publicar…" }).click();
  await page.getByRole("dialog", { name: "Publicar notícia?" }).getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Notícia publicada. Ela já está no site.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-editor-noticia] > header").getByText("Publicado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar alterações…" })).toHaveAccessibleDescription(/Nada novo para publicar/);

  const noBanco = await situacaoNoBanco(id);
  expect(noBanco).toMatchObject({
    estado: "publicado",
    ja_publicado: true,
    versao: 1,
    versoes: 1,
    slug: "plantao-juridico-passa-a-atender-as-quartas",
  });
  expect(noBanco.publicado_em).not.toBeNull();
  expect((await acoesNaAtividade(id)).at(-1)).toBe("noticia.publicar");
});

test("E42 · editar a publicada: o site só muda ao publicar as alterações, e dá para descartar", async ({ page }) => {
  await entrar(page, pessoas.com, `/painel/conteudos/noticia/${id}`);
  const lide = page.getByLabel("Lide");

  // Edita: o salvamento automático não gera versão (CA-US21.10).
  await lide.fill(`${LIDE} Mudança que vai ser descartada.`);
  await salvo(page);
  await expect(page.getByText("Há alterações que ainda não estão no site")).toBeVisible();
  expect(await situacaoNoBanco(id)).toMatchObject({ versao: 1, versoes: 1 });

  // Descartar pede confirmação e volta o texto ao que está no site.
  await page.getByRole("button", { name: "Descartar alterações" }).click();
  const confirmacao = page.getByRole("alertdialog", { name: "Descartar alterações?" });
  await confirmacao.getByRole("button", { name: "Descartar alterações" }).click();
  await expect(page.getByText("Alterações descartadas.")).toBeVisible();
  await expect(lide).toHaveValue(LIDE);
  await expect(page.getByText("Há alterações que ainda não estão no site")).toHaveCount(0);

  // Edita de novo e publica as alterações: versão 2.
  await lide.fill(`${LIDE} Leve documento com foto.`);
  await salvo(page);
  await page.getByRole("button", { name: "Publicar alterações…" }).click();
  const modal = page.getByRole("dialog", { name: "Publicar alterações?" });
  await modal.getByRole("button", { name: "Publicar alterações" }).click();
  await expect(page.getByText("Alterações publicadas.")).toBeVisible();
  await expect(page.getByText("Há alterações que ainda não estão no site")).toHaveCount(0);

  expect(await situacaoNoBanco(id)).toMatchObject({ estado: "publicado", versao: 2, versoes: 2 });
  expect(await acoesNaAtividade(id)).toEqual(
    expect.arrayContaining(["noticia.publicar", "noticia.descartar_alteracoes", "noticia.publicar_alteracoes"]),
  );
});

test("RNF01 · o Atendimento não abre a prévia pelo endereço direto", async ({ page }) => {
  await entrar(page, pessoas.atd, "/painel");
  const resposta = await page.goto(`/painel/conteudos/noticia/${id}/previa`);
  expect(resposta?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Você não tem acesso a esta área" })).toBeVisible();
});
