import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";
import { ambienteE2E } from "../playwright.config";

// Ciclo de vida do conteúdo (#11; US22, CA-US21.9). Este arquivo não envia nada para a Mídia:
// o e2e da Mídia (que roda depois) começa com ela vazia.

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
  await page.waitForURL((url) => url.pathname === voltar.split("?")[0]);
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
  const [linha] = await consultar((sql) => sql<
    { estado: string; motivo_oculto: string | null; ocultado_em: Date | null; versao: number; lide: string }[]
  >`select c.estado, c.motivo_oculto, c.ocultado_em, c.versao, n.lide
    from conteudo c join noticia n on n.conteudo_id = c.id where c.id = ${id}`);
  return linha;
}

async function acoesNaAtividade(id: string) {
  const linhas = await consultar((sql) => sql<{ acao: string }[]>`select acao from atividade where alvo_id = ${id} order by id`);
  return linhas.map((l) => l.acao);
}

const salvo = (page: Page) => expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");
const idDaUrl = (page: Page) => new URL(page.url()).pathname.split("/").at(-1)!;
const linhaDa = (page: Page, titulo: string) => page.getByRole("row").filter({ hasText: titulo });

/** Escreve uma notícia pelo editor e devolve o id. */
async function escrever(page: Page, manchete: string) {
  await page.goto("/painel/conteudos/noticia/nova");
  await page.getByLabel("Manchete").fill(manchete);
  await salvo(page);
  await expect(page).toHaveURL(/\/painel\/conteudos\/noticia\/[0-9a-f-]{36}$/);
  return idDaUrl(page);
}

/** Escreve e publica uma notícia completa pelo editor, como a pessoa faria. */
async function publicar(page: Page, manchete: string, lide = "O plantão funciona das 8h às 17h, na sede do sindicato.") {
  const id = await escrever(page, manchete);
  await page.getByLabel("Lide").fill(lide);
  await page.getByRole("textbox", { name: "Corpo da notícia" }).click();
  await page.keyboard.type("Leve contracheques e documento com foto.");
  await page.getByLabel("Assinatura").fill("Redação SINTRAVC");
  await page.getByLabel("Categoria").selectOption({ label: "Jurídico" });
  await salvo(page);
  await page.getByRole("button", { name: "Publicar…" }).click();
  await page.getByRole("dialog", { name: "Publicar notícia?" }).getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Notícia publicada.", { exact: true })).toBeVisible();
  return id;
}

