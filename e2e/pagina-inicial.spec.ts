import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import { publicarNoticiaPelaTela } from "./noticias";
import { adicionarChamadaPelaTela, adicionarDestaquePelaTela, episodioNoAr, esperarSalvo, itensDoCarrossel, limparHome, ordemNaHome, ordemNoPainel } from "./pagina-inicial";
import { campoDaqui, consultar } from "./radio";
import { entrarComo, semAnimacao, semRolagemLateral } from "./responsivo";

/**
 * Página inicial no painel (US26, RF46, E13, E43, E62, E63): o carrossel com as Chamadas, o
 * rascunho salvo sozinho, a prévia, “Publicar alterações” e “Tirar do ar agora”.
 */

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm" | "com" | "atd", PessoaDeTeste>;
const PROGRAMA = "A voz dos rodoviários de Conquista";
const DIA = 24 * 60;

// Estes testes publicam notícias pelo editor, como a pessoa faria: levam mais que os 30 s padrão.
test.describe.configure({ timeout: 120_000 });

test.beforeEach(limparHome);
test.afterAll(limparHome);

test("CA-US26.1 · reordenar pelo teclado e pelo menu, a prévia confere com o site depois de publicar, e “Tirar do ar agora”", async ({ page, context }) => {
  const sufixo = Date.now();
  const noticia = `Home e2e notícia ${sufixo}`;
  const episodio = `Home e2e episódio ${sufixo}`;
  await entrarComo(page, pessoas.com, "/painel");
  await publicarNoticiaPelaTela(page, noticia, { capa: "Assembleia na sede do sindicato" });
  await episodioNoAr(episodio);

  await page.goto("/painel/pagina-inicial");
  await expect(page.getByRole("heading", { level: 1, name: "Página inicial" })).toBeVisible();
  expect(await ordemNoPainel(page)).toEqual([PROGRAMA]);
  await expect(page.getByTestId("alteracoes-nao-publicadas")).toContainText("Igual ao site");

  await adicionarDestaquePelaTela(page, { tipo: "Notícia", titulo: noticia, frase: "Sua voz na campanha salarial" });
  await adicionarDestaquePelaTela(page, { tipo: "Episódio", titulo: episodio, saiEm: campoDaqui(2 * DIA) });
  await expect(itensDoCarrossel(page).nth(1).getByTestId("frase-do-item")).toContainText("Sua voz na campanha salarial");

  // “Editar”: a frase do episódio, com o contador e o limite do Parametro (90).
  await page.getByRole("button", { name: `Ações do destaque “${episodio}”` }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  const editar = page.getByRole("dialog", { name: "Editar destaque" });
  await editar.getByLabel("Frase de chamada (opcional)").fill("x".repeat(91));
  await expect(editar.getByText("91/90")).toBeVisible();
  await editar.getByRole("button", { name: "Salvar" }).click();
  await expect(editar.getByRole("alert")).toHaveText("A frase de chamada tem até 90 caracteres.");
  await editar.getByLabel("Frase de chamada (opcional)").fill("Ouça o programa desta semana");
  await editar.getByRole("button", { name: "Salvar" }).click();
  await expect(editar).toBeHidden();
  await expect(itensDoCarrossel(page).nth(2).getByTestId("frase-do-item")).toContainText("Ouça o programa desta semana");
  await esperarSalvo(page);
  expect(await ordemNoPainel(page)).toEqual([PROGRAMA, noticia, episodio]);
  await expect(page.getByTestId("alteracoes-nao-publicadas")).toContainText("2 alterações ainda não publicadas");
  await expect(itensDoCarrossel(page).nth(2).getByTestId("estado-do-item")).toContainText(/^Sai do destaque em \d{2}\/\d{2} às \d{2}h\d{2}$/);

  // Teclado: a alça do episódio, seta para cima.
  await page.getByRole("button", { name: new RegExp(`^Posição 3 de 3 no carrossel: ${episodio}`) }).focus();
  await page.keyboard.press("ArrowUp");
  expect(await ordemNoPainel(page)).toEqual([PROGRAMA, episodio, noticia]);
  await expect(page.getByRole("status").filter({ hasText: "Agora na posição 2 de 3 no carrossel." })).toBeAttached();

  // Mouse: o menu ⋯ do programa, “Mover para baixo”.
  await page.getByRole("button", { name: `Ações do destaque “${PROGRAMA}”` }).click();
  await page.getByRole("menuitem", { name: "Mover para baixo" }).click();
  expect(await ordemNoPainel(page)).toEqual([episodio, PROGRAMA, noticia]);
  await esperarSalvo(page);

  // Salvo sozinho: recarregar mantém o rascunho.
  await page.reload();
  expect(await ordemNoPainel(page)).toEqual([episodio, PROGRAMA, noticia]);

  // O site continua com o publicado até “Publicar alterações”.
  const site = await context.newPage();
  await site.goto("/");
  expect(await ordemNaHome(site)).toEqual([PROGRAMA]);

  // A prévia (aba nova) mostra o rascunho.
  const [previa] = await Promise.all([page.waitForEvent("popup"), page.getByRole("link", { name: /Pré-visualizar/ }).first().click()]);
  await expect(previa.getByText("Prévia · rascunho")).toBeVisible();
  const ordemDaPrevia = await ordemNaHome(previa);
  expect(ordemDaPrevia).toEqual([episodio, PROGRAMA, noticia]);
  await previa.close();

  await page.getByRole("button", { name: "Publicar alterações" }).first().click();
  const confirmar = page.getByRole("alertdialog", { name: "Publicar alterações na página inicial?" });
  await expect(confirmar).toContainText("3 alterações vão para o site agora.");
  await confirmar.getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Alterações publicadas. A página inicial do site já mostra a nova versão.")).toBeVisible();
  await expect(page.getByTestId("alteracoes-nao-publicadas")).toContainText("Igual ao site");

  await site.reload();
  expect(await ordemNaHome(site)).toEqual(ordemDaPrevia);
  await expect(site.getByTestId("slide-home").and(site.locator("[data-ativo]"))).toContainText(episodio);
  // A frase de chamada aparece no lugar da linha fina.
  await expect(site.getByTestId("slide-home").and(site.locator("[data-ativo]"))).toContainText("Ouça o programa desta semana");
  await expect(site.getByTestId("slide-home").filter({ hasText: noticia })).toContainText("Sua voz na campanha salarial");
  const [publicacao] = await consultar((sql) => sql<{ acao: string }[]>`select acao from atividade where acao = 'pagina_inicial.publicar' order by id desc limit 1`);
  expect(publicacao?.acao).toBe("pagina_inicial.publicar");

  // “Tirar do ar agora”: só no item no ar, com confirmação; sai do site na hora. Uma mudança feita logo
  // antes (ainda esperando o salvamento automático) não se perde.
  await page.getByRole("button", { name: new RegExp(`^Posição 3 de 3 no carrossel: ${noticia}`) }).focus();
  await page.keyboard.press("ArrowUp");
  expect(await ordemNoPainel(page)).toEqual([episodio, noticia, PROGRAMA]);
  await page.getByRole("button", { name: `Ações do destaque “${episodio}”` }).click();
  await page.getByRole("menuitem", { name: "Tirar do ar agora" }).click();
  const tirar = page.getByRole("alertdialog", { name: "Tirar o destaque do ar agora?" });
  await expect(tirar).toContainText(episodio);
  await tirar.getByRole("button", { name: "Tirar do ar agora" }).click();
  await expect(page.getByText("Destaque tirado do ar. Ele já não aparece no site.")).toBeVisible();
  await expect(itensDoCarrossel(page).first().getByTestId("estado-do-item")).toContainText(/^Saiu em /);
  expect(await ordemNoPainel(page)).toEqual([episodio, noticia, PROGRAMA]);
  await esperarSalvo(page);
  await page.reload();
  expect(await ordemNoPainel(page)).toEqual([episodio, noticia, PROGRAMA]);
  await site.reload();
  expect(await ordemNaHome(site)).toEqual([PROGRAMA, noticia]);
  const [registro] = await consultar(
    (sql) => sql<{ alvo_rotulo: string }[]>`select alvo_rotulo from atividade where acao = 'destaque.tirar_do_ar' order by id desc limit 1`,
  );
  expect(registro?.alvo_rotulo).toBe(episodio);
});

test("“Destacar na Home” do editor abre a janela com a notícia; agendado mostra a entrada e não vai ao site antes da hora", async ({ page }) => {
  const noticia = `Home e2e sugerida ${Date.now()}`;
  await entrarComo(page, pessoas.com, "/painel");
  await publicarNoticiaPelaTela(page, noticia, { capa: "Ônibus novos na garagem" });

  await page.getByRole("link", { name: "Destacar na Home" }).click();
  await expect(page).toHaveURL(/\/painel\/pagina-inicial$/);
  const janela = page.getByRole("dialog", { name: "Adicionar destaque" });
  await expect(janela.getByRole("radio", { name: new RegExp(noticia) })).toBeChecked();
  const entrada = campoDaqui(3 * DIA);
  await janela.getByLabel("Entra em").fill(entrada);
  await janela.getByRole("button", { name: "Pôr no carrossel" }).click();
  await esperarSalvo(page);

  const item = itensDoCarrossel(page).filter({ hasText: noticia });
  const [dia, hora] = [entrada.slice(8, 10) + "/" + entrada.slice(5, 7), entrada.slice(11, 13) + "h" + entrada.slice(14, 16)];
  await expect(item.getByTestId("estado-do-item")).toHaveText(`Agendado: entra em ${dia} às ${hora}`);
  await page.getByRole("button", { name: `Ações do destaque “${noticia}”` }).click();
  await expect(page.getByRole("menuitem", { name: "Tirar do ar agora" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Publicar alterações" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Alterações publicadas.", { exact: false })).toBeVisible();
  await page.goto("/");
  expect(await ordemNaHome(page)).toEqual([PROGRAMA]);
});

test("Chamada (E63): escolher a foto na Mídia, escrever, publicar, ver no site com o botão Filie-se e trocar o destino para Benefícios", async ({ page }) => {
  const frase = `Chamada e2e ${Date.now()}`;
  const apoio = "Texto de apoio do teste, curto e direto.";
  const alt = "Ônibus amarelo na avenida, ilustração de teste";
  await entrarComo(page, pessoas.com, "/painel/pagina-inicial");
  await expect(page.getByRole("heading", { level: 2, name: /Em destaque/ })).toHaveCount(0);

  // Sem foto, a janela avisa e não fecha.
  await page.getByRole("button", { name: "Adicionar destaque" }).click();
  const janela = page.getByRole("dialog", { name: "Adicionar destaque" });
  await janela.getByText("Chamada", { exact: true }).click();
  await expect(janela.getByLabel("Texto do botão")).toHaveValue("Filie-se");
  await janela.getByRole("button", { name: "Pôr no carrossel" }).click();
  await expect(janela.getByRole("alert")).toHaveText("Escolha a foto da Chamada.");
  await janela.getByRole("button", { name: "Cancelar" }).click();

  await adicionarChamadaPelaTela(page, { frase, apoio, alt });
  const item = itensDoCarrossel(page).last();
  await expect(item).toContainText(frase);
  await expect(item).toContainText("Chamada · Filie-se");
  await esperarSalvo(page);

  await page.getByRole("button", { name: "Publicar alterações" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Alterações publicadas.", { exact: false })).toBeVisible();

  // No site: a Chamada é o 2º slide (depois do programa), com a foto e o texto alternativo, a frase, o apoio e o botão.
  await page.goto("/");
  expect(await ordemNaHome(page)).toEqual([PROGRAMA, frase]);
  await page.getByTestId("carrossel-home").getByRole("button", { name: "Próximo destaque" }).click();
  const slide = page.locator("[data-testid=slide-home][data-ativo]");
  await expect(slide.getByRole("heading", { level: 2 })).toHaveText(frase);
  await expect(slide).toContainText(apoio);
  await expect(slide.getByRole("img", { name: alt })).toBeVisible();
  const botao = slide.getByRole("link", { name: /Filie-se/ });
  await expect(botao).toHaveAttribute("href", /^https:\/\/wa\.me\/55\d+/);
  await expect(botao).toHaveAttribute("target", "_blank");

  // Editar: trocar o destino troca o texto padrão do botão.
  await page.goto("/painel/pagina-inicial");
  await page.getByRole("button", { name: `Ações do destaque “${frase}”` }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  const edicao = page.getByRole("dialog", { name: "Editar Chamada" });
  await edicao.getByText("Benefícios", { exact: true }).click();
  await expect(edicao.getByLabel("Texto do botão")).toHaveValue("Ver benefícios");
  await edicao.getByRole("button", { name: "Salvar" }).click();
  await expect(itensDoCarrossel(page).last()).toContainText("Chamada · Benefícios");
  await esperarSalvo(page);
  await page.getByRole("button", { name: "Publicar alterações" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publicar agora" }).click();
  await expect(page.getByText("Alterações publicadas.", { exact: false })).toBeVisible();

  await page.goto("/");
  await page.getByTestId("carrossel-home").getByRole("button", { name: "Próximo destaque" }).click();
  await expect(page.locator("[data-testid=slide-home][data-ativo]").getByRole("link", { name: /Ver benefícios/ })).toHaveAttribute("href", "/sindicato/beneficios");
});

test("aba Rádio Chofer (E63): “Sempre o último programa” ou um episódio da lista, e o programa repetido fica travado", async ({ page }) => {
  const episodio = `Home e2e aba rádio ${Date.now()}`;
  await episodioNoAr(episodio);
  await entrarComo(page, pessoas.com, "/painel/pagina-inicial");

  // O programa já está no carrossel (seed): a opção vem travada, com o motivo.
  await page.getByRole("button", { name: "Adicionar destaque" }).click();
  const janela = page.getByRole("dialog", { name: "Adicionar destaque" });
  await expect(janela.getByText("Episódio", { exact: true })).toHaveCount(0);
  await expect(janela.getByText("Programa Rádio Chofer", { exact: true })).toHaveCount(0);
  await janela.getByText("Rádio Chofer", { exact: true }).click();
  await expect(janela.getByRole("radio", { name: /Sempre o último programa/ })).toBeDisabled();
  await expect(janela).toContainText("Já está no carrossel");
  await janela.getByRole("button", { name: "Pôr no carrossel" }).click();
  await expect(janela.getByRole("alert")).toHaveText("Escolha o último programa ou um episódio.");
  await janela.getByRole("button", { name: "Cancelar" }).click();

  // Sem o programa, “Sempre o último programa” volta; o episódio entra pela mesma aba.
  await page.getByRole("button", { name: `Ações do destaque “${PROGRAMA}”` }).click();
  await page.getByRole("menuitem", { name: "Remover do carrossel" }).click();
  await adicionarDestaquePelaTela(page, { tipo: "Episódio", titulo: episodio });
  await adicionarDestaquePelaTela(page, { tipo: "Programa Rádio Chofer" });
  expect(await ordemNoPainel(page)).toEqual([episodio, PROGRAMA]);
});

test("o Atendimento não abre a Página inicial nem a prévia (403)", async ({ page }) => {
  await entrarComo(page, pessoas.atd, "/painel");
  expect((await page.goto("/painel/pagina-inicial"))?.status()).toBe(403);
  expect((await page.goto("/painel/pagina-inicial/previa"))?.status()).toBe(403);
});

test.describe("Página inicial no celular e no tablet", { tag: "@responsivo" }, () => {
  test("cartões, mover pelo menu ⋯, barra fixa com Pré-visualizar e Publicar, sem rolagem lateral e com alvos de toque", async ({ page, hasTouch }) => {
    const episodio = `Home e2e episódio toque ${Date.now()}`;
    await episodioNoAr(episodio);
    await entrarComo(page, pessoas.com, "/painel/pagina-inicial", { toque: hasTouch });
    await expect(page.getByRole("heading", { level: 1, name: "Página inicial" })).toBeVisible();

    await adicionarDestaquePelaTela(page, { tipo: "Episódio", titulo: episodio }, { toque: hasTouch });
    await esperarSalvo(page);
    await apertar(page.getByRole("button", { name: `Ações do destaque “${episodio}”` }), hasTouch);
    await apertar(page.getByRole("menuitem", { name: "Mover para cima" }), hasTouch);
    expect(await ordemNoPainel(page)).toEqual([episodio, PROGRAMA]);

    // A janela da Chamada (E63) também funciona no toque, com o seletor da Mídia.
    const frase = `Chamada toque ${Date.now()}`;
    await adicionarChamadaPelaTela(page, { frase, apoio: "Apoio no toque.", alt: "Ilustração de teste" }, { toque: hasTouch });
    expect(await ordemNoPainel(page)).toEqual([episodio, PROGRAMA, frase]);

    await expect(page.getByRole("button", { name: "Publicar alterações" }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Pré-visualizar/ }).filter({ visible: true })).toHaveCount(1);
    await semRolagemLateral(page);
    if (hasTouch) {
      await semAnimacao(page);
      const pequenos = await page.evaluate(alvosDeToquePequenos, RESPONSIVO.alvoDeToque);
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
  });
});
