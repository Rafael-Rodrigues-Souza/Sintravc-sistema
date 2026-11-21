import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import { adicionarEpisodioPelaTela, consultar, idNovo, limparRadio } from "./radio";
import { entrarComo, semRolagemLateral } from "./responsivo";

// Rádio Chofer no site (US04, CA-US04.1, CA-US04.2, E55, E56, E61), como um visitante usaria: o player
// só carrega no clique, toca no próprio cartão, um por vez; “Ler transcrição”; busca, tema e
// “Carregar mais”. Os episódios do fluxo principal são publicados pela tela do painel; os da grade
// longa entram pelo banco, só para ter quantidade.

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm" | "com" | "atd", PessoaDeTeste>;

test.beforeEach(limparRadio);
test.afterAll(limparRadio);

/** O player do YouTube não sai para a internet no teste: devolve uma página vazia no lugar. */
async function playerSemRede(page: Page) {
  await page.route("https://www.youtube-nocookie.com/**", (rota) => rota.fulfill({ contentType: "text/html", body: "<html><body>player</body></html>" }));
}

/** Endereços do Google pedidos pela página (E56: nenhum antes do clique). */
function pedidosAoGoogle(page: Page) {
  const pedidos: string[] = [];
  page.on("request", (r) => {
    const host = new URL(r.url()).hostname;
    if (/(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googleapis\.com|google\.com|googlevideo\.com|gstatic\.com)$/.test(host)) pedidos.push(r.url());
  });
  return pedidos;
}

/** Episódios publicados direto no banco (só para a grade longa e o tema). */
async function episodiosNoBanco(quantos: number, { tema }: { tema?: string } = {}) {
  await consultar((sql) => sql`
    insert into episodio (numero, youtube_id, titulo, resumo, estado, exibicao_em, ja_publicado, publicado_em, criado_por, atualizado_por, tema_categoria_id)
    select 100 + n, substr(md5(random()::text), 1, 11), 'Programa de arquivo ' || n, 'Resumo do programa ' || n, 'publicado',
           now() - (n || ' days')::interval, true, now(), p.id, p.id,
           (select id from categoria where nome = ${tema ?? ""})
    from generate_series(1, ${quantos}) as n, pessoa_equipe p
    where p.email = ${pessoas.com.email}
    returning id`);
}

const cartoes = (page: Page) => page.getByTestId("cartao-episodio");
const cartao = (page: Page, titulo: string) => cartoes(page).filter({ hasText: titulo });

test("CA-US04.1 e CA-US04.2 · o player só carrega no clique, toca no próprio cartão e um por vez", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  const primeiro = await adicionarEpisodioPelaTela(page, { titulo: "Saúde mental no volante", numero: "43", resumo: "Psicóloga explica o estresse." });
  const segundo = await adicionarEpisodioPelaTela(page, { titulo: "Jornada e escala", numero: "42", exibicaoEmMinutos: -3 * 24 * 60 });
  // Agendado no futuro: não aparece no site.
  await adicionarEpisodioPelaTela(page, { titulo: "Ainda não foi ao ar", numero: "44", exibicaoEmMinutos: 2 * 24 * 60 });

  await playerSemRede(page);
  const google = pedidosAoGoogle(page);
  await page.goto("/radio-chofer");
  await expect(page.getByRole("heading", { level: 1, name: "Rádio Chofer" })).toBeVisible();
  await expect(cartoes(page)).toHaveCount(2);
  await expect(cartao(page, "Ainda não foi ao ar")).toHaveCount(0);
  // A capa vem pela nossa rota, e nenhum iframe existe antes do clique.
  await expect(cartao(page, "Saúde mental no volante").locator("img").first()).toHaveAttribute("src", `/radio-chofer/capa/${primeiro}`);
  await expect(page.getByTestId("player-youtube")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(google, "nada vai ao Google antes do clique").toEqual([]);

  // Topo: sem último programa marcado, o mais recente no ar.
  await expect(page.getByRole("button", { name: "Ouvir agora: Ep. 43 — Saúde mental no volante" }).first()).toBeVisible();

  await cartao(page, "Jornada e escala").getByRole("button", { name: "Ouvir agora: Ep. 42 — Jornada e escala" }).click();
  const player = cartao(page, "Jornada e escala").getByTestId("player-youtube");
  await expect(player).toBeVisible();
  const src = new URL((await player.getAttribute("src"))!);
  expect(src.origin + src.pathname).toBe(`https://www.youtube-nocookie.com/embed/${segundo}`);
  expect(Object.fromEntries(src.searchParams)).toMatchObject({ autoplay: "1", cc_lang_pref: "pt", hl: "pt-BR" });
  expect(src.searchParams.has("cc_load_policy"), "ligar a legenda fica com quem assiste").toBe(false);
  await expect(player).toHaveAttribute("title", "Ep. 42 — Jornada e escala (player do YouTube)");
  await expect(player).toBeFocused();

  // Tocar outro fecha o anterior.
  await cartao(page, "Saúde mental no volante").getByRole("button", { name: /Ouvir agora/ }).click();
  await expect(page.getByTestId("player-youtube")).toHaveCount(1);
  await expect(cartao(page, "Saúde mental no volante").getByTestId("player-youtube")).toBeVisible();
});