/** Edita o lide da publicada e publica as alterações (gera uma versão nova). */
async function publicarNovoLide(page: Page, lide: string) {
  await page.getByLabel("Lide").fill(lide);
  await salvo(page);
  await page.getByRole("button", { name: "Publicar alterações…" }).click();
  await page.getByRole("dialog", { name: "Publicar alterações?" }).getByRole("button", { name: "Publicar alterações" }).click();
  await expect(page.getByText("Alterações publicadas.", { exact: true })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

const MARCA = `ciclo${Date.now().toString(36)}`;

test("CA-US22.2 · arquivar 2 em lote, desfazer pelo aviso e encontrar em Arquivados", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const a = await publicar(page, `Assembleia de outubro ${MARCA}`);
  const b = await publicar(page, `Campanha salarial ${MARCA}`);

  await page.goto(`/painel/conteudos?busca=${MARCA}`);
  await page.getByRole("checkbox", { name: `Selecionar “Assembleia de outubro ${MARCA}”` }).click();
  await page.getByRole("checkbox", { name: `Selecionar “Campanha salarial ${MARCA}”` }).click();
  const barra = page.getByRole("region", { name: "Ações em lote" });
  await expect(barra).toContainText("2 itens selecionados");

  await barra.getByRole("button", { name: "Arquivar" }).click();
  const confirmacao = page.getByRole("alertdialog", { name: "Arquivar 2 conteúdos?" });
  await expect(confirmacao).toContainText("Conteúdos › Arquivados");
  await confirmacao.getByRole("button", { name: "Arquivar" }).click();

  // Saem da lista; o aviso oferece desfazer.
  await expect(page.getByText("2 itens foram para Arquivados.")).toBeVisible();
  await expect(linhaDa(page, MARCA)).toHaveCount(0);
  expect((await noBanco(a))!.estado).toBe("arquivado");

  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Arquivamento desfeito: 2 itens voltaram.")).toBeVisible();
  await expect(linhaDa(page, MARCA)).toHaveCount(2);
  await expect(linhaDa(page, `Assembleia de outubro ${MARCA}`)).toContainText("Publicado");

  // Arquiva de novo, agora pela caixa “todos desta página”, e acha os dois na aba Arquivados.
  await page.getByRole("checkbox", { name: "Selecionar todos desta página" }).click();
  await page.getByRole("region", { name: "Ações em lote" }).getByRole("button", { name: "Arquivar" }).click();
  await page.getByRole("alertdialog", { name: "Arquivar 2 conteúdos?" }).getByRole("button", { name: "Arquivar" }).click();
  await expect(linhaDa(page, MARCA)).toHaveCount(0);

  await page.getByRole("link", { name: /Arquivados/ }).click();
  await expect(page).toHaveURL(/arquivados=1/);
  await expect(linhaDa(page, MARCA)).toHaveCount(2);
  await expect(linhaDa(page, `Campanha salarial ${MARCA}`)).toContainText("Arquivado");

  // Uma linha na Atividade para cada notícia, a cada vez.
  for (const id of [a, b]) {
    expect((await acoesNaAtividade(id)).filter((acao) => acao.includes("arquiv"))).toEqual([
      "noticia.arquivar",
      "noticia.desfazer_arquivamento",
      "noticia.arquivar",
    ]);
  }

  // Restaurar como rascunho, pelo menu da linha.
  await page.getByRole("button", { name: `Mais ações para “Campanha salarial ${MARCA}”` }).click();
  await page.getByRole("menuitem", { name: "Restaurar como rascunho" }).click();
  await page.getByRole("alertdialog", { name: "Restaurar como rascunho?" }).getByRole("button", { name: "Restaurar como rascunho" }).click();
  await expect(page.getByText("Restaurado como rascunho.")).toBeVisible();
  await expect(linhaDa(page, `Campanha salarial ${MARCA}`)).toHaveCount(0);
  expect((await noBanco(b))!.estado).toBe("rascunho");
});

test("CA-US22.1 · ocultar pede motivo: o botão só libera com o motivo escrito", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const titulo = `Horário de feriado ${MARCA}`;
  const id = await publicar(page, titulo);

  await page.goto(`/painel/conteudos?busca=${encodeURIComponent(titulo)}`);
  // Publicada: o menu só tem ocultar e arquivar (CA-US22.4).
  await page.getByRole("button", { name: `Mais ações para “${titulo}”` }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Ocultar do site", "Arquivar"]);
  await menu.getByRole("menuitem", { name: "Ocultar do site" }).click();

  const modal = page.getByRole("alertdialog", { name: "Ocultar do site?" });
  const motivo = modal.getByLabel(/Motivo/);
  await expect(motivo).toBeFocused();
  const botao = modal.getByRole("button", { name: "Ocultar do site" });
  await expect(botao).toBeDisabled();
  await motivo.fill("   ");
  await expect(botao).toBeDisabled();
  await motivo.fill("A data do feriado mudou");
  await botao.click();

  await expect(page.getByText("Conteúdo oculto do site.")).toBeVisible();
  await expect(linhaDa(page, titulo)).toContainText("Oculto");
  const depois = await noBanco(id);
  expect(depois).toMatchObject({ estado: "oculto", motivo_oculto: "A data do feriado mudou" });
  expect(depois!.ocultado_em).not.toBeNull();

  // No editor, a faixa mostra o motivo; editar a cópia não muda o "Retirado em" (E45).
  await page.goto(`/painel/conteudos/noticia/${id}`);
  await expect(page.getByText("Motivo: A data do feriado mudou")).toBeVisible();
  await page.getByLabel("Lide").fill("Lide corrigido enquanto estava oculta.");
  await salvo(page);
  expect((await noBanco(id))!.ocultado_em).toEqual(depois!.ocultado_em);

  // "Mostrar no site" volta a versão que estava no ar; a mudança fica esperando a publicação.
  await page.getByRole("button", { name: "Mostrar no site" }).click();
  await page.getByRole("alertdialog", { name: "Mostrar no site de novo?" }).getByRole("button", { name: "Mostrar no site" }).click();
  await expect(page.getByText("Conteúdo de volta ao site.")).toBeVisible();
  await expect(page.getByText("Há alterações que ainda não estão no site")).toBeVisible();
  expect(await noBanco(id)).toMatchObject({ estado: "publicado", motivo_oculto: null, ocultado_em: null, versao: 1 });
});

test("RN09 · Edição rápida: ocultar e mostrar no site pedem confirmação, com o motivo no modal", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const titulo = `Mutirão de documentos ${MARCA}`;
  const id = await publicar(page, titulo);

  await page.goto(`/painel/conteudos?busca=${encodeURIComponent(titulo)}`);
  await page.getByRole("link", { name: `Edição rápida de “${titulo}”` }).click();
  const painel = page.getByRole("dialog", { name: "Edição rápida" });
  await painel.getByLabel("Título").fill(`${titulo} (revisado)`);
  await painel.getByRole("radio", { name: /^Oculto/ }).click();
  await painel.getByRole("button", { name: "Salvar alterações" }).click();

  // Nada é gravado antes de confirmar; o motivo é obrigatório no modal.
  const modal = page.getByRole("alertdialog", { name: "Ocultar do site?" });
  await expect(modal.getByRole("button", { name: "Ocultar do site" })).toBeDisabled();
  expect((await noBanco(id))!.estado).toBe("publicado");
  await modal.getByLabel(/Motivo/).fill("Faltou o horário do mutirão");
  await modal.getByRole("button", { name: "Ocultar do site" }).click();

  await expect(page.getByText("Conteúdo oculto do site.")).toBeVisible();
  await expect(painel).toHaveCount(0);
  await expect(linhaDa(page, titulo)).toContainText("Oculto");
  expect(await noBanco(id)).toMatchObject({ estado: "oculto", motivo_oculto: "Faltou o horário do mutirão" });
  expect((await acoesNaAtividade(id)).slice(-2)).toEqual(["noticia.editar", "noticia.ocultar"]);

  // De novo na Edição rápida: o título mudado é alteração que ainda não está no site (E45).
  await page.getByRole("link", { name: /^Edição rápida de “Mutirão de documentos/ }).click();
  await expect(painel.getByText("Há alterações que ainda não estão no site")).toBeVisible();
  await expect(painel.getByText("Motivo: Faltou o horário do mutirão")).toBeVisible();
  await painel.getByRole("radio", { name: /^Mostrar no site/ }).click();
  await painel.getByRole("button", { name: "Salvar alterações" }).click();
  const mostrar = page.getByRole("alertdialog", { name: "Mostrar no site de novo?" });
  await mostrar.getByRole("button", { name: "Mostrar no site" }).click();

  await expect(page.getByText("Conteúdo de volta ao site.")).toBeVisible();
  expect(await noBanco(id)).toMatchObject({ estado: "publicado", motivo_oculto: null, versao: 1 });
  expect((await acoesNaAtividade(id)).at(-1)).toBe("noticia.mostrar");
});

