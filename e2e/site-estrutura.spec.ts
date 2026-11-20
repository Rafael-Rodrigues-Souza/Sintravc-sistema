import { expect, test, type Page } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { FACEBOOK_DE_TESTE } from "./dados-do-site";
import { apertar } from "./entrar";
import { janelaEstreitaNoDesktop, semAnimacao, semRolagemLateral, telaEstreita } from "./responsivo";

/**
 * Estrutura do site público na Fase 1 (#13, #64): cabeçalho, menu mobile, rodapé, Filiar-se e aviso de
 * cookies (RF07, RF09; N13, E01, E56). Os dados de contato vêm da ConfigSite do seed (RN43).
 */

const TELEFONE = "(77) 3423-4959";
const HORARIO = "Segunda a sexta, das 8h às 11h e das 14h às 17h";
const WHATSAPP = "https://wa.me/557734234959";
const FILIACAO = `${WHATSAPP}?text=${encodeURIComponent("Olá! Quero me filiar ao SINTRAVC.")}`;

const avisoCookies = (page: Page) => page.getByRole("region", { name: "Aviso de cookies" });
const menuPrincipal = (page: Page) => page.getByRole("navigation", { name: "Principal" });
const rodape = (page: Page) => page.getByRole("contentinfo");

/** Já com a escolha feita, para o aviso não cobrir o rodapé nos testes que não são dele. */
async function semAviso(page: Page, baseURL: string | undefined) {
  await page.context().addCookies([{ name: "sintravc_cookies", value: "essenciais", url: baseURL! }]);
}

test.describe("cabeçalho e rodapé do site (desktop)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
  });

  test("contato da ConfigSite na barra superior e no rodapé, e Filiar-se com a mensagem pronta (CA-US05.1, CA-US06.1)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("barra-telefone")).toHaveText(TELEFONE);
    await expect(rodape(page).getByTestId("rodape-telefone")).toHaveText(TELEFONE);
    await expect(rodape(page)).toContainText("Rua Laudicéia Gusmão, 586 - Centro, Vitória da Conquista - BA");
    await expect(rodape(page)).toContainText("CEP 45000-705");
    await expect(rodape(page)).toContainText(HORARIO);
    await expect(page.getByText(`Atendimento: ${HORARIO}`)).toBeVisible();

    const filiar = page.getByRole("link", { name: "Filiar-se pelo WhatsApp" });
    await expect(filiar).toHaveCount(2); // cabeçalho e rodapé
    for (const link of await filiar.all()) {
      await expect(link).toHaveAttribute("href", FILIACAO);
      await expect(link).toHaveAttribute("target", "_blank");
    }

    // Fase 1: nada de “Entrar” no cabeçalho, no menu ou no rodapé (E01).
    await expect(page.getByRole("link", { name: /entrar/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /entrar/i })).toHaveCount(0);
  });

  test("menu principal com o mouse: Sindicato abre o submenu, com Instituição, Diretoria e Benefícios", async ({ page }) => {
    await page.goto("/");
    const inicio = menuPrincipal(page).getByRole("link", { name: "Início" });
    await expect(inicio).toHaveAttribute("aria-current", "page");

    const sindicato = menuPrincipal(page).getByRole("button", { name: "Sindicato" });
    await expect(sindicato).toHaveAttribute("aria-expanded", "false");
    await sindicato.click();
    await expect(sindicato).toHaveAttribute("aria-expanded", "true");
    await expect(menuPrincipal(page).getByRole("link", { name: "Instituição" })).toHaveAttribute("href", "/sindicato/instituicao");
    await expect(menuPrincipal(page).getByRole("link", { name: "Diretoria" })).toHaveAttribute("href", "/sindicato/diretoria");
    await expect(menuPrincipal(page).getByRole("link", { name: "Benefícios" })).toBeVisible();
  });

  test("teclado: pular para o conteúdo, abrir o submenu com Enter e fechar com Esc", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(pular).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#conteudo")).toBeFocused();

    const documentos = menuPrincipal(page).getByRole("button", { name: "Documentos" });
    await documentos.focus();
    await page.keyboard.press("Enter");
    await expect(documentos).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await expect(menuPrincipal(page).getByRole("link", { name: "Acordos coletivos" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(documentos).toHaveAttribute("aria-expanded", "false");
    await expect(documentos).toBeFocused();
  });
});

