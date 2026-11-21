import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import { ambienteE2E, RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import { publicarNoticiaPelaTela } from "./noticias";
import { acaoDaLinha, entrarComo, pessoas, semRolagemLateral } from "./responsivo";

// Notícias no site (US02, RF02, RN58, E30, E59; CA-US02.1, CA-US02.2, CA-US21.6 a CA-US21.8) pela
// tela, como uma pessoa faria: a Comunicação publica e fixa pelo painel, e o visitante filtra, busca,
// ordena, abre e compartilha. O banco só é lido para conferir e, em poucos casos, para preparar um
// estado que a tela levaria dias para produzir (fixação vencida, volume para paginar).

async function consultar<T extends object>(consulta: (sql: postgres.Sql) => Promise<T[]>) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await consulta(sql);
  } finally {
    await sql.end();
  }
}

async function semAviso(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([{ name: "sintravc_cookies", value: "essenciais", url: baseURL! }]);
}

async function noticiaPelaManchete(manchete: string) {
  const [linha] = await consultar((sql) => sql<{ id: string; slug: string | null; fixada_ate: Date | null }[]>`
    select c.id, c.slug, n.fixada_ate from conteudo c join noticia n on n.conteudo_id = c.id
    where c.titulo = ${manchete} order by c.id desc limit 1`);
  return linha!;
}

/** Sai do topo tudo o que os testes fixaram: cada teste começa sem fixada, e os outros specs também. */
const desafixarTudo = () => consultar((sql) => sql`update noticia set fixada_ate = null where fixada_ate is not null returning conteudo_id`);
test.beforeAll(desafixarTudo);
test.afterAll(desafixarTudo);

const grade = (page: Page) => page.getByTestId("grade-noticias");
const destaque = (page: Page) => page.getByTestId("destaque");

