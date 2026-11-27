import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { publicarNoticiaPelaTela } from "./noticias";
import { episodioNoAr, limparHome, ordemNaHome } from "./pagina-inicial";
import { consultar } from "./radio";
import { entrarComo, semAnimacao, semRolagemLateral } from "./responsivo";

/**
 * Home pública (US01, RF01, RN41, P6, E62, E63): carrossel com Anterior, Próximo, teclado, Pausar e
 * “reduzir movimento”, acesso rápido sem “Agendar”, últimas notícias com o seletor, último programa
 * e os contadores das redes.
 */

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm" | "com", PessoaDeTeste>;
const PROGRAMA = "A voz dos rodoviários de Conquista";

/** Publica direto no banco um carrossel com o programa e um episódio (o painel tem os próprios e2e). */
async function carrosselComDois(titulo: string) {
  const id = await episodioNoAr(titulo);
  await consultar((sql) => sql`delete from destaque_home where versao = 'publicado' returning id`);
  await consultar(
    (sql) => sql`
      insert into destaque_home (versao, posicao, item_tipo, item_id)
      values ('publicado', 1, 'programa', null), ('publicado', 2, 'episodio', ${id})
      returning id`,
  );
  return id;
}

const carrossel = (page: Page) => page.getByTestId("carrossel-home");
const ativo = (page: Page) => page.locator("[data-testid=slide-home][data-ativo]");
const contador = (page: Page) => page.getByTestId("contador-carrossel");

test.beforeEach(limparHome);
test.afterAll(limparHome);

test("CA-US01.3 · sem conexão, a Home não tem “Agendar”; o acesso rápido leva a Acordos, Benefícios, Editais e WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /SINTRAVC/ })).toBeAttached();
  await expect(page.getByRole("link", { name: /Agendar/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Agendar/ })).toHaveCount(0);

  const atalhos = page.getByTestId("acesso-rapido").getByRole("link");
  await expect(atalhos).toHaveCount(4);
  await expect(atalhos.nth(0)).toHaveAttribute("href", "/documentos/acordos-coletivos");
  await expect(atalhos.nth(1)).toHaveAttribute("href", "/sindicato/beneficios");
  await expect(atalhos.nth(2)).toHaveAttribute("href", "/documentos/editais");
  await expect(atalhos.nth(3)).toHaveAttribute("href", /^https:\/\/wa\.me\/55\d+$/);
  await expect(atalhos.nth(3)).toHaveAttribute("target", "_blank");

  // Sem destaque no ar além do seed, o carrossel mostra o programa, sem controles.
  expect(await ordemNaHome(page)).toEqual([PROGRAMA]);
  await expect(carrossel(page).getByRole("button", { name: "Próximo destaque" })).toHaveCount(0);
});