test("teclado: Tab até o “Ouvir agora” do topo e Enter toca; o último programa marcado fica no topo", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  await adicionarEpisodioPelaTela(page, { titulo: "Programa marcado", numero: "10", ultimo: true, exibicaoEmMinutos: -5 * 24 * 60 });
  await adicionarEpisodioPelaTela(page, { titulo: "Programa mais novo", numero: "11" });
  await playerSemRede(page);
  await page.goto("/radio-chofer");

  const doTopo = page.getByRole("region", { name: "Rádio Chofer" }).getByRole("button", { name: "Ouvir agora: Ep. 10 — Programa marcado" });
  await expect(doTopo).toBeVisible();
  await expect(page.getByText("Ep. 10 · Último programa")).toBeVisible();
  await doTopo.focus();
  await page.keyboard.press("Enter");
  const player = page.getByRole("region", { name: "Rádio Chofer" }).getByTestId("player-youtube");
  await expect(player).toBeFocused();
});

test("E55 · “Ler transcrição” abre a janela com o texto; Esc fecha e o foco volta", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  await adicionarEpisodioPelaTela(page, { titulo: "Com transcrição", numero: "5", transcricao: "Bom dia, rodoviários!\nHoje o assunto é a jornada." });
  await adicionarEpisodioPelaTela(page, { titulo: "Sem transcrição", numero: "4", exibicaoEmMinutos: -2 * 24 * 60 });
  await page.goto("/radio-chofer");

  await expect(cartao(page, "Sem transcrição").getByRole("button", { name: /Ler transcrição/ })).toHaveCount(0);
  const ler = cartao(page, "Com transcrição").getByRole("button", { name: "Ler transcrição do Ep. 5" });
  await ler.click();
  const janela = page.getByRole("dialog", { name: "Transcrição · Ep. 5" });
  await expect(janela).toBeVisible();
  await expect(janela.getByTestId("texto-da-transcricao")).toHaveText("Bom dia, rodoviários!\nHoje o assunto é a jornada.");
  await page.keyboard.press("Escape");
  await expect(janela).toBeHidden();
  await expect(ler).toBeFocused();

  // Fecha também pelo X e pelo voltar do navegador, sem sair da página.
  await ler.click();
  await janela.getByRole("button", { name: "Fechar" }).click();
  await expect(janela).toBeHidden();
  await ler.click();
  await expect(janela).toBeVisible();
  await page.goBack();
  await expect(janela).toBeHidden();
  await expect(page).toHaveURL(/\/radio-chofer$/);
});