test.describe("Notícias no site", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
  });

  test("CA-US02.1: escolher a categoria “Jurídico” mostra só as publicadas dessa categoria; busca e ordem pela tela", async ({ page }) => {
    const marca = `Filtro ${Date.now()}`;
    const juridico = `Plantão jurídico de horas extras (${marca})`;
    const geral = `Feriado de dezembro (${marca})`;
    await entrarComo(page, pessoas.com, "/painel");
    await publicarNoticiaPelaTela(page, juridico, { categoria: "Jurídico" });
    await publicarNoticiaPelaTela(page, geral, { categoria: "Geral" });

    await page.goto("/noticias");
    await expect(page.getByRole("heading", { level: 1, name: "Notícias do SINTRAVC" })).toBeVisible();
    await page.getByRole("navigation", { name: "Assuntos" }).getByRole("link", { name: /^Jurídico/ }).click();
    await expect(page).toHaveURL(/\/noticias\?categoria=juridico$/);
    await expect(page.getByRole("navigation", { name: "Assuntos" }).getByRole("link", { name: /^Jurídico/ })).toHaveAttribute("aria-current", "page");
    await expect(grade(page)).toContainText(juridico);
    await expect(grade(page)).not.toContainText(geral);
    for (const selo of await grade(page).getByText(/^(Geral|Benefícios|Esportes|Rádio Chofer)$/).all()) {
      await expect(selo).toBeHidden();
    }

    // Busca com Enter, dentro da categoria escolhida; o resultado é anunciado.
    const busca = page.getByRole("searchbox", { name: "Buscar notícias" });
    await busca.fill(marca);
    await busca.press("Enter");
    await expect(page).toHaveURL(/categoria=juridico&busca=/);
    await expect(page.getByRole("status").filter({ hasText: "1 notícia encontrada em Jurídico" })).toBeVisible();

    // Todas as categorias, com a busca: as duas; “Mais antigas” inverte a ordem.
    await page.getByRole("navigation", { name: "Assuntos" }).getByRole("link", { name: /^Todas/ }).click();
    await expect(grade(page).getByRole("heading")).toHaveText([geral, juridico]);
    await page.getByLabel("Ordenar").selectOption("antigas");
    await expect(page).toHaveURL(/ordem=antigas/);
    await expect(grade(page).getByRole("heading")).toHaveText([juridico, geral]);
  });

  test("notícia aberta: migalhas, compartilhar, copiar link, Mais notícias; o contador soma sem cookie (E30)", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const manchete = `Assembleia de dezembro (${Date.now()})`;
    await entrarComo(page, pessoas.com, "/painel");
    await publicarNoticiaPelaTela(page, manchete, { linhaFina: "Reajuste e plano de saúde em pauta." });
    const { id, slug } = await noticiaPelaManchete(manchete);

    // O visitante, sem sessão do painel.
    const visitante = await context.browser()!.newContext({ baseURL });
    await visitante.addCookies([{ name: "sintravc_cookies", value: "essenciais", url: baseURL! }]);
    await visitante.grantPermissions(["clipboard-read", "clipboard-write"]);
    const leitor = await visitante.newPage();
    const cookiesDoContador: string[] = [];
    leitor.on("response", (r) => {
      if (r.url().includes("/api/noticias/visualizacao")) cookiesDoContador.push(r.headers()["set-cookie"] ?? "");
    });

    await leitor.goto("/noticias");
    // A mais nova é o Destaque (sem fixada): abre por onde ela estiver na página.
    await leitor.getByRole("main").getByRole("link", { name: manchete }).first().click();
    await expect(leitor).toHaveURL(`/noticias/${slug}`);
    await expect(leitor.getByRole("heading", { level: 1, name: manchete })).toBeVisible();
    await expect(leitor.getByRole("navigation", { name: "Você está em" }).getByRole("link", { name: "Jurídico" })).toHaveAttribute(
      "href",
      "/noticias?categoria=juridico",
    );
    const whatsapp = leitor.getByRole("link", { name: "Compartilhar no WhatsApp" }).first();
    await expect(whatsapp).toHaveAttribute("href", new RegExp(`^https://wa\\.me/\\?text=.*noticias%2F${slug}`));
    await expect(leitor.getByRole("link", { name: "Compartilhar no Facebook" }).first()).toHaveAttribute("href", /facebook\.com\/sharer/);

    // Copiar link pelo teclado.
    await leitor.getByRole("button", { name: "Copiar link" }).first().focus();
    await leitor.keyboard.press("Enter");
    await expect(leitor.getByText("Link copiado.", { exact: true })).toBeVisible();
    expect(await leitor.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/noticias/${slug}$`));

    await expect(leitor.getByRole("heading", { name: "Mais notícias" })).toBeVisible();
    await expect(leitor.getByRole("complementary", { name: "Mais do site" }).getByRole("heading", { name: "Mais lidas da semana" })).toBeVisible();

    // O contador anônimo somou 1 hoje, e a resposta não grava cookie (E30).
    await expect
      .poll(async () => (await consultar((sql) => sql<{ total: number }[]>`select total from visualizacao_diaria where conteudo_id = ${id}`))[0]?.total ?? 0)
      .toBe(1);
    expect(cookiesDoContador.length).toBeGreaterThan(0);
    expect(cookiesDoContador.every((c) => c === "")).toBe(true);
    await visitante.close();
  });

  test("prévia do link: sem capa, a imagem padrão do SINTRAVC; com descrição da linha fina (P4, comentário da #15)", async ({ page, baseURL }) => {
    const manchete = `Sem capa (${Date.now()})`;
    await entrarComo(page, pessoas.com, "/painel");
    await publicarNoticiaPelaTela(page, manchete, { linhaFina: "Linha fina que vira a descrição." });
    const { slug } = await noticiaPelaManchete(manchete);

    await page.goto(`/noticias/${slug}`);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${baseURL}/site/compartilhar.png`);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", "Linha fina que vira a descrição.");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", manchete);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  });

  test("CA-US02.2: a oculta e o endereço que não existe dão 404, e a oculta some da lista", async ({ page }) => {
    const manchete = `Vai ser ocultada (${Date.now()})`;
    await entrarComo(page, pessoas.com, "/painel");
    await publicarNoticiaPelaTela(page, manchete);
    const { id, slug } = await noticiaPelaManchete(manchete);
    expect((await page.goto(`/noticias/${slug}`))?.status()).toBe(200);

    // Ocultar pelo menu da lista, como a pessoa faria.
    await page.goto(`/painel/conteudos?busca=${encodeURIComponent(manchete)}`);
    await page.getByRole("button", { name: `Mais ações para “${manchete}”` }).click();
    await page.getByRole("menu").getByRole("menuitem", { name: "Ocultar do site" }).click();
    const modal = page.getByRole("alertdialog", { name: "Ocultar do site?" });
    await modal.getByLabel(/Motivo/).fill("Informação em revisão.");
    await modal.getByRole("button", { name: "Ocultar do site" }).click();
    await expect(page.getByText("Conteúdo oculto do site.")).toBeVisible();
    await expect.poll(async () => (await consultar((sql) => sql<{ estado: string }[]>`select estado from conteudo where id = ${id}`))[0]!.estado).toBe("oculto");

    expect((await page.goto(`/noticias/${slug}`))?.status()).toBe(404);
    await page.goto(`/noticias?busca=${encodeURIComponent(manchete)}`);
    await expect(page.getByRole("heading", { name: "Nenhuma notícia encontrada" })).toBeVisible();
    expect((await page.goto(`/noticias/nao-existe-${randomUUID().slice(0, 8)}`))?.status()).toBe(404);
  });

  test("CA-US21.6, CA-US21.7 e CA-US21.8: fixar pelo editor, trocar pela Edição rápida com aviso, e sem fixada o Destaque é a mais recente", async ({ page }) => {
    test.slow(); // três notícias publicadas pela tela
    const marca = Date.now();
    const primeira = `Fixada pelo editor (${marca})`;
    const segunda = `Fixada pela Edição rápida (${marca})`;
    const terceira = `Mais recente sem fixar (${marca})`;
    await entrarComo(page, pessoas.com, "/painel");

    // CA-US21.6: marca “Fixar no topo de Notícias” e publica; vai para o Destaque.
    await publicarNoticiaPelaTela(page, primeira, { fixar: true });
    await publicarNoticiaPelaTela(page, segunda);
    await page.goto("/noticias");
    await expect(destaque(page)).toContainText(primeira);
    await expect(destaque(page)).toContainText("Destaque");
    // A fixada não se repete na grade.
    await expect(grade(page)).not.toContainText(primeira);

    // CA-US21.7: fixar outra pela Edição rápida avisa que a anterior sai e, ao confirmar, só a nova fica.
    await page.goto("/painel/conteudos");
    await acaoDaLinha(page.getByRole("row").filter({ hasText: segunda }), `Edição rápida de “${segunda}”`);
    const painel = page.getByRole("dialog", { name: "Edição rápida" });
    await painel.getByRole("checkbox", { name: "Fixar no topo de Notícias" }).click();
    const aviso = page.getByRole("alertdialog", { name: "Fixar esta notícia?" });
    await expect(aviso).toContainText(`“${primeira}” está fixada até`);
    await aviso.getByRole("button", { name: "Fixar esta notícia" }).click();
    await expect(page.getByText(/^Notícia fixada no topo até \d{2}\/\d{2}\/\d{4}\.$/)).toBeVisible();
    expect((await noticiaPelaManchete(primeira)).fixada_ate).toBeNull();
    expect((await noticiaPelaManchete(segunda)).fixada_ate).not.toBeNull();
    await page.goto("/noticias");
    await expect(destaque(page)).toContainText(segunda);

    // CA-US21.8: a data passou (preparado no banco: a tela levaria dias). O site segue o relógio.
    await publicarNoticiaPelaTela(page, terceira);
    await consultar((sql) => sql`update noticia set fixada_ate = now() - interval '1 minute' where fixada_ate is not null returning conteudo_id`);
    await page.goto("/noticias");
    await expect(destaque(page)).toContainText(terceira);
  });
});