test("CA-US22.3 · a autora exclui o rascunho que nunca foi ao ar, pelo editor", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const id = await escrever(page, `Rascunho para excluir ${MARCA}`);

  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("menuitem", { name: "Excluir rascunho" }).click();
  const modal = page.getByRole("alertdialog", { name: "Excluir rascunho?" });
  await expect(modal).toContainText("não pode ser desfeita");
  await modal.getByRole("button", { name: "Excluir rascunho" }).click();

  await expect(page).toHaveURL(/\/painel\/conteudos$/);
  await expect(page.getByText("Rascunho excluído.")).toBeVisible();
  await expect(linhaDa(page, `Rascunho para excluir ${MARCA}`)).toHaveCount(0);
  expect(await noBanco(id)).toBeUndefined();
  expect((await acoesNaAtividade(id)).at(-1)).toBe("noticia.excluir");
});

test("CA-US22.5 · rascunho de outra pessoa: a Comunicação não vê Excluir; o Administrador geral vê", async ({ browser }) => {
  const titulo = `Rascunho de outra pessoa ${MARCA}`;
  const autora = await browser.newContext();
  const paginaDaAutora = await autora.newPage();
  await entrar(paginaDaAutora, pessoas.com, "/painel/conteudos/noticia/nova");
  await escrever(paginaDaAutora, titulo);
  await autora.close();

  for (const [pessoa, veExcluir] of [
    [pessoas.com2, false],
    [pessoas.adm, true],
  ] as const) {
    const contexto = await browser.newContext();
    const page = await contexto.newPage();
    await entrar(page, pessoa, "/painel/conteudos");
    await page.goto(`/painel/conteudos?busca=${encodeURIComponent(titulo)}`);
    await page.getByRole("button", { name: `Mais ações para “${titulo}”` }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Arquivar" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Excluir rascunho" })).toHaveCount(veExcluir ? 1 : 0);
    await contexto.close();
  }
});

