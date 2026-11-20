import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import { ambienteE2E, RESPONSIVO } from "../playwright.config";
import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { bahiaEmCampos } from "../src/lib/datas";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
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

async function comunicadoPelaMensagem(mensagem: string) {
  const [linha] = await consultar((sql) => sql<{ id: string; estado: string; link_url: string | null }[]>`
    select id, estado, link_url from comunicado where mensagem = ${mensagem} order by id desc limit 1`);
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
  dados: { mensagem: string; link?: string; inicio?: string; fim?: string },
  botao: RegExp,
  { toque = false } = {},
) {
  const f = formulario(page);
  await f.getByLabel("Mensagem *").fill(dados.mensagem);
  if (dados.link) {
    await f.getByRole("combobox", { name: /Saiba mais/ }).fill(dados.link);
    await apertar(f.getByRole("option", { name: new RegExp(`Usar o endereço`) }), toque);
  }
  if (dados.inicio) await f.getByLabel("Começa em *").fill(dados.inicio);
  if (dados.fim) await f.getByLabel("Termina em *").fill(dados.fim);
  await apertar(f.getByRole("button", { name: botao }), toque);
}

test("CA-US24.1 · agendar pelo modal: fica em Agendados, fora do site, com as viradas marcadas", async ({ page }) => {
  const mensagem = `Recesso de fim de ano: a sede fecha (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await expect(formulario(page).getByRole("heading", { name: "Novo comunicado" })).toBeVisible();
  // Contador de caracteres e prévia acompanham o que se digita.
  await formulario(page).getByLabel("Mensagem *").fill(mensagem);
  await expect(formulario(page).getByText(`${mensagem.length}/140`)).toBeVisible();
  await expect(formulario(page).getByTestId("faixa-comunicado")).toContainText(mensagem);

  await preencher(page, { mensagem, inicio: campoDaqui(2 * DIA), fim: campoDaqui(4 * DIA) }, /^Agendar comunicado$/);

  await expect(page.getByText("Comunicado agendado")).toBeVisible();
  await expect(formulario(page)).toBeHidden();
  const salvo = await comunicadoPelaMensagem(mensagem);
  expect(salvo.estado).toBe("agendado");
  expect(await acoesNaAtividade(salvo.id)).toEqual(["comunicado.criar", "comunicado.agendar"]);

  await page.getByRole("link", { name: /^Agendados/ }).click();
  await expect(page.getByTestId("linha-comunicado").filter({ hasText: mensagem })).toContainText("Agendado");

  await page.goto("/contato");
  await expect(faixa(page)).toBeHidden();
});

test("CA-US01.1 · publicar agora: a faixa aparece em qualquer página do site, com “Saiba mais”", async ({ page }) => {
  const mensagem = `Feriado: a sede atende das 8h às 12h (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { mensagem, link: "/sindicato/instituicao", inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(page.getByText("Comunicado publicado: já está no site")).toBeVisible();

  // No painel, “No site agora” mostra a mesma faixa.
  await expect(page.getByRole("region", { name: "No site agora" }).getByTestId("faixa-comunicado")).toContainText(mensagem);

  for (const caminho of ["/", "/contato"]) {
    await page.goto(caminho);
    await expect(faixa(page)).toContainText(mensagem);
  }
  await faixa(page).getByRole("link", { name: /Saiba mais/ }).click();
  await expect(page).toHaveURL(/\/sindicato\/instituicao$/);
  expect((await comunicadoPelaMensagem(mensagem)).estado).toBe("publicado");
});

test("CA-US01.2 · dois no ar: “1 de 2”, setas e teclado, troca sozinha e para com o mouse em cima", async ({ page }) => {
  const primeiro = `Primeiro aviso da fila (${Date.now()}).`;
  const segundo = `Segundo aviso da fila (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  for (const mensagem of [primeiro, segundo]) {
    await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
    await preencher(page, { mensagem, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
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

test("com menos movimento pedido pelo sistema, a faixa não troca sozinha e não tem o botão Pausar", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  for (const mensagem of [`Aviso A (${Date.now()})`, `Aviso B (${Date.now()})`]) {
    await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
    await preencher(page, { mensagem, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
    await expect(formulario(page)).toBeHidden();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/contato");
  await expect(faixa(page).getByText("Comunicado 1 de 2")).toBeVisible();
  await expect(faixa(page).getByRole("button", { name: /Parar de trocar/ })).toHaveCount(0);
  await page.clock.runFor(20_000);
  await expect(faixa(page).getByText("Comunicado 1 de 2")).toBeVisible();
});

test("o X fecha a faixa (continua fechada nas outras páginas) e ela volta com um comunicado novo", async ({ page, context }) => {
  const antigo = `Aviso que vou fechar (${Date.now()}).`;
  const novo = `Aviso novo depois de fechar (${Date.now()}).`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { mensagem: antigo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(formulario(page)).toBeHidden();

  await page.goto("/contato");
  await faixa(page).getByRole("button", { name: "Fechar comunicado" }).click();
  await expect(faixa(page)).toBeHidden();
  await page.goto("/sindicato/diretoria");
  await expect(faixa(page)).toBeHidden();
  expect((await context.cookies()).some((c) => c.name === "sintravc_comunicados_fechados")).toBe(true);

  await page.goto("/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { mensagem: novo, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(formulario(page)).toBeHidden();

  await page.goto("/contato");
  await expect(faixa(page)).toContainText(novo);
  await expect(faixa(page)).not.toContainText(antigo);
});

test("CA-US24.2 · Encerrar agora com confirmação: a faixa sai do site e vai para a Atividade; depois, Duplicar", async ({ page }) => {
  const mensagem = `Assembleia geral hoje às 19h (${Date.now()}).`;
  await entrarComo(page, pessoas.adm, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { mensagem, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
  await expect(formulario(page)).toBeHidden();

  const linha = page.getByTestId("linha-comunicado").filter({ hasText: mensagem });
  await linha.getByRole("button", { name: /Ações do comunicado/ }).click();
  await page.getByRole("menuitem", { name: "Encerrar agora" }).click();
  const confirmacao = page.getByRole("alertdialog", { name: "Encerrar comunicado?" });
  // “Manter no ar” desiste sem mudar nada.
  await confirmacao.getByRole("button", { name: "Manter no ar" }).click();
  await expect(confirmacao).toBeHidden();
  expect((await comunicadoPelaMensagem(mensagem)).estado).toBe("publicado");

  await linha.getByRole("button", { name: /Ações do comunicado/ }).click();
  await page.getByRole("menuitem", { name: "Encerrar agora" }).click();
  await confirmacao.getByRole("button", { name: "Encerrar agora" }).click();
  await expect(page.getByText("Comunicado encerrado: a faixa saiu do site")).toBeVisible();

  const encerrado = await comunicadoPelaMensagem(mensagem);
  expect(encerrado.estado).toBe("encerrado");
  expect(await acoesNaAtividade(encerrado.id)).toEqual(["comunicado.criar", "comunicado.publicar", "comunicado.encerrar"]);
  await page.goto("/contato");
  await expect(faixa(page)).toBeHidden();

  // Encerrado pode ser duplicado: abre a cópia no formulário, como rascunho.
  await page.goto("/painel/comunicados?aba=encerrados");
  await page.getByTestId("linha-comunicado").filter({ hasText: mensagem }).first().getByRole("button", { name: /Ações do comunicado/ }).click();
  await page.getByRole("menuitem", { name: "Duplicar" }).click();
  await expect(formulario(page).getByRole("heading", { name: "Editar rascunho" })).toBeVisible();
  await expect(formulario(page).getByLabel("Mensagem *")).toHaveValue(mensagem);
});

test("fila: a alça muda a ordem pelo teclado, e a faixa do site segue a ordem nova", async ({ page }) => {
  const a = `Fila A (${Date.now()})`;
  const b = `Fila B (${Date.now()})`;
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  for (const mensagem of [a, b]) {
    await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
    await preencher(page, { mensagem, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, /^Publicar agora$/);
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

test("mensagem vazia e fim antes do começo: o formulário mostra o erro no campo e não salva", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await formulario(page).getByRole("button", { name: /^Agendar comunicado$/ }).click();
  await expect(formulario(page).getByText("Escreva a mensagem do comunicado.")).toBeVisible();
  await expect(formulario(page).getByLabel("Mensagem *")).toBeFocused();

  await preencher(page, { mensagem: "Aviso com datas trocadas", inicio: campoDaqui(3 * DIA), fim: campoDaqui(2 * DIA) }, /^Agendar comunicado$/);
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
    const mensagem = `Aviso pelo celular (${testInfo.project.name}, ${Date.now()}).`;
    await entrarComo(page, pessoas.com, "/painel/comunicados", { toque: hasTouch });
    const estreita = telaEstreita(page);

    await apertar(page.getByRole("button", { name: "Novo comunicado", exact: true }), hasTouch);
    await expect(formulario(page).getByRole("heading", { name: "Novo comunicado" })).toBeVisible();
    await preencher(page, { mensagem, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, estreita ? /^Publicar$/ : /^Publicar agora$/, { toque: hasTouch });
    await expect(formulario(page)).toBeHidden();

    if (estreita) {
      await expect(page.getByTestId("cartao-comunicado").filter({ hasText: mensagem })).toBeVisible();
      await expect(page.getByTestId("linha-comunicado").first()).toBeHidden();
    } else {
      await expect(page.getByTestId("linha-comunicado").filter({ hasText: mensagem })).toBeVisible();
    }
    await semRolagemLateral(page);

    // Um segundo no ar, para a faixa ter setas e Pausar.
    await apertar(page.getByRole("button", { name: "Novo comunicado", exact: true }), hasTouch);
    await preencher(page, { mensagem: `Segundo ${mensagem}`, inicio: campoDaqui(-5), fim: campoDaqui(DIA) }, estreita ? /^Publicar$/ : /^Publicar agora$/, { toque: hasTouch });
    await expect(formulario(page)).toBeHidden();

    await page.goto("/contato");
    await expect(faixa(page)).toContainText(mensagem);
    await expect(faixa(page).getByText("Comunicado 1 de 2")).toBeVisible();
    await semRolagemLateral(page);
    if (hasTouch) {
      // Setas, Pausar, X e “Saiba mais” com a área de toque mínima (E48).
      const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: '[data-testid="faixa-comunicado"]' });
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
    const fechar = faixa(page).getByRole("button", { name: "Fechar comunicado" });
    await expect(fechar).toBeVisible();
    await apertar(fechar, hasTouch);
    await expect(faixa(page)).toBeHidden();
  });
});

test("calendário de Conteúdos (E17): barra marinho do período, sem arrastar; o clique abre o comunicado e a legenda esconde", async ({ page }) => {
  const mensagem = `Comunicado no calendário (${Date.now()}).`;
  const inicio = campoDaqui(2 * DIA);
  await entrarComo(page, pessoas.com, "/painel/comunicados");
  await page.getByRole("button", { name: "Novo comunicado", exact: true }).click();
  await preencher(page, { mensagem, inicio, fim: campoDaqui(4 * DIA) }, /^Agendar comunicado$/);
  await expect(formulario(page)).toBeHidden();

  await page.goto(`/painel/conteudos?visao=calendario&mes=${inicio.slice(0, 7)}`);
  const barra = page.getByTestId("barra-comunicado").filter({ hasText: mensagem }).first();
  await expect(barra).toBeVisible();
  await expect(barra).toHaveAttribute("draggable", "false");
  await expect(page.locator(`[data-dia="${inicio.slice(0, 10)}"]`).getByTestId("barra-comunicado").filter({ hasText: mensagem })).toHaveCount(1);

  const legenda = page.getByRole("button", { name: /^Comunicados/ });
  await legenda.click();
  await expect(legenda).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("barra-comunicado")).toHaveCount(0);
  await legenda.click();

  await barra.click();
  await expect(page).toHaveURL(/\/painel\/comunicados/);
  await expect(formulario(page).getByRole("heading", { name: "Editar comunicado" })).toBeVisible();
  await expect(formulario(page).getByLabel("Mensagem *")).toHaveValue(mensagem);
});