/** Garante notícias no ar suficientes para a lista ter mais de uma página (o volume viria de dias de uso). */
async function garantirVolume(minimo: number) {
  const [linha] = await consultar((sql) => sql<{ total: number }[]>`
    select count(*)::int as total from conteudo where tipo = 'noticia' and estado = 'publicado' and slug is not null`);
  const faltam = minimo - (linha?.total ?? 0);
  if (faltam <= 0) return;
  const [geral] = await consultar((sql) => sql<{ id: string }[]>`select id from categoria where nome = 'Geral'`);
  const categoriaId = geral!.id;
  const autor = pessoas.com.id;
  for (let i = 0; i < faltam; i++) {
    const titulo = `Notícia para paginar ${i + 1} (${Date.now()})`;
    const dados = {
      titulo,
      linhaFina: "",
      lide: "Texto para ver a paginação.",
      corpo: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Corpo." }] }] },
      capaMidiaId: null,
      capaAlt: "",
      capaLegenda: "",
      assinatura: "Redação SINTRAVC",
      local: "",
      categoriaId,
      palavrasChave: [],
      links: [],
    };
    await consultar(
      (sql) => sql`
      with nova as (
        insert into conteudo (tipo, slug, titulo, estado, publicado_em, ja_publicado, autor_id, categoria_id, versao, revisao, revisao_publicada, atualizado_por)
        values ('noticia', ${`paginar-${randomUUID().slice(0, 8)}`}, ${titulo}, 'publicado', now() - ${`${i + 1} hours`}::interval, true, ${autor}, ${categoriaId}, 1, 1, 1, ${autor})
        returning id
      ), n as (
        insert into noticia (conteudo_id, lide, assinatura) select id, ${dados.lide}, ${dados.assinatura} from nova returning conteudo_id
      )
      insert into conteudo_versao (conteudo_id, versao, snapshot, criado_por)
      select id, 1, ${sql.json({ formato: 1, dados })}, ${autor} from nova returning id`,
    );
  }
}

