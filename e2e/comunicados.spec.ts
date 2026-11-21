import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";
import postgres from "postgres";

import { ambienteE2E, RESPONSIVO } from "../playwright.config";
import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { bahiaEmCampos } from "../src/lib/datas";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import { publicarNoticiaPelaTela } from "./noticias";
import { entrarComo, semRolagemLateral, telaEstreita } from "./responsivo";

// Comunicados (US24, CA-US01.1, CA-US01.2, CA-US24.1, CA-US24.2) pela tela, como uma pessoa faria:
// o painel cria, agenda, publica, encerra e duplica, e o site mostra a faixa. O banco só é lido para
// conferir o resultado e, antes de cada teste, para tirar do ar o que outro teste deixou.

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm" | "com" | "atd", PessoaDeTeste>;

async function consultar<T extends object>(consulta: (sql: postgres.Sql) => Promise<T[]>) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await consulta(sql);
  } finally {
    await sql.end();
  }
}

async function comunicadoPeloTitulo(titulo: string) {
  const [linha] = await consultar((sql) => sql<{ id: string; estado: string; link_url: string | null; texto: string }[]>`
    select id, estado, link_url, texto from comunicado where titulo = ${titulo} order by id desc limit 1`);
  return linha!;
}

async function acoesNaAtividade(id: string) {
  const linhas = await consultar((sql) => sql<{ acao: string }[]>`select acao from atividade where alvo_id = ${id} order by id`);
  return linhas.map((l) => l.acao);
}

/** "AAAA-MM-DDTHH:MM" (campo datetime-local), daqui a `minutos`, no horário da Bahia. */
function campoDaqui(minutos: number) {
  const { data, hora } = bahiaEmCampos(new Date(Date.now() + minutos * 60_000));
  return `${data}T${hora}`;
}

const DIA = 24 * 60;
const faixa = (page: Page) => page.getByTestId("faixa-comunicado");
const formulario = (page: Page) => page.getByRole("dialog");

/** Tira do ar, pelo banco, o que um teste deixou: cada teste começa sem faixa, e os outros specs também. */
const tirarTudoDoAr = () =>
  consultar((sql) => sql`
    update comunicado set estado = 'encerrado', encerrado_em = now(), ja_publicado = true
    where estado in ('agendado', 'publicado') returning id`);

test.beforeEach(tirarTudoDoAr);
test.afterAll(tirarTudoDoAr);

/** Preenche o formulário aberto (modal ou folha) e aperta o botão principal ou o de rascunho. */
async function preencher(
  page: Page,
  dados: { titulo: string; texto?: string; link?: string; inicio?: string; fim?: string },
  botao: RegExp,
  { toque = false } = {},
) {
  const f = formulario(page);
  await f.getByLabel("Título *").fill(dados.titulo);
  await f.getByLabel("Texto do comunicado *").fill(dados.texto ?? `Mais detalhes: ${dados.titulo}`);
  if (dados.link) {
    await f.getByRole("combobox", { name: /Saiba mais/ }).fill(dados.link);
    await apertar(f.getByRole("option", { name: new RegExp(`Usar o endereço`) }), toque);
  }
  if (dados.inicio) await f.getByLabel("Começa em *").fill(dados.inicio);
  if (dados.fim) await f.getByLabel("Termina em *").fill(dados.fim);
  await apertar(f.getByRole("button", { name: botao }), toque);
}