test("carrossel: troca sozinho, Próximo e Anterior, ← e →, e Pausar para de vez", async ({ page }) => {
  const episodio = `Home e2e carrossel ${Date.now()}`;
  await carrosselComDois(episodio);
  await page.clock.install();
  await page.goto("/");
  await expect(contador(page)).toHaveText("01 / 02");
  await expect(ativo(page)).toContainText(PROGRAMA);
  await expect(carrossel(page)).toHaveAttribute("data-movimento", "normal");

  // Troca sozinho depois do tempo do parâmetro (8 s).
  await page.clock.runFor(8_500);
  await expect(ativo(page)).toContainText(episodio);
  await expect(contador(page)).toHaveText("02 / 02");

  // Botões, com o mouse.
  await carrossel(page).getByRole("button", { name: "Próximo destaque" }).click();
  await expect(ativo(page)).toContainText(PROGRAMA);
  await carrossel(page).getByRole("button", { name: "Destaque anterior" }).click();
  await expect(ativo(page)).toContainText(episodio);
  // Depois que a pessoa usou as setas, fica parado e o botão passa a “Continuar”.
  await expect(carrossel(page).getByRole("button", { name: "Continuar a troca automática" })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.clock.runFor(20_000);
  await expect(ativo(page)).toContainText(episodio);

  // Teclado: com o foco dentro, ← e →.
  await carrossel(page).getByRole("button", { name: "Próximo destaque" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(ativo(page)).toContainText(PROGRAMA);
  await page.keyboard.press("ArrowRight");
  await expect(ativo(page)).toContainText(episodio);
  await expect(page.getByText("Destaque 2 de 2")).toBeAttached();

  // Continuar volta a trocar (com o foco e o mouse fora, que também param a troca); Pausar para.
  const sairDoCarrossel = async () => {
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  };
  await carrossel(page).getByRole("button", { name: "Continuar a troca automática" }).click();
  await sairDoCarrossel();
  await page.clock.runFor(8_500);
  await expect(ativo(page)).toContainText(PROGRAMA);
  await carrossel(page).getByRole("button", { name: "Pausar a troca automática" }).click();
  await page.mouse.move(0, 0);
  await page.clock.runFor(20_000);
  await expect(ativo(page)).toContainText(PROGRAMA);
});

test("com “reduzir movimento”, não troca sozinho, e o botão tem o mesmo HTML (sem piscar)", async ({ browser }) => {
  const episodio = `Home e2e reduzir ${Date.now()}`;
  await carrosselComDois(episodio);
  const html: string[] = [];
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const contexto = await browser.newContext({ reducedMotion });
    const page = await contexto.newPage();
    await page.clock.install();
    // O HTML que o servidor manda, antes da hidratação.
    const resposta = await page.request.get("/");
    const bruto = await resposta.text();
    html.push(/<button[^>]*data-testid="pausar-carrossel"[^>]*>.*?<\/button>/s.exec(bruto)?.[0] ?? "");
    await page.goto("/");
    const botao = carrossel(page).getByTestId("pausar-carrossel").filter({ visible: true });
    await expect(botao).toHaveAccessibleName(reducedMotion === "reduce" ? "Continuar a troca automática" : "Pausar a troca automática");
    await expect(carrossel(page)).toHaveAttribute("data-movimento", reducedMotion === "reduce" ? "reduzido" : "normal");
    // Uma troca (8 s): sem a preferência, vai ao episódio; com ela, fica no programa.
    await page.clock.runFor(8_500);
    await expect(ativo(page)).toContainText(reducedMotion === "reduce" ? PROGRAMA : episodio);
    await contexto.close();
  }
  expect(html[0]).not.toBe("");
  expect(html[0]).toBe(html[1]);
});

test("sem a lista “Em destaque” (E63); últimas notícias com o seletor de categoria", async ({ page }) => {
  const noticia = `Home e2e última ${Date.now()}`;
  await entrarComo(page, pessoas.com, "/painel");
  await publicarNoticiaPelaTela(page, noticia, { categoria: "Esportes" });

  await page.goto("/");
  await expect(page.getByTestId("lista-em-destaque")).toHaveCount(0);
  await expect(page.getByText("Em destaque", { exact: true })).toHaveCount(0);
  const ultimas = page.getByTestId("ultimas-noticias");
  await expect(ultimas.getByRole("article").first()).toContainText(noticia);

  const seletor = page.getByLabel("Categoria", { exact: true });
  await expect(seletor.locator("option").first()).toHaveText(/^Todas as categorias \(\d+\)$/);
  const outra = (await seletor.locator("option").allTextContents()).find((o) => !/^(Todas as categorias|Esportes) /.test(o));
  if (outra) {
    await seletor.selectOption({ label: outra });
    await expect(page).toHaveURL(/\?categoria=/);
    await expect(page.getByTestId("ultimas-noticias")).not.toContainText(noticia);
  }
  await page.getByLabel("Categoria", { exact: true }).selectOption({ label: (await page.getByLabel("Categoria", { exact: true }).locator("option", { hasText: /^Esportes/ }).innerText()).trim() });
  await expect(page).toHaveURL(/\?categoria=esportes/);
  await expect(page.getByTestId("ultimas-noticias").getByRole("article").first()).toContainText(noticia);
  await expect(page.getByRole("link", { name: "Ver todas as notícias" }).filter({ visible: true })).toHaveAttribute("href", "/noticias?categoria=esportes");
});

test("contadores das redes vêm da ConfigSite (P6): sem número, a linha some", async ({ page }) => {
  test.setTimeout(240_000);
  const [antes] = await consultar((sql) => sql<{ dados: Record<string, unknown> }[]>`select dados from config_site where id = 'site'`);
  try {
    await consultar(
      (sql) => sql`
        update config_site set dados = jsonb_set(jsonb_set(dados, '{contadores}', '{"instagram": null, "youtube": 980, "canalWhatsapp": 1234}'::jsonb),
          '{redes,canalWhatsapp}', '"https://whatsapp.com/channel/0029VaTeste"'::jsonb)
        where id = 'site' returning id`,
    );
    // A ConfigSite tem cache de até 1 minuto (RN43): espera o site ler de novo.
    await expect
      .poll(
        async () => {
          await page.goto("/");
          return page.getByTestId("contador-canalWhatsapp").count();
        },
        { timeout: 90_000, intervals: [5_000] },
      )
      .toBe(1);
    await expect(page.getByTestId("contador-canalWhatsapp")).toHaveText("1.234 rodoviários já recebem os avisos por aqui");
    await expect(page.getByTestId("contador-youtube")).toHaveText("980 inscritos");
    await expect(page.getByTestId("contador-instagram")).toHaveCount(0);
  } finally {
    await consultar((sql) => sql`update config_site set dados = ${sql.json(antes!.dados as never)} where id = 'site' returning id`);
    // Só termina quando o site já leu a ConfigSite devolvida: senão o canal de teste vaza para o próximo spec.
    await expect
      .poll(
        async () => {
          await page.goto("/");
          return page.getByTestId("contador-canalWhatsapp").count();
        },
        { timeout: 90_000, intervals: [5_000] },
      )
      .toBe(0);
  }
});

test("último programa: nada vai ao Google antes do clique no player", async ({ page }) => {
  const episodio = `Home e2e player ${Date.now()}`;
  await episodioNoAr(episodio);
  const pedidos: string[] = [];
  page.on("request", (r) => pedidos.push(new URL(r.url()).hostname));
  await page.goto("/");
  const secao = page.getByRole("region", { name: "Último programa" });
  await expect(secao).toContainText(episodio);
  await expect(secao.getByTestId("ao-vivo-home")).toBeVisible();
  expect(pedidos.filter((h) => /youtube|ytimg|google/.test(h))).toEqual([]);

  await secao.getByRole("button", { name: new RegExp(`Ouvir agora: Ep\\. \\d+ — ${episodio}`) }).click();
  await expect(secao.getByTestId("player-youtube")).toBeVisible();
});

test.describe("Home no celular e no tablet", { tag: "@responsivo" }, () => {
  test("carrossel com deslize, seções sem rolagem lateral e alvos de toque", async ({ page, hasTouch }) => {
    const episodio = `Home e2e toque ${Date.now()}`;
    await carrosselComDois(episodio);
    await page.goto("/");
    await expect(ativo(page)).toContainText(PROGRAMA);
    await semRolagemLateral(page);

    if (hasTouch) {
      const cdp = await page.context().newCDPSession(page);
      const caixa = (await ativo(page).getByRole("heading", { level: 2 }).boundingBox())!;
      const de = { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [de] });
      for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: de.x - (150 * i) / 8, y: de.y }] });
      await page.waitForTimeout(150);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(ativo(page)).toContainText(episodio);

      await semAnimacao(page);
      // Só a Home: a barra e o rodapé têm os próprios e2e (site-estrutura).
      const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "main" });
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
  });
});