test.describe("Notícias no celular e no tablet", { tag: "@responsivo" }, () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
  });

  test("lista sem rolagem lateral, assuntos que rolam para o lado e, no celular, “Carregar mais” que leva o foco", async ({ page, hasTouch }) => {
    await garantirVolume(14);
    await page.goto("/noticias");
    await semRolagemLateral(page);
    await expect(grade(page).getByRole("article")).toHaveCount(6);

    const estreita = page.viewportSize()!.width < RESPONSIVO.menuLateralAPartirDe;
    if (estreita) {
      await expect(page.getByRole("navigation", { name: "Paginação" })).toBeHidden();
      await apertar(page.getByRole("button", { name: "Carregar mais notícias" }), hasTouch);
      await expect(page.getByRole("status").filter({ hasText: /Mais \d+ notícias? carregadas?\./ })).toBeAttached();
      await expect(page.locator("main article")).not.toHaveCount(6);
      // O foco vai para a primeira notícia nova.
      await expect(page.locator(":focus")).toHaveAttribute("href", /^\/noticias\/.+/);
    } else {
      await expect(page.getByRole("navigation", { name: "Paginação" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Carregar mais notícias" })).toBeHidden();
    }
    if (hasTouch) expect(await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "main" })).toEqual([]);
    await semRolagemLateral(page);
  });

  test("notícia aberta sem rolagem lateral, com compartilhar e Mais lidas", async ({ page }) => {
    await garantirVolume(4);
    await page.goto("/noticias");
    await page.getByTestId("destaque").getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar link" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mais lidas da semana" })).toBeVisible();
    await semRolagemLateral(page);
  });
});