test.describe("aviso de cookies (CA-US08.2, E56)", () => {
  test("aparece na primeira visita; depois de aceitar, não volta; o link Cookies do rodapé reabre", async ({ page, context }) => {
    await page.goto("/");
    await expect(avisoCookies(page)).toBeVisible();
    await expect(avisoCookies(page).getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/politica-de-privacidade");

    await avisoCookies(page).getByRole("button", { name: "Aceitar todos" }).click();
    await expect(avisoCookies(page)).toBeHidden();
    await expect.poll(async () => (await context.cookies()).find((c) => c.name === "sintravc_cookies")?.value).toBe("todos");

    await page.reload();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(avisoCookies(page)).toBeHidden();

    // A escolha vale pelo tempo do Parametro (365 dias no seed).
    const cookie = (await context.cookies()).find((c) => c.name === "sintravc_cookies")!;
    const dias = (cookie.expires * 1000 - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(364);
    expect(dias).toBeLessThanOrEqual(365);

    await rodape(page).getByRole("button", { name: "Cookies" }).click();
    await expect(avisoCookies(page)).toBeVisible();
    await expect(avisoCookies(page)).toBeFocused();
    await expect(avisoCookies(page).getByRole("button", { name: "Aceitar todos" })).toHaveAttribute("aria-pressed", "true");
    await avisoCookies(page).getByRole("button", { name: "Só essenciais" }).click();
    await expect(avisoCookies(page)).toBeHidden();
    await expect.poll(async () => (await context.cookies()).find((c) => c.name === "sintravc_cookies")?.value).toBe("essenciais");
  });
});

test.describe("aviso de cookies quando o servidor não grava a escolha (E56, E23)", () => {
  test("o aviso continua na tela e um aviso rápido pede para tentar de novo; depois, a escolha é gravada", async ({ page, context }) => {
    // A escolha é gravada por uma server action (POST com o cabeçalho next-action): aqui ela falha.
    let falhar = true;
    await page.route("**/*", async (rota) => {
      const pedido = rota.request();
      if (falhar && pedido.method() === "POST" && (await pedido.headerValue("next-action"))) {
        await rota.fulfill({ status: 500, body: "erro" });
        return;
      }
      await rota.fallback();
    });

    await page.goto("/");
    await avisoCookies(page).getByRole("button", { name: "Aceitar todos" }).click();
    await expect(page.getByText("Não conseguimos guardar a sua escolha. Tente de novo.")).toBeVisible();
    await expect(avisoCookies(page)).toBeVisible();
    expect((await context.cookies()).find((c) => c.name === "sintravc_cookies")).toBeUndefined();

    falhar = false;
    await avisoCookies(page).getByRole("button", { name: "Aceitar todos" }).click();
    await expect(avisoCookies(page)).toBeHidden();
    await expect.poll(async () => (await context.cookies()).find((c) => c.name === "sintravc_cookies")?.value).toBe("todos");
  });
});

test.describe("menu mobile do visitante", { tag: "@responsivo" }, () => {
  test("abre com as seções e Filiar-se pelo WhatsApp, sem Entrar, e fecha pelo X e pelo Esc (CA-US08.1)", async ({ page, hasTouch, baseURL }, testInfo) => {
    await semAviso(page, baseURL);
    await page.goto("/");
    await janelaEstreitaNoDesktop(page, testInfo.project.name);
    await semRolagemLateral(page);

    const abrir = page.getByRole("button", { name: "Abrir menu" });
    if (!telaEstreita(page)) {
      // Tablet deitado, notebook e computador: menu principal no cabeçalho, sem o botão do menu.
      await expect(menuPrincipal(page)).toBeVisible();
      await expect(abrir).toBeHidden();
      return;
    }

    await expect(menuPrincipal(page)).toBeHidden();
    await apertar(abrir, hasTouch);
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await semAnimacao(page);

    for (const nome of ["Início", "Notícias", "Rádio Chofer", "Contato"]) {
      await expect(menu.getByRole("link", { name: nome, exact: true })).toBeVisible();
    }
    await expect(menu.getByRole("link", { name: "Início", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(menu.getByRole("link", { name: /entrar/i })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Filiar-se pelo WhatsApp" })).toHaveAttribute("href", FILIACAO);

    // Sindicato abre e fecha no toque, com aria-expanded.
    const sindicato = menu.getByRole("button", { name: "Sindicato" });
    await expect(sindicato).toHaveAttribute("aria-expanded", "false");
    await expect(menu.getByRole("link", { name: "Diretoria" })).toBeHidden();
    await apertar(sindicato, hasTouch);
    await expect(sindicato).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: "Diretoria" })).toBeVisible();

    await apertar(menu.getByRole("button", { name: "Fechar menu" }), hasTouch);
    await expect(menu).toBeHidden();
    await expect(abrir).toBeFocused();

    await apertar(abrir, hasTouch);
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

test.describe("Sindicato: Instituição e Diretoria (US07)", { tag: "@responsivo" }, () => {
  test("chegar pelo menu, usar a linha do tempo como índice da história e trocar de aba", async ({ page, hasTouch, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/");

    // Pelo menu, como a pessoa faria: submenu no desktop, menu mobile no celular.
    if (telaEstreita(page)) {
      await apertar(page.getByRole("button", { name: "Abrir menu" }), hasTouch);
      const menu = page.getByRole("dialog", { name: "Menu" });
      await apertar(menu.getByRole("button", { name: "Sindicato" }), hasTouch);
      await apertar(menu.getByRole("link", { name: "Instituição" }), hasTouch);
    } else {
      await apertar(menuPrincipal(page).getByRole("button", { name: "Sindicato" }), hasTouch);
      await apertar(menuPrincipal(page).getByRole("link", { name: "Instituição" }), hasTouch);
    }
    await expect(page).toHaveURL(/\/sindicato\/instituicao$/);
    await expect(page.getByRole("heading", { level: 1, name: "Juntos, somos mais fortes." })).toBeVisible();
    await semRolagemLateral(page);

    // Ano de fundação confirmado (1993) e o que falta como marcador visível.
    await expect(page.getByRole("region", { name: "O SINTRAVC em números" })).toContainText("1993");
    await expect(page.getByRole("main").locator("[data-marcador]").first()).toBeVisible();

    // A linha do tempo leva ao subtítulo do texto da história.
    const linha = page.getByRole("navigation", { name: "Linha do tempo" });
    await apertar(linha.getByRole("link", { name: /Marco de crescimento/ }), hasTouch);
    await expect(page).toHaveURL(/#marco-de-crescimento$/);
    await expect(page.locator("h3#marco-de-crescimento")).toBeInViewport();

    // Aba Diretoria.
    const abas = page.getByRole("navigation", { name: "Sindicato" });
    await expect(abas.getByRole("link", { name: "Instituição" })).toHaveAttribute("aria-current", "page");
    await apertar(abas.getByRole("link", { name: "Diretoria" }), hasTouch);
    await expect(page).toHaveURL(/\/sindicato\/diretoria$/);
    await expect(page.getByRole("heading", { level: 1, name: "Diretoria" })).toBeVisible();
    await semRolagemLateral(page);
  });

  test("Diretoria: presidente e vice em destaque, os outros 7 em cartões e o WhatsApp da recepção", async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/sindicato/diretoria");
    await expect(page.getByRole("article", { name: "Presidente" }).getByRole("heading", { name: "Álvaro Silva Souza" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Vice-presidente" }).getByRole("heading", { name: "Eduardo Cesar Dutra de Oliveira" })).toBeVisible();

    const grade = page.getByRole("region", { name: "Nossa diretoria" }).getByRole("listitem");
    await expect(grade).toHaveCount(8); // 7 pessoas e o cartão “Quer falar com a diretoria?”
    await expect(grade.filter({ hasText: "José Evaristo Pereira Neto" })).toContainText("Diretor Jurídico");
    await expect(page.getByRole("link", { name: "Fale no WhatsApp" })).toHaveAttribute("href", WHATSAPP);
    await expect(page.getByText("9", { exact: true })).toBeVisible();
    await semRolagemLateral(page);
  });

  test("Diretoria: o destaque do vice é maior que os cartões e menor que o do presidente", async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/sindicato/diretoria");
    const area = async (onde: ReturnType<Page["getByRole"]>) => {
      const caixa = (await onde.getByRole("img").first().boundingBox())!;
      return Math.round(caixa.width * caixa.height);
    };
    const presidente = await area(page.getByRole("article", { name: "Presidente" }));
    const vice = await area(page.getByRole("article", { name: "Vice-presidente" }));
    const cartao = await area(page.getByRole("region", { name: "Nossa diretoria" }).getByRole("listitem").first());

    expect(vice, `vice (${vice}) maior que o cartão (${cartao})`).toBeGreaterThan(cartao);
    expect(presidente, `presidente (${presidente}) maior que o vice (${vice})`).toBeGreaterThan(vice);

    // Os números do topo: no celular e no tablet em pé, numa faixa de 3 colunas (58:1384); no desktop, em lista (58:996).
    const topos = await page.getByRole("region", { name: "Diretoria" }).locator("dl > div").evaluateAll((itens) => itens.map((i) => Math.round(i.getBoundingClientRect().top)));
    expect(new Set(topos).size, `topos dos números: ${topos.join(", ")}`).toBe(telaEstreita(page) ? 1 : 3);
  });
});

test.describe("topo com foto: Instituição e Contato (Figma 57:813 / 56:519, 89:964 / 87:629; #64)", { tag: "@responsivo" }, () => {
  const TOPOS = [
    { caminho: "/sindicato/instituicao", titulo: "Juntos, somos mais fortes.", botao: "Conheça nossa história" },
    { caminho: "/contato", titulo: "Entre em contato", botao: "Chamar no WhatsApp" },
  ];

  for (const topo of TOPOS) {
    test(`${topo.caminho}: no celular, a foto vem entre o texto e os botões; no desktop, ao lado`, async ({ page, baseURL }) => {
      await semAviso(page, baseURL);
      await page.goto(topo.caminho);
      const secao = page.getByRole("region", { name: topo.titulo });
      const foto = (await secao.getByRole("img", { name: /Foto ainda não enviada/ }).boundingBox())!;
      const botao = (await secao.getByRole("link", { name: topo.botao }).boundingBox())!;
      const titulo = (await secao.getByRole("heading", { level: 1 }).boundingBox())!;

      if (telaEstreita(page)) {
        expect(foto.y, "foto abaixo do título").toBeGreaterThan(titulo.y + titulo.height - 1);
        expect(botao.y, "botões abaixo da foto").toBeGreaterThan(foto.y + foto.height - 1);
      } else {
        expect(foto.x, "foto à direita do texto").toBeGreaterThan(botao.x + botao.width);
      }

      // O leitor de tela e o Tab seguem a mesma ordem: título, foto, botões.
      const ordem = await secao.evaluate(
        (el, nomeDoBotao) =>
          [...el.querySelectorAll("h1, [role=img], a")]
            .map((n) => (n.tagName === "H1" ? "título" : n.getAttribute("role") === "img" ? "foto" : n.textContent?.trim()))
            .filter((t) => t === "título" || t === "foto" || t === nomeDoBotao),
        topo.botao,
      );
      expect(ordem).toEqual(["título", "foto", topo.botao]);
    });
  }
});

test.describe("Contato (US05)", { tag: "@responsivo" }, () => {
  test("canais da ConfigSite e o mapa do Google só depois do clique em Carregar mapa (CA-US05.1, CA-US05.2)", async ({ page, hasTouch, baseURL }) => {
    await semAviso(page, baseURL);
    const pedidosAoGoogle: string[] = [];
    page.on("request", (r) => {
      if (/google\./.test(new URL(r.url()).hostname)) pedidosAoGoogle.push(r.url());
    });

    await page.goto("/contato");
    await expect(page.getByRole("heading", { level: 1, name: "Entre em contato" })).toBeVisible();
    await expect(page.getByTestId("contato-telefone")).toHaveText(TELEFONE);
    await expect(page.getByRole("link", { name: "Abrir conversa" })).toHaveAttribute("href", WHATSAPP);
    await expect(page.getByRole("link", { name: "Ligar agora" })).toHaveAttribute("href", "tel:+557734234959");
    await expect(page.getByRole("link", { name: "Enviar e-mail" })).toHaveAttribute("href", "mailto:sintravcrodoviarios@gmail.com");
    await expect(page.getByRole("link", { name: "Abrir rota no Google Maps" })).toHaveAttribute("href", /google\.com\/maps\/dir\/.*Laudic/);
    await semRolagemLateral(page);

    // “Só essenciais”: nada do Google até a pessoa pedir.
    const mapa = page.locator('iframe[title="Mapa da sede do SINTRAVC"]');
    await expect(mapa).toHaveCount(0);
    expect(pedidosAoGoogle).toEqual([]);
    await apertar(page.getByRole("button", { name: "Carregar mapa" }), hasTouch);
    await expect(mapa).toHaveAttribute("src", /google\.com\/maps\?q=.*output=embed/);
  });

  test("com “Aceitar todos”, o mapa já vem carregado", async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: "sintravc_cookies", value: "todos", url: baseURL! }]);
    await page.goto("/contato");
    await expect(page.locator('iframe[title="Mapa da sede do SINTRAVC"]')).toBeAttached();
    await expect(page.getByRole("button", { name: "Carregar mapa" })).toHaveCount(0);
  });
});

test.describe("páginas de apoio: 404, Política de privacidade e Termos de uso (RF09)", { tag: "@responsivo" }, () => {
  test("endereço que não existe mostra a 404 com a moldura e os atalhos", async ({ page, hasTouch, baseURL }) => {
    await semAviso(page, baseURL);
    const resposta = await page.goto("/pagina-que-nao-existe");
    expect(resposta?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    const atalhos = page.getByRole("navigation", { name: "Atalhos" });
    await expect(atalhos.getByRole("link")).toHaveCount(4);
    await semRolagemLateral(page);
    await apertar(page.getByRole("link", { name: "Voltar ao início" }), hasTouch);
    await expect(page).toHaveURL(/\/$/);
  });

  test("Política e Termos no mesmo modelo, com o texto do advogado como marcador (D6)", async ({ page, hasTouch, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/");
    await apertar(rodape(page).getByRole("link", { name: "Política de privacidade" }), hasTouch);
    await expect(page).toHaveURL(/\/politica-de-privacidade$/);
    await expect(page.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeVisible();
    await expect(page.getByRole("main").getByText("[Texto a definir pelo advogado do sindicato]")).toBeVisible();
    await semRolagemLateral(page);

    const abas = page.getByRole("navigation", { name: "Documentos legais" });
    await apertar(abas.getByRole("link", { name: "Termos de uso" }), hasTouch);
    await expect(page).toHaveURL(/\/termos-de-uso$/);
    await expect(page.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeVisible();
    await expect(abas.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("main").getByText("[Texto a definir pelo advogado do sindicato]")).toBeVisible();
  });
});

test.describe("alvos de toque do site (RNF10, E48)", { tag: "@responsivo" }, () => {
  test("no toque, nenhum link ou botão do site fica menor que o mínimo", async ({ page, hasTouch, baseURL }) => {
    test.skip(!hasTouch, "só no toque");
    await semAviso(page, baseURL);
    for (const caminho of ["/sindicato/instituicao", "/sindicato/diretoria", "/contato", "/politica-de-privacidade", "/pagina-que-nao-existe"]) {
      await page.goto(caminho);
      const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: "body" });
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`), `${caminho}: alvos de toque pequenos`).toEqual([]);
      await semRolagemLateral(page);
    }
  });
});

test.describe("redes sociais da ConfigSite (RN43, E57)", { tag: "@responsivo" }, () => {
  /** Seed (#64): Instagram e YouTube; o e2e acrescenta o Facebook de teste. Sem canal, o WhatsApp abre a recepção. */
  const REDES_DO_RODAPE = [
    { nome: "Instagram", href: "https://www.instagram.com/sintravc.ba/" },
    { nome: "Facebook", href: FACEBOOK_DE_TESTE },
    { nome: "YouTube", href: "https://www.youtube.com/@melodialives" },
    { nome: "WhatsApp da recepção", href: WHATSAPP },
  ];

  test("ícones das redes no rodapé e na barra superior, com nome, link em nova aba e alvo de toque", async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/");
    const lugares = telaEstreita(page) ? [rodape(page)] : [rodape(page), page.getByTestId("barra-superior")];
    for (const lugar of lugares) {
      const links = lugar.getByRole("link", { name: /^(Instagram|Facebook|YouTube|WhatsApp da recepção|Canal no WhatsApp)$/ });
      await expect(links).toHaveCount(REDES_DO_RODAPE.length);
      for (const rede of REDES_DO_RODAPE) {
        const link = lugar.getByRole("link", { name: rede.nome, exact: true });
        await expect(link).toHaveAttribute("href", rede.href);
        await expect(link).toHaveAttribute("target", "_blank");
      }
    }
    // O canal sem link não aparece com esse nome: o ícone é o da recepção.
    await expect(page.getByRole("link", { name: "Canal no WhatsApp" })).toHaveCount(0);

    // Os ícones do rodapé têm o alvo de toque inteiro, sem depender do toque.
    for (const rede of REDES_DO_RODAPE) {
      const caixa = (await rodape(page).getByRole("link", { name: rede.nome, exact: true }).boundingBox())!;
      expect(Math.min(caixa.width, caixa.height), `${rede.nome} no rodapé`).toBeGreaterThanOrEqual(RESPONSIVO.alvoDeToque);
    }
  });

  test("o Contato lista as redes com o link e o canal no WhatsApp como marcador", async ({ page, baseURL }) => {
    await semAviso(page, baseURL);
    await page.goto("/contato");
    const regiao = page.getByRole("region", { name: "Acompanhe o SINTRAVC nas redes sociais" });
    await expect(regiao.getByRole("link", { name: /Facebook/ })).toHaveAttribute("href", FACEBOOK_DE_TESTE);
    await expect(regiao.getByRole("link", { name: /Instagram/ })).toHaveAttribute("href", "https://www.instagram.com/sintravc.ba/");
    await expect(regiao.getByRole("link", { name: /YouTube/ })).toHaveAttribute("href", "https://www.youtube.com/@melodialives");
    await expect(regiao).toContainText("Canal no WhatsApp");
  });
});