test("CA-US24.1 · agendar pelo modal: fica em Agendados, fora do site, com as viradas marcadas", async ({ page }) => {
  const titulo = `Recesso de fim de ano: a sede fecha (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await expect(formulario(page).getByRole("heading", { name: "Novo comunicado" })).toBeVisible();
  // Contador de caracteres e prévia acompanham o que se digita.
  const texto = "A sede fecha de 24/12 a 01/01.\nO atendimento volta no dia 02/01, às 8h.";
  await formulario(page).getByLabel("Título *").fill(titulo);
  await expect(formulario(page).getByText(`${titulo.length}/140`)).toBeVisible();
  await formulario(page).getByLabel("Texto do comunicado *").fill(texto);
  await expect(formulario(page).getByText(`${texto.length}/1000`)).toBeVisible();
  // A prévia mostra a faixa (só o título) e o comunicado aberto (título e texto).
  await expect(formulario(page).getByTestId("faixa-comunicado")).toContainText(titulo);
  await expect(formulario(page).getByTestId("faixa-comunicado")).not.toContainText("A sede fecha");
  await expect(formulario(page).getByTestId("previa-aberta")).toContainText(titulo);
  await expect(formulario(page).getByTestId("previa-aberta")).toContainText("O atendimento volta no dia 02/01");

  await preencher(page, { titulo, texto, inicio: campoDaqui(2 * DIA), fim: campoDaqui(4 * DIA) }, /^Agendar comunicado$/);

  await expect(page.getByText("Comunicado agendado")).toBeVisible();
  await expect(formulario(page)).toBeHidden();
  const salvo = await comunicadoPeloTitulo(titulo);
  expect(salvo.estado).toBe("agendado");
  expect(salvo.texto).toBe(texto);
  expect(await acoesNaAtividade(salvo.id)).toEqual(["comunicado.criar", "comunicado.agendar"]);

  await page.getByRole("link", { name: /^Agendados/ }).click();
  await expect(page.getByTestId("linha-comunicado").filter({ hasText: titulo })).toContainText("Agendado");

  await page.goto("/contato");
  await expect(faixa(page)).toBeHidden();
});

test("CA-US01.1 · publicar agora: a faixa aparece em qualquer página do site, com “Saiba mais”", async ({ page }) => {
  const titulo = `Feriado: a sede atende das 8h às 12h (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { titulo, link: "/sindicato/instituicao", inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(page.getByText("Comunicado publicado: já está no site")).toBeVisible();

  // No painel, “No site agora” mostra a mesma faixa.
  await expect(page.getByRole("region", { name: "No site agora" }).getByTestId("faixa-comunicado")).toContainText(titulo);

  for (const caminho of ["/", "/contato"]) {
    await page.goto(caminho);
    await expect(faixa(page)).toContainText(titulo);
  }
  await faixa(page).getByRole("link", { name: /Saiba mais/ }).click();
  await expect(page).toHaveURL(/\/sindicato\/instituicao$/);
  expect((await comunicadoPeloTitulo(titulo)).estado).toBe("publicado");
});

test("CA-US01.2 · dois no ar: “1 de 2”, setas e teclado, troca sozinha e para com o mouse em cima", async ({ page }) => {
  const primeiro = `Primeiro aviso da fila (${Date.now()}).`;
  const segundo = `Segundo aviso da fila (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  for (const titulo of [primeiro, segundo]) {
    await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
    await preencher(page, { titulo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
    await expect(formulario(page)).toBeHidden();
  }

  await page.clock.install();
  await page.goto("/contato");
  const visivel = faixa(page).locator("[aria-hidden=false]");
  await expect(faixa(page).getByText("Comunicado 1 de 2")).toBeVisible();
  await expect(visivel).toContainText(primeiro);

  // Troca sozinha depois do tempo do parâmetro (8 s).
  await page.clock.runFor(8_500);
  await expect(visivel).toContainText(segundo);

  // Pelo teclado: Tab até a seta e Enter.
  await faixa(page).getByRole("button", { name: "Próximo comunicado" }).focus();
  await page.keyboard.press("Enter");
  await expect(visivel).toContainText(primeiro);
  await expect(faixa(page).getByText("Comunicado 1 de 2")).toBeVisible();

  // Depois que a pessoa usou as setas, não troca mais sozinha.
  await page.mouse.move(0, 0);
  await page.clock.runFor(20_000);
  await expect(visivel).toContainText(primeiro);
});

/** Publica pela tela, um depois do outro (a fila segue essa ordem). */
async function publicarNoAr(page: Page, comunicados: (string | { titulo: string; texto?: string; link?: string })[], { toque = false } = {}) {
  await entrarComo(page, pessoas.com, "/painel/comunicados", { toque });
  // Na folha de baixo (tela estreita), o botão é só “Publicar”.
  const publicar = telaEstreita(page) ? /^Publicar$/ : /^Publicar agora$/;
  for (const c of comunicados) {
    const dados = typeof c === "string" ? { titulo: c } : c;
    await apertar(page.getByRole("button", { name: "Novo comunicado", exact: true }), toque);
    await preencher(page, { ...dados, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, publicar, { toque });
    await expect(formulario(page)).toBeHidden();
  }
}

const janela = (page: Page) => page.getByTestId("janela-comunicados");
/** O botão do título que está à vista na faixa (abre a janela em destaque). */
const tituloNaFaixa = (page: Page) => faixa(page).locator("[aria-hidden=false]").getByRole("button", { name: /ver em destaque/ });

test("o clique no título da faixa abre a janela: passa pelas setas, para a troca e fecha pelo X, Esc, fora e voltar, sem sobrar histórico", async ({ page }) => {
  const primeiro = `Aviso em destaque (${Date.now()}).`;
  const segundo = `Outro aviso em destaque (${Date.now()}).`;
  await publicarNoAr(page, [primeiro, segundo]);

  await page.clock.install();
  await page.goto("/");
  await page.goto("/contato");
  const visivel = faixa(page).locator("[aria-hidden=false]");

  // Abre em destaque, no comunicado que a faixa mostra.
  await tituloNaFaixa(page).click();
  await expect(janela(page)).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Comunicado" })).toContainText(primeiro);
  await expect(janela(page).getByTestId("texto-do-comunicado")).toHaveText(`Mais detalhes: ${primeiro}`);
  await expect(faixa(page)).not.toContainText("Mais detalhes:");
  await expect(janela(page).getByText("Comunicado 1 de 2")).toBeVisible();

  // Com a janela aberta, a faixa não troca sozinha.
  await page.mouse.move(5, 5);
  await page.clock.runFor(20_000);
  await expect(janela(page)).toContainText(primeiro);

  // Setas da janela e do teclado.
  await janela(page).getByRole("button", { name: "Próximo comunicado" }).click();
  await expect(janela(page)).toContainText(segundo);
  await expect(janela(page).getByText("Comunicado 2 de 2")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(janela(page)).toContainText(primeiro);
  await page.keyboard.press("ArrowRight");
  await expect(janela(page)).toContainText(segundo);

  // 1) X: fecha, a faixa fica no comunicado que estava na janela e o foco volta para o título.
  await janela(page).getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(janela(page)).toBeHidden();
  await expect(visivel).toContainText(segundo);
  await expect(tituloNaFaixa(page)).toBeFocused();

  // 2) Esc.
  await tituloNaFaixa(page).click();
  await expect(janela(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(janela(page)).toBeHidden();
  await expect(tituloNaFaixa(page)).toBeFocused();

  // 3) Tocar fora, no fundo escuro.
  await tituloNaFaixa(page).click();
  await expect(janela(page)).toBeVisible();
  const tela = page.viewportSize()!;
  await page.mouse.click(8, tela.height - 8);
  await expect(janela(page)).toBeHidden();
  await expect(tituloNaFaixa(page)).toBeFocused();

  // 4) Voltar do celular (do navegador): fecha sem sair da página.
  await tituloNaFaixa(page).click();
  await expect(janela(page)).toBeVisible();
  await page.goBack();
  await expect(janela(page)).toBeHidden();
  await expect(page).toHaveURL(/\/contato$/);
  await expect(tituloNaFaixa(page)).toBeFocused();

  // Nenhuma das quatro deixou entrada no histórico: um voltar sai de /contato para a página de antes.
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("depois de fechar a janela com o mouse, a faixa volta a trocar sozinha com o mouse fora (o foco devolvido não para a faixa)", async ({ page }) => {
  const primeiro = `Aviso visto na janela (${Date.now()}).`;
  const segundo = `Aviso que vem depois (${Date.now()}).`;
  await publicarNoAr(page, [primeiro, segundo]);

  await page.clock.install();
  await page.goto("/contato");
  const visivel = faixa(page).locator("[aria-hidden=false]");
  await tituloNaFaixa(page).click();
  await expect(janela(page)).toBeVisible();
  await page.mouse.click(8, page.viewportSize()!.height - 8);
  await expect(janela(page)).toBeHidden();

  // O foco voltou para o título, sem o anel (veio do mouse): com o mouse fora, a troca continua.
  await page.mouse.move(5, 600);
  await page.clock.runFor(8_500);
  await expect(visivel).toContainText(segundo);
  await expect(faixa(page).getByText("Comunicado 2 de 2")).toBeVisible();
});

/** Os comunicados da página /comunicados, na ordem em que aparecem. */
const naPagina = (page: Page) => page.getByRole("main").getByRole("list", { name: /ordem da fila/ }).getByRole("article");
const colunaDeNoticias = (page: Page) => page.getByRole("complementary", { name: "Notícias recentes" });

test("“Ver todos” leva à página Comunicados: cartões na ordem da fila, com título, “No ar até…” e o texto inteiro", async ({ page }) => {
  const marca = Date.now();
  const titulos = [`Página A (${marca})`, `Página B (${marca})`, `Página C (${marca})`];
  await publicarNoAr(page, [{ titulo: titulos[0]!, texto: "Primeira linha do aviso A.\nSegunda linha do aviso A." }, titulos[1]!, titulos[2]!]);

  await page.goto("/contato");
  await faixa(page).getByRole("link", { name: "Ver todos os comunicados" }).click();
  await expect(page).toHaveURL(/\/comunicados$/);
  await expect(page.getByRole("heading", { level: 1, name: "Comunicados" })).toBeVisible();
  await expect(naPagina(page).getByRole("heading")).toHaveText(titulos.map((t) => `${t} (ver em destaque)`));
  for (const cartao of await naPagina(page).all()) {
    await expect(cartao).toContainText(/No ar até \d{2}\/\d{2}\/\d{4} às \d{2}h\d{2}/);
  }
  // O texto aparece inteiro, com a quebra de linha.
  await expect(naPagina(page).nth(0)).toContainText("Primeira linha do aviso A.");
  await expect(naPagina(page).nth(0)).toContainText("Segunda linha do aviso A.");
  // Na própria página, a faixa continua (só com o título), mas sem o “Ver todos” para onde a pessoa já está.
  await expect(faixa(page)).toBeVisible();
  await expect(faixa(page)).not.toContainText("Primeira linha do aviso A.");
  await expect(faixa(page).getByRole("link", { name: /Ver todos/ })).toHaveCount(0);

  // Com um só no ar, a faixa não tem “Ver todos”.
  await tirarTudoDoAr();
  await publicarNoAr(page, [`Sozinho (${Date.now()})`]);
  await page.goto("/contato");
  await expect(faixa(page)).toBeVisible();
  await expect(faixa(page).getByRole("link", { name: /Ver todos/ })).toHaveCount(0);
});

test("clicar num cartão da página abre a janela nele: título e texto, setas, e o foco volta ao cartão", async ({ page }) => {
  const marca = Date.now();
  const a = { titulo: `Cartão A (${marca})`, texto: "Texto completo do cartão A." };
  const b = { titulo: `Cartão B (${marca})`, texto: "Texto completo do cartão B.\nCom uma segunda linha." };
  await publicarNoAr(page, [a, b]);

  await page.context().addCookies([{ name: "sintravc_cookies", value: "essenciais", url: page.url() }]);
  await page.goto("/comunicados");
  // O clique em qualquer lugar do cartão (aqui, no meio dele) abre a janela no comunicado dele.
  await naPagina(page).nth(1).click();
  await expect(janela(page)).toBeVisible();
  await expect(janela(page)).toContainText(b.titulo);
  await expect(janela(page).getByTestId("texto-do-comunicado")).toHaveText(b.texto);
  await expect(janela(page).getByText("Comunicado 2 de 2")).toBeVisible();

  await janela(page).getByRole("button", { name: "Próximo comunicado" }).click();
  await expect(janela(page).getByTestId("texto-do-comunicado")).toHaveText(a.texto);
  await page.keyboard.press("Escape");
  await expect(janela(page)).toBeHidden();
  await expect(naPagina(page).nth(0).getByRole("button", { name: /ver em destaque/ })).toBeFocused();

  // Fecha também pelo voltar do navegador, sem sair da página e sem sobrar entrada no histórico.
  await page.keyboard.press("Enter");
  await expect(janela(page)).toBeVisible();
  await page.goBack();
  await expect(janela(page)).toBeHidden();
  await expect(page).toHaveURL(/\/comunicados$/);

  // O “Saiba mais” do cartão continua sendo um link à parte, sem abrir a janela.
  await tirarTudoDoAr();
  await publicarNoAr(page, [{ titulo: `Com link (${marca})`, link: "/contato" }]);
  await page.goto("/comunicados");
  await naPagina(page).getByRole("link", { name: /Saiba mais/ }).click();
  await expect(page).toHaveURL(/\/contato$/);
});

test("sem comunicado no ar, a página mostra o vazio, com título e descrição; a coluna de notícias continua", async ({ page }) => {
  const manchete = `Notícia para a coluna (${Date.now()})`;
  await entrarComo(page, pessoas.com, "/painel");
  await publicarNoticiaPelaTela(page, manchete);

  await page.goto("/comunicados");
  await expect(page).toHaveTitle(/^Comunicados/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /avisos do SINTRAVC/);
  await expect(faixa(page)).toBeHidden();
  await expect(page.getByRole("heading", { name: "Nenhum comunicado no momento" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
  await expect(naPagina(page)).toHaveCount(0);

  // A notícia recém-publicada é a primeira da coluna, com a data e o link para a notícia aberta.
  const primeira = colunaDeNoticias(page).getByRole("link").first();
  await expect(primeira).toContainText(manchete);
  await expect(primeira).toContainText(/\d{2}\/\d{2}\/\d{4}/);
  await expect(primeira).toHaveAttribute("href", /^\/noticias\/.+/);
  expect(await colunaDeNoticias(page).getByRole("link").count()).toBeLessThanOrEqual(4);
});

test("sem notícia publicada, a coluna “Notícias recentes” não aparece", async ({ page }) => {
  await publicarNoAr(page, [`Aviso sem notícias (${Date.now()})`]);
  // Tira do site, pelo banco, as notícias que outros testes publicaram, e põe de volta no fim.
  const ocultas = await consultar((sql) => sql<{ id: string }[]>`
    update conteudo set estado = 'oculto', motivo_oculto = 'e2e', ocultado_em = now()
    where tipo = 'noticia' and estado = 'publicado' returning id`);
  try {
    await page.goto("/comunicados");
    await expect(naPagina(page)).toHaveCount(1);
    await expect(colunaDeNoticias(page)).toHaveCount(0);
  } finally {
    const ids = ocultas.map((o) => o.id);
    if (ids.length > 0) {
      await consultar((sql) => sql`
        update conteudo set estado = 'publicado', motivo_oculto = null, ocultado_em = null where id in ${sql(ids)} returning id`);
    }
  }
});

test("com menos movimento pedido pelo sistema, a faixa troca sozinha sem a transição, e não há botão Pausar", async ({ page }) => {
  const primeiro = `Aviso A (${Date.now()})`;
  const segundo = `Aviso B (${Date.now()})`;
  await publicarNoAr(page, [primeiro, segundo]);

  const transicao = () =>
    faixa(page)
      .locator("[aria-hidden=false]")
      .evaluate((el) => getComputedStyle(el).transitionDuration);

  // Sem o pedido: esmaece ao trocar.
  await page.goto("/contato");
  expect(await transicao()).not.toMatch(/^0s(, 0s)*$/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/contato");
  await page.mouse.move(5, 600);
  const visivel = faixa(page).locator("[aria-hidden=false]");
  await expect(visivel).toContainText(primeiro);
  expect(await transicao()).toMatch(/^0s(, 0s)*$/);
  await expect(faixa(page).getByRole("button", { name: /Parar de trocar|Pausar/ })).toHaveCount(0);

  await page.clock.runFor(8_500);
  await expect(visivel).toContainText(segundo);
  await expect(faixa(page).getByText("Comunicado 2 de 2")).toBeVisible();
});

test("o X fecha a faixa (continua fechada nas outras páginas) e ela volta com um comunicado novo", async ({ page, context }) => {
  const antigo = `Aviso que vou fechar (${Date.now()}).`;
  const novo = `Aviso novo depois de fechar (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { titulo: antigo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(formulario(page)).toBeHidden();

  await page.goto("/contato");
  await faixa(page).getByRole("button", { name: "Fechar comunicado" }).click();
  await expect(faixa(page)).toBeHidden();
  await page.goto("/sindicato/diretoria");
  await expect(faixa(page)).toBeHidden();
  const cookie = (await context.cookies()).find((c) => c.name === "sintravc_comunicados_fechados");
  // Validade pelo parâmetro comunicados.cookie_fechados_dias (365 dias).
  const dias = (cookie!.expires * 1000 - Date.now()) / (24 * 60 * 60 * 1000);
  expect(dias).toBeGreaterThan(364);
  expect(dias).toBeLessThanOrEqual(365);

  await page.goto("/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { titulo: novo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(formulario(page)).toBeHidden();

  await page.goto("/contato");
  await expect(faixa(page)).toContainText(novo);
  await expect(faixa(page)).not.toContainText(antigo);
});

test("CA-US24.2 · Encerrar agora com confirmação: a faixa sai do site e vai para a Atividade; depois, Duplicar", async ({ page }) => {
  const titulo = `Assembleia geral hoje às 19h (${Date.now()}).`;
  await entrarComo(page, pessoas.adm, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { titulo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(formulario(page)).toBeHidden();

  const linha = page.getByTestId("linha-comunicado").filter({ hasText: titulo });
  await linha.getByRole("button", { name: /Ações do comunicado/ }).click();
  await page.getByRole("menuitem", { name: "Encerrar agora" }).click();
  const confirmacao = page.getByRole("alertdialog", { name: "Encerrar comunicado?" });
  // “Manter no ar” desiste sem mudar nada.
  await confirmacao.getByRole("button", { name: "Manter no ar" }).click();
  await expect(confirmacao).toBeHidden();
  expect((await comunicadoPeloTitulo(titulo)).estado).toBe("publicado");

  await linha.getByRole("button", { name: /Ações do comunicado/ }).click();
  await page.getByRole("menuitem", { name: "Encerrar agora" }).click();
  await confirmacao.getByRole("button", { name: "Encerrar agora" }).click();
  await expect(page.getByText("Comunicado encerrado: a faixa saiu do site")).toBeVisible();

  const encerrado = await comunicadoPeloTitulo(titulo);
  expect(encerrado.estado).toBe("encerrado");
  expect(await acoesNaAtividade(encerrado.id)).toEqual(["comunicado.criar", "comunicado.publicar", "comunicado.encerrar"]);
  await page.goto("/contato");
  await expect(faixa(page)).toBeHidden();

  // Encerrado pode ser duplicado: abre a cópia no formulário, como rascunho.
  await page.goto("/painel/comunicados?aba=encerrados");
  await page.getByTestId("linha-comunicado").filter({ hasText: titulo }).first().getByRole("button", { name: /Ações do comunicado/ }).click();
  await page.getByRole("menuitem", { name: "Duplicar" }).click();
  await expect(formulario(page).getByRole("heading", { name: "Editar rascunho" })).toBeVisible();
  await expect(formulario(page).getByLabel("Título *")).toHaveValue(titulo);
});

test("fila: a alça muda a ordem pelo teclado, e a faixa do site segue a ordem nova", async ({ page }) => {
  const a = `Fila A (${Date.now()})`;
  const b = `Fila B (${Date.now()})`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  for (const titulo of [a, b]) {
    await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
    await preencher(page, { titulo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
    await expect(formulario(page)).toBeHidden();
  }
  const linhas = page.getByTestId("linha-comunicado");
  await expect(linhas.nth(0)).toContainText(a);

  await linhas.nth(0).getByRole("button", { name: /Posição 1 de 2 na fila/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("status").filter({ hasText: "Agora na posição 2 de 2 na fila." })).toBeAttached();
  await expect(linhas.nth(0)).toContainText(b);

  await page.goto("/contato");
  await expect(faixa(page).locator("[aria-hidden=false]")).toContainText(b);
});

test("título vazio, texto vazio e fim antes do começo: o formulário mostra o erro no campo e não salva", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  // O título e o texto são conferidos na tela, com as mesmas regras do servidor, antes de mandar.
  let envios = 0;
  page.on("request", (pedido) => {
    if (pedido.method() === "POST" && pedido.headers()["next-action"]) envios += 1;
  });
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await formulario(page).getByRole("button", { name: /^Agendar comunicado$/ }).click();
  await expect(formulario(page).getByText("Escreva o título do comunicado.")).toBeVisible();
  await expect(formulario(page).getByLabel("Título *")).toBeFocused();

  await formulario(page).getByLabel("Título *").fill("Aviso sem texto");
  await formulario(page).getByLabel("Texto do comunicado *").fill("   \n  ");
  await formulario(page).getByRole("button", { name: /^Salvar rascunho$/ }).click();
  await expect(formulario(page).getByText("Escreva o texto do comunicado.")).toBeVisible();
  await expect(formulario(page).getByLabel("Texto do comunicado *")).toBeFocused();
  await expect(formulario(page).getByLabel("Texto do comunicado *")).toHaveAttribute("aria-invalid", "true");
  expect(envios, "nada foi mandado ao servidor").toBe(0);

  await preencher(page, { titulo: "Aviso com datas trocadas", inicio: campoDaqui(3 * DIA), fim: campoDaqui(2 * DIA) }, /^Agendar comunicado$/);
  await expect(formulario(page).getByText("O fim tem de ser depois do início.")).toBeVisible();
  await expect(formulario(page).getByLabel("Termina em *")).toHaveAttribute("aria-invalid", "true");
});

test("o Atendimento não abre Comunicados (403)", async ({ page }) => {
  await entrarComo(page, pessoas.atd, "/painel");
  const resposta = await page.goto("/painel/comunicados");
  expect(resposta?.status()).toBe(403);
});

test.describe("Comunicados no celular", { tag: "@responsivo" }, () => {
  test("novo comunicado na folha de baixo, cartões na lista e a faixa do site no celular", async ({ page, hasTouch }, testInfo) => {
    const titulo = `Aviso pelo celular (${testInfo.project.name}, ${Date.now()}).`;
    await entrarComo(page, pessoas.com, "/painel/comunicados", { toque: hasTouch });
    const estreita = telaEstreita(page);

    await apertar(page.getByRole("button", { name: "Novo comunicado", exact: true }), hasTouch);
    await expect(formulario(page).getByRole("heading", { name: "Novo comunicado" })).toBeVisible();
    await preencher(page, { titulo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, estreita ? /^Publicar$/ : /^Publicar agora$/, { toque: hasTouch });
    await expect(formulario(page)).toBeHidden();

    if (estreita) {
      await expect(page.getByTestId("cartao-comunicado").filter({ hasText: titulo })).toBeVisible();
      await expect(page.getByTestId("linha-comunicado").first()).toBeHidden();
    } else {
      await expect(page.getByTestId("linha-comunicado").filter({ hasText: titulo })).toBeVisible();
    }
    await semRolagemLateral(page);

    // Um segundo no ar, para a faixa ter setas e “Ver todos”.
    await apertar(page.getByRole("button", { name: "Novo comunicado", exact: true }), hasTouch);
    await preencher(page, { titulo: `Segundo ${titulo}`, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, estreita ? /^Publicar$/ : /^Publicar agora$/, { toque: hasTouch });
    await expect(formulario(page)).toBeHidden();

    await page.goto("/contato");
    await expect(faixa(page)).toContainText(titulo);
    await expect(faixa(page).getByText("Comunicado 1 de 2")).toBeVisible();
    await semRolagemLateral(page);
    if (hasTouch) {
      // Título, setas, “Ver todos”, X e “Saiba mais” com a área de toque mínima (E48).
      const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: '[data-testid="faixa-comunicado"]' });
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
    if (hasTouch) {
      // A janela do título também cabe no celular, sem rolagem lateral, com os alvos de toque.
      await apertar(tituloNaFaixa(page), true);
      await expect(janela(page)).toBeVisible();
      await semRolagemLateral(page);
      const naJanela = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: '[data-testid="janela-comunicados"]' });
      expect(naJanela.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
      await apertar(janela(page).getByRole("button", { name: "Fechar", exact: true }), true);
      await expect(janela(page)).toBeHidden();
    }
    const fechar = faixa(page).getByRole("button", { name: "Fechar comunicado" });
    await expect(fechar).toBeVisible();
    await apertar(fechar, hasTouch);
    await expect(faixa(page)).toBeHidden();
  });

  test("fechar pelo X e achar o comunicado de novo pela página Comunicados, no menu e no rodapé", async ({ page, hasTouch }) => {
    const comLink = `Aviso com link (${Date.now()})`;
    const semLink = `Aviso sem link (${Date.now()})`;
    await publicarNoAr(page, [{ titulo: comLink, link: "/contato" }, semLink], { toque: hasTouch });

    await page.goto("/");
    await apertar(faixa(page).getByRole("button", { name: "Fechar comunicado" }), hasTouch);
    await expect(faixa(page)).toBeHidden();

    // Pelo menu, como a pessoa faria: Notícias › Comunicados, no menu do celular nas telas estreitas e no
    // do cabeçalho nas largas.
    const menu = telaEstreita(page) ? page.getByRole("dialog", { name: "Menu" }) : page.getByRole("navigation", { name: "Principal" });
    if (telaEstreita(page)) await apertar(page.getByRole("button", { name: "Abrir menu" }), hasTouch);
    const noticias = menu.getByRole("button", { name: "Notícias" });
    await expect(noticias).toHaveAttribute("aria-expanded", "false");
    await apertar(noticias, hasTouch);
    await expect(noticias).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: "Notícias", exact: true })).toHaveAttribute("href", "/noticias");
    await apertar(menu.getByRole("link", { name: "Comunicados" }), hasTouch);
    await expect(page).toHaveURL(/\/comunicados$/);
    await expect(page.getByRole("heading", { level: 1, name: "Comunicados" })).toBeVisible();

    // O X só esconde a faixa: na página, os dois continuam, inteiros e na ordem da fila.
    await expect(faixa(page)).toBeHidden();
    await expect(naPagina(page)).toHaveCount(2);
    await expect(naPagina(page).nth(0)).toContainText(comLink);
    await expect(naPagina(page).nth(1)).toContainText(semLink);
    await expect(naPagina(page).nth(0).getByRole("link", { name: /Saiba mais/ })).toHaveAttribute("href", "/contato");
    await expect(naPagina(page).nth(1).getByRole("link", { name: /Saiba mais/ })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Rodapé" }).getByRole("link", { name: "Comunicados" })).toHaveAttribute("href", "/comunicados");

    await semRolagemLateral(page);
    if (hasTouch) {
      const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "main" });
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
  });

  test("página Comunicados: a coluna “Notícias recentes” fica ao lado no computador e embaixo no celular e no tablet em pé", async ({ page, browser, hasTouch }) => {
    // A notícia é publicada numa janela de computador à parte: o que se confere aqui é a página do site.
    const manchete = `Notícia ao lado dos comunicados (${Date.now()})`;
    // O Playwright aplica o perfil do projeto também aqui: tamanho e toque de computador explícitos.
    const computador = await browser.newPage({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });
    await entrarComo(computador, pessoas.com, "/painel");
    await publicarNoticiaPelaTela(computador, manchete);
    await computador.close();

    await publicarNoAr(page, [`Aviso com coluna A (${Date.now()})`, `Aviso com coluna B (${Date.now()})`], { toque: hasTouch });
    await page.goto("/comunicados");
    const coluna = colunaDeNoticias(page);
    await expect(coluna.getByRole("link").first()).toContainText(manchete);
    const lista = (await page.getByRole("main").getByRole("list", { name: /ordem da fila/ }).boundingBox())!;
    const lado = (await coluna.boundingBox())!;
    if (telaEstreita(page)) {
      expect(lado.y, "a coluna vem depois dos comunicados").toBeGreaterThanOrEqual(lista.y + lista.height);
    } else {
      expect(lado.x, "a coluna fica à direita dos comunicados").toBeGreaterThanOrEqual(lista.x + lista.width);
    }
    await semRolagemLateral(page);
    if (hasTouch) {
      // Tocar no cartão abre a janela; ela cabe sem rolagem lateral e com os alvos de toque.
      await apertar(naPagina(page).nth(1).getByRole("button", { name: /ver em destaque/ }), true);
      await expect(janela(page)).toBeVisible();
      await expect(janela(page).getByText("Comunicado 2 de 2")).toBeVisible();
      await semRolagemLateral(page);
      const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "main" });
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
  });

  test("deslizar o dedo de lado na faixa e na janela passa os comunicados; na vertical, rola a página", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "Deslize é só no toque.");
    const primeiro = `Deslize A (${Date.now()})`;
    const segundo = `Deslize B (${Date.now()})`;
    await publicarNoAr(page, [primeiro, segundo], { toque: true });
    await page.clock.install();
    await page.goto("/contato");
    const visivel = faixa(page).locator("[aria-hidden=false]");
    await expect(visivel).toContainText(primeiro);

    // Toques de verdade pelo CDP: o navegador decide entre rolar a página e mandar o movimento à faixa.
    const cdp = await page.context().newCDPSession(page);
    async function deslizar(de: { x: number; y: number }, ate: { x: number; y: number }) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [de] });
      for (let i = 1; i <= 8; i++) {
        const x = de.x + ((ate.x - de.x) * i) / 8;
        const y = de.y + ((ate.y - de.y) * i) / 8;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
      }
      // O dedo para um instante antes de soltar, como uma pessoa faz.
      await page.waitForTimeout(150);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [ate] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    // Toque pelo CDP, como o deslize.
    async function tocar(alvo: Locator) {
      const c = (await alvo.boundingBox())!;
      const ponto = { x: c.x + c.width / 2, y: c.y + c.height / 2 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [ponto] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    const caixa = (await tituloNaFaixa(page).boundingBox())!;
    const meio = { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };

    await deslizar(meio, { x: meio.x - 150, y: meio.y });
    await expect(visivel).toContainText(segundo);
    await expect(faixa(page).getByText("Comunicado 2 de 2")).toBeVisible();
    await expect(janela(page)).toBeHidden();

    await deslizar(meio, { x: meio.x + 150, y: meio.y });
    await expect(visivel).toContainText(primeiro);

    // Na janela, o mesmo. Uma pessoa não toca no mesmo instante em que soltou o deslize.
    await page.waitForTimeout(400);
    await tocar(tituloNaFaixa(page));
    await expect(janela(page)).toBeVisible();
    const cartao = (await janela(page).getByRole("article").boundingBox())!;
    const centro = { x: cartao.x + cartao.width / 2, y: cartao.y + cartao.height / 2 };
    await deslizar(centro, { x: centro.x - 150, y: centro.y });
    await expect(janela(page)).toContainText(segundo);
    await expect(janela(page)).toBeVisible();
    await page.waitForTimeout(400);
    await tocar(janela(page).getByRole("button", { name: "Fechar", exact: true }));
    await expect(janela(page)).toBeHidden();

    // Dedo na vertical sobre a faixa: a página rola e o comunicado não muda.
    await deslizar(meio, { x: meio.x + 10, y: meio.y - 220 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(visivel).toContainText(segundo);
  });
});

test("calendário de Conteúdos (E17): barra marinho do período, sem arrastar; o clique abre o comunicado e a legenda esconde", async ({ page }) => {
  const titulo = `Comunicado no calendário (${Date.now()}).`;
  const inicio = campoDaqui(2 * DIA);
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { titulo, inicio, fim: campoDaqui(4 * DIA) }, /^Agendar comunicado$/);
  await expect(formulario(page)).toBeHidden();

  await page.goto(`/painel/conteudos?visao=calendario&mes=${inicio.slice(0, 7)}`);
  const barra = page.getByTestId("barra-comunicado").filter({ hasText: titulo }).first();
  await expect(barra).toBeVisible();
  await expect(barra).toHaveAttribute("draggable", "false");
  await expect(page.locator(`[data-dia="${inicio.slice(0, 10)}"]`).getByTestId("barra-comunicado").filter({ hasText: titulo })).toHaveCount(1);

  const legenda = page.getByRole("button", { name: /^Comunicados/ });
  await legenda.click();
  await expect(legenda).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("barra-comunicado")).toHaveCount(0);
  await legenda.click();

  await barra.click();
  await expect(page).toHaveURL(/\/painel\/comunicados/);
  await expect(formulario(page).getByRole("heading", { name: "Editar comunicado" })).toBeVisible();
  await expect(formulario(page).getByLabel("Título *")).toHaveValue(titulo);
});

test("calendário de Conteúdos: o clique num encerrado abre a aba Encerrados com ele na vista e destacado (E58)", async ({ page }) => {
  const titulo = `Encerrado visto no calendário (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { titulo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(formulario(page)).toBeHidden();
  await page.getByTestId("linha-comunicado").filter({ hasText: titulo }).getByRole("button", { name: /Ações do comunicado/ }).click();
  await page.getByRole("menuitem", { name: "Encerrar agora" }).click();
  await page.getByRole("alertdialog", { name: "Encerrar comunicado?" }).getByRole("button", { name: "Encerrar agora" }).click();
  await expect(page.getByText("Comunicado encerrado: a faixa saiu do site")).toBeVisible();

  await page.goto("/painel/conteudos?visao=calendario");
  await page.getByTestId("barra-comunicado").filter({ hasText: titulo }).first().click();

  await expect(page).toHaveURL(/aba=encerrados&ver=/);
  await expect(page.getByRole("link", { name: /Encerrados/ })).toHaveAttribute("aria-current", "page");
  const linha = page.getByTestId("linha-comunicado").filter({ hasText: titulo });
  await expect(linha).toHaveAttribute("aria-current", "true");
  await expect(linha).toBeInViewport();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