test("busca e tema: filtram pela URL; tema sem episódio mostra o vazio com “Limpar filtros”", async ({ page }) => {
  const tema = `Saúde ${Date.now()}`;
  await consultar((sql) => sql`insert into categoria (nome, cor, ordem, escopos) values (${tema}, 'azul', 90, '{radio}') returning id`);
  try {
    await entrarComo(page, pessoas.com, "/painel/radio");
    await adicionarEpisodioPelaTela(page, { titulo: "Pausas e saúde", numero: "21", tema });
    await adicionarEpisodioPelaTela(page, { titulo: "Campanha salarial", numero: "22", exibicaoEmMinutos: -24 * 60 });
    await page.goto("/radio-chofer");

    const seletor = page.getByRole("combobox", { name: "Tema" });
    await expect(seletor.locator("option")).toHaveText(["Todos os temas (2)", `${tema} (1)`]);
    await seletor.selectOption({ label: `${tema} (1)` });
    await expect(page).toHaveURL(/tema=saude-\d+/);
    await expect(cartoes(page)).toHaveCount(1);
    await expect(cartao(page, "Pausas e saúde")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Tema" })).toHaveValue(/saude-\d+/);

    await page.goto("/radio-chofer");
    await page.getByRole("searchbox", { name: "Buscar episódio" }).fill("ep 22");
    await page.getByRole("searchbox", { name: "Buscar episódio" }).press("Enter");
    await expect(page).toHaveURL(/busca=ep\+22/);
    await expect(cartoes(page)).toHaveCount(1);
    await expect(cartao(page, "Campanha salarial")).toBeVisible();
    await expect(page.getByText("1 episódio encontrado")).toBeVisible();

    await page.getByRole("searchbox", { name: "Buscar episódio" }).fill("nada disso existe");
    await page.getByRole("searchbox", { name: "Buscar episódio" }).press("Enter");
    await expect(page.getByText("Nenhum episódio encontrado")).toBeVisible();
    await page.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(cartoes(page)).toHaveCount(2);
  } finally {
    await consultar((sql) => sql`update episodio set tema_categoria_id = null where tema_categoria_id in (select id from categoria where nome = ${tema}) returning id`);
    await consultar((sql) => sql`delete from categoria where nome = ${tema} returning id`);
  }
});

test("“Carregar mais episódios” acrescenta a próxima leva, com o foco no primeiro novo", async ({ page }) => {
  await episodiosNoBanco(8);
  await page.goto("/radio-chofer");
  await expect(cartoes(page)).toHaveCount(6);
  await page.getByRole("link", { name: "Carregar mais episódios" }).click();
  await expect(cartoes(page)).toHaveCount(8);
  await expect(page).toHaveURL(/leva=2/);
  await expect(cartoes(page).nth(6).getByRole("heading")).toBeFocused();
  await expect(page.getByRole("link", { name: "Carregar mais episódios" })).toHaveCount(0);
});

test("programa ao vivo: a linha e os botões do canal; desligado, a linha some; sem episódio, o vazio", async ({ page }) => {
  // O programa é gravado pela tela (o painel limpa o cache da ConfigSite, RN43), não pelo banco.
  await entrarComo(page, pessoas.com, "/painel/radio");
  const cartaoDoPrograma = page.getByRole("region", { name: "Programa ao vivo" });
  await cartaoDoPrograma.getByRole("button", { name: /Dias e horário/ }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Canal no YouTube").fill("youtube.com/@sintravc");
  await dialogo.getByLabel("Começa às").fill("13:00");
  await dialogo.getByLabel("Termina às").fill("14:00");
  await dialogo.getByRole("button", { name: "Salvar" }).click();
  await expect(dialogo).toBeHidden();
  const interruptor = cartaoDoPrograma.getByRole("switch", { name: "Programa ao vivo" });
  if ((await interruptor.getAttribute("aria-checked")) === "false") {
    await interruptor.click();
    await expect(page.getByText("Programa ao vivo ligado: o horário aparece no site")).toBeVisible();
  }

  await page.goto("/radio-chofer");
  await expect(page.getByText("Ao vivo de segunda a sexta · 13h")).toBeVisible();
  await expect(page.getByRole("link", { name: /Assistir no YouTube/ }).first()).toHaveAttribute("href", "https://youtube.com/@sintravc");
  await expect(page.getByRole("link", { name: /Inscrever-se no canal/ })).toHaveAttribute("href", "https://youtube.com/@sintravc?sub_confirmation=1");
  await expect(page.getByText("Nenhum episódio publicado ainda")).toBeVisible();
  await expect(page.getByText("Os episódios aparecem aqui assim que forem publicados.")).toBeVisible();

  await page.goto("/painel/radio");
  await page.getByRole("switch", { name: "Programa ao vivo" }).click();
  // Espera o servidor gravar: o interruptor muda na tela antes da resposta.
  await expect(page.getByText("Programa ao vivo desligado: o horário saiu do site")).toBeVisible();
  await page.goto("/radio-chofer");
  await expect(page.getByText(/Ao vivo de/)).toHaveCount(0);

  // Volta como estava, para os outros testes.
  await page.goto("/painel/radio");
  await page.getByRole("switch", { name: "Programa ao vivo" }).click();
  await expect(page.getByText("Programa ao vivo ligado: o horário aparece no site")).toBeVisible();
});

test.describe("Rádio Chofer no site, no celular", { tag: "@responsivo" }, () => {
  test("topo empilhado, grade sem rolagem lateral, alvos de toque e o toque toca no cartão", async ({ page, hasTouch }) => {
    await episodiosNoBanco(3);
    await playerSemRede(page);
    await page.goto("/radio-chofer");
    await expect(cartoes(page)).toHaveCount(3);
    await semRolagemLateral(page);
    if (hasTouch) {
      const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "main" });
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
    const alvo = cartoes(page).nth(1);
    await alvo.scrollIntoViewIfNeeded();
    await apertar(alvo.getByRole("button", { name: /Ouvir agora/ }), hasTouch);
    await expect(alvo.getByTestId("player-youtube")).toBeVisible();
    await semRolagemLateral(page);
  });
});

test("um id qualquer na rota da capa não vira proxy: 404", async ({ request }) => {
  const resposta = await request.get(`/radio-chofer/capa/${idNovo()}`);
  expect(resposta.status()).toBe(404);
});
