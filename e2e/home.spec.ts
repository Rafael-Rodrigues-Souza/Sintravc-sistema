import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { RESPONSIVO } from "../playwright.config";
import { ALTURA_DO_CARROSSEL } from "../src/components/site/home/altura-do-carrossel";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { publicarNoticiaPelaTela } from "./noticias";
import { carrosselMisturado, episodioNoAr, limparHome, ordemNaHome } from "./pagina-inicial";
import { consultar } from "./radio";
import { entrarComo, semAnimacao, semRolagemLateral } from "./responsivo";

/**
 * Home pública (US01, RF01, RN41, P6, E62, E63): carrossel com Anterior, Próximo, traços, teclado e
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
/** O traço do slide N (1, 2…): o atual tem aria-current. */
const traco = (page: Page, n: number, total: number) => carrossel(page).getByRole("button", { name: `Ir para o destaque ${n} de ${total}` });

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

test("carrossel (E58, E63): troca sozinho, para com o mouse em cima, e setas, traços e teclado param de vez; sem botão Pausar", async ({ page }) => {
  const episodio = `Home e2e carrossel ${Date.now()}`;
  await carrosselComDois(episodio);
  await page.clock.install();
  await page.goto("/");
  await expect(ativo(page)).toContainText(PROGRAMA);
  await expect(traco(page, 1, 2)).toHaveAttribute("aria-current", "true");
  await expect(carrossel(page)).toHaveAttribute("data-movimento", "normal");
  await expect(carrossel(page).getByRole("button", { name: /Pausar|Continuar/ })).toHaveCount(0);

  // Troca sozinho depois do tempo do parâmetro (8 s).
  await page.mouse.move(0, 0);
  await page.clock.runFor(8_500);
  await expect(ativo(page)).toContainText(episodio);
  await expect(traco(page, 2, 2)).toHaveAttribute("aria-current", "true");

  // Com o mouse em cima, não troca; ao sair, volta a trocar.
  await carrossel(page).getByRole("heading", { level: 2 }).filter({ visible: true }).hover();
  await page.clock.runFor(20_000);
  await expect(ativo(page)).toContainText(episodio);
  await page.mouse.move(0, 0);
  await page.clock.runFor(8_500);
  await expect(ativo(page)).toContainText(PROGRAMA);

  // O traço leva ao slide; depois disso, não troca mais sozinho.
  await traco(page, 2, 2).click();
  await expect(ativo(page)).toContainText(episodio);
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.clock.runFor(30_000);
  await expect(ativo(page)).toContainText(episodio);

  // Setas e teclado.
  await carrossel(page).getByRole("button", { name: "Próximo destaque" }).click();
  await expect(ativo(page)).toContainText(PROGRAMA);
  await carrossel(page).getByRole("button", { name: "Destaque anterior" }).click();
  await expect(ativo(page)).toContainText(episodio);
  await carrossel(page).getByRole("button", { name: "Próximo destaque" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(ativo(page)).toContainText(PROGRAMA);
  await page.keyboard.press("ArrowLeft");
  await expect(ativo(page)).toContainText(episodio);
  await expect(page.getByText("Destaque 2 de 2")).toBeAttached();
});

test("com “reduzir movimento”, não troca sozinho", async ({ browser }) => {
  const episodio = `Home e2e reduzir ${Date.now()}`;
  await carrosselComDois(episodio);
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const contexto = await browser.newContext({ reducedMotion });
    const page = await contexto.newPage();
    await page.clock.install();
    await page.goto("/");
    await expect(carrossel(page)).toHaveAttribute("data-movimento", reducedMotion === "reduce" ? "reduzido" : "normal");
    // Uma troca (8 s): sem a preferência, vai ao episódio; com ela, fica no programa.
    await page.clock.runFor(8_500);
    await expect(ativo(page)).toContainText(reducedMotion === "reduce" ? PROGRAMA : episodio);
    await contexto.close();
  }
});

test("os 4 tipos publicados aparecem no site: notícia com capa, episódio, programa e Chamadas para Filie-se e Benefícios (E62, E63)", async ({ page }) => {
  const noticia = `Home e2e misto ${Date.now()}`;
  const episodio = `Home e2e episódio misto ${Date.now()}`;
  await entrarComo(page, pessoas.com, "/painel");
  await publicarNoticiaPelaTela(page, noticia, { capa: "Assembleia na sede, foto de teste" });
  const [linha] = await consultar((sql) => sql<{ id: string }[]>`select id from conteudo where titulo = ${noticia}`);
  const chamadas = await carrosselMisturado({ noticiaId: linha!.id, episodioId: await episodioNoAr(episodio) });

  await page.goto("/");
  expect(await ordemNaHome(page)).toEqual([noticia, episodio, PROGRAMA, chamadas[0]!.frase, chamadas[1]!.frase]);
  await expect(carrossel(page).getByTestId("tracos-carrossel").getByRole("button")).toHaveCount(5);

  await traco(page, 1, 5).click();
  await expect(ativo(page).getByRole("link", { name: /Ler notícia/ })).toBeVisible();
  await traco(page, 4, 5).click();
  await expect(ativo(page).getByRole("img", { name: "Foto de teste 1" })).toBeAttached();
  const filiacao = ativo(page).getByRole("link", { name: /Filie-se/ });
  await expect(filiacao).toHaveAttribute("href", /^https:\/\/wa\.me\/55\d+/);
  await expect(filiacao).toHaveAttribute("target", "_blank");
  await traco(page, 5, 5).click();
  await expect(ativo(page).getByRole("link", { name: /Ver benefícios/ })).toHaveAttribute("href", "/sindicato/beneficios");
});

test("a seção do carrossel ocupa a tela abaixo do topo, com uma sobra para o começo da próxima seção (E63)", async ({ page }) => {
  await carrosselComDois(`Home e2e altura ${Date.now()}`);
  const { minimo, maximo, sobra } = ALTURA_DO_CARROSSEL;
  for (const perfil of [RESPONSIVO.perfis.computador, RESPONSIVO.perfis.notebook]) {
    const altura = perfil.altura;
    await page.setViewportSize({ width: perfil.largura, height: altura });
    await page.goto("/");
    await expect(carrossel(page)).toHaveAttribute("data-movimento", /./);
    const caixa = (await carrossel(page).boundingBox())!;
    // Vai até a sobra antes do fim da janela (até o máximo): o começo da próxima seção aparece.
    const fim = Math.round(caixa.y + caixa.height);
    const topo = Math.round(caixa.y);
    const esperada = Math.min(maximo, Math.max(minimo, altura - topo - sobra));
    expect(Math.abs(fim - (topo + esperada))).toBeLessThanOrEqual(2);
    expect(fim).toBeLessThan(altura);
  }
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