test("CA-US21.9 · Histórico: 3 versões com quem e quando; restaurar a 1 não tira a atual do ar", async ({ page }) => {
  await entrar(page, pessoas.com, "/painel/conteudos/noticia/nova");
  const id = await publicar(page, `Plantão jurídico ${MARCA}`, "Lide da versão 1.");
  await publicarNovoLide(page, "Lide da versão 2.");
  await publicarNovoLide(page, "Lide da versão 3.");

  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("menuitem", { name: "Histórico de versões" }).click();
  const painel = page.getByRole("dialog", { name: "Histórico de versões" });
  const versoes = painel.getByRole("list", { name: "Versões publicadas" }).getByRole("listitem");
  await expect(versoes).toHaveCount(3);
  await expect(versoes.nth(0)).toContainText("Versão 3 · no site agora");
  await expect(versoes.nth(0)).toContainText("Mudou: lide.");
  await expect(versoes.nth(2)).toContainText("Primeira publicação.");
  await expect(versoes.nth(2)).toContainText(pessoas.com.nome);
  await expect(versoes.nth(0).getByRole("button", { name: "Restaurar como rascunho" })).toHaveCount(0);

  await versoes.nth(2).getByRole("button", { name: "Restaurar como rascunho" }).click();
  await page.getByRole("alertdialog", { name: "Restaurar a versão 1 como rascunho?" }).getByRole("button", { name: "Restaurar como rascunho" }).click();

  await expect(page.getByText("Versão 1 restaurada como rascunho.")).toBeVisible();
  await expect(painel).toHaveCount(0);
  await expect(page.getByLabel("Lide")).toHaveValue("Lide da versão 1.");
  await expect(page.getByText("Há alterações que ainda não estão no site")).toBeVisible();
  expect(await noBanco(id)).toMatchObject({ estado: "publicado", versao: 3, lide: "Lide da versão 1." });
  expect((await acoesNaAtividade(id)).at(-1)).toBe("noticia.restaurar_versao");

  // Oculta, com a versão 1 na cópia de trabalho: o aviso de alterações continua (E45).
  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("menuitem", { name: "Ocultar do site" }).click();
  const ocultar = page.getByRole("alertdialog", { name: "Ocultar do site?" });
  await ocultar.getByLabel(/Motivo/).fill("Conferir o lide com o jurídico");
  await ocultar.getByRole("button", { name: "Ocultar do site" }).click();
  await expect(page.getByText("Conteúdo oculto do site.")).toBeVisible();
  await expect(page.getByText("Há alterações que ainda não estão no site")).toBeVisible();

  // No Histórico, a versão 3 vem marcada como a que volta ao site, e restaurar outra avisa que as alterações serão substituídas.
  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("menuitem", { name: "Histórico de versões" }).click();
  await expect(versoes).toHaveCount(3);
  await expect(versoes.nth(0)).toContainText("Volta ao site com “Mostrar no site”.");
  await expect(versoes.nth(0)).not.toContainText("no site agora");
  await expect(versoes.nth(0).getByRole("button", { name: "Restaurar como rascunho" })).toHaveCount(0);
  await versoes.nth(1).getByRole("button", { name: "Restaurar como rascunho" }).click();
  const restaurar = page.getByRole("alertdialog", { name: "Restaurar a versão 2 como rascunho?" });
  await expect(restaurar).toContainText("As alterações que ainda não estão no site são substituídas.");
  await restaurar.getByRole("button", { name: "Cancelar" }).click();
  expect(await noBanco(id)).toMatchObject({ estado: "oculto", lide: "Lide da versão 1." });
});
