import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import sharp from "sharp";

import { RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import {
  ALTURA_BAIXA,
  assentar,
  barraDoCorpo,
  caixasQueSeCruzam,
  contraste,
  CONTRASTE_MINIMO,
  emCadaLargura,
  entrarComoAdm,
  FERRAMENTAS_DO_CORPO,
  ferramentaDoCorpo,
  itensEsmagados,
  larguraDaBarra,
  linhasDoTexto,
  pdfComTexto,
  pessoas,
  semAnimacao,
  semRolagemLateral,
  tabletQueGira,
  telaEstreita,
  textoCortado,
  textoVisivelCruza,
  TOLERANCIA,
  usarFerramentaDoCorpo,
} from "./responsivo";

/**
 * Correções de responsividade do painel (issue #44, E48). Roda no desktop e em cada perfil de
 * RESPONSIVO do playwright.config.ts, nos temas claro e escuro.
 */

// Sem --hide-scrollbars: a barra de rolagem de um menu precisa aparecer para se medir o espaço dela.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

test("a área de toque do CSS (--alvo-toque) é a mesma de RESPONSIVO.alvoDeToque", async ({ page }) => {
  await page.goto("/painel/entrar");
  const noCss = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--alvo-toque").trim());
  expect(noCss).toBe(`${RESPONSIVO.alvoDeToque}px`);
});

test("o corte do celular no CSS (avisos acima da barra) e no “Mais” é RESPONSIVO.menuLateralAPartirDe", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "muda a largura da janela: só no desktop");
  const corte = RESPONSIVO.menuLateralAPartirDe;
  const altura = page.viewportSize()!.height;
  await entrarComoAdm(page, "/painel");
  await page.setViewportSize({ width: corte - 1, height: altura });
  await assentar(page);

  // Logo abaixo do corte, o aviso sobe acima da barra de baixo; no corte, volta ao lugar de sempre.
  await page.getByRole("button", { name: "Buscar" }).click({ force: true });
  await expect(page.getByText("A busca do painel está disponível em breve.")).toBeVisible();
  // A lista dos avisos tem altura zero (cada aviso fica por cima dela): mede-se a base dela.
  const avisos = page.locator('[data-sonner-toaster][data-y-position="bottom"]');
  const baseDosAvisos = () => avisos.evaluate((el) => parseFloat(getComputedStyle(el).bottom));
  const abaixoDoCorte = await baseDosAvisos();
  await page.setViewportSize({ width: corte, height: altura });
  await assentar(page);
  const noCorte = await baseDosAvisos();
  expect(abaixoDoCorte, "abaixo do corte, o aviso fica acima da barra de baixo").toBeGreaterThan(noCorte);

  // O “Mais” aberto logo abaixo do corte fecha quando a janela chega ao corte (menu lateral).
  await page.setViewportSize({ width: corte - 1, height: altura });
  await page.getByRole("navigation", { name: "Navegação do painel" }).getByRole("button", { name: "Mais" }).click();
  await expect(page.getByRole("dialog", { name: "Mais" })).toBeVisible();
  await page.setViewportSize({ width: corte, height: altura });
  await expect(page.getByRole("dialog", { name: "Mais" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Menu do painel" })).toBeVisible();
});

const salvo = (page: Page) => expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");

/**
 * Os dois editores, com o que a pessoa preenche para publicar e o campo que ela altera depois. Tudo
 * pela tela, clicando e escolhendo como uma pessoa faria.
 */
const NOTICIA = {
  nome: "notícia",
  endereco: "/painel/conteudos/noticia/nova",
  campo: "Manchete",
  campoAlterado: "Lide",
  async preencher(page: Page, sufixo: string, toque: boolean) {
    await page.getByLabel("Manchete").fill(`Assembleia geral dos rodoviários (${sufixo})`);
    await page.getByLabel("Lide").fill("A assembleia é na quarta, às 19h, na sede do sindicato.");
    await apertar(page.getByRole("textbox", { name: "Corpo da notícia" }), toque);
    await page.keyboard.type("Leve contracheques e documento com foto.");
    await page.getByLabel("Assinatura").fill("Redação SINTRAVC");
    await page.getByLabel("Categoria").selectOption({ label: "Jurídico" });
  },
  async publicar(page: Page, toque: boolean) {
    await apertar(page.locator("main header").first().getByRole("button", { name: "Publicar…" }), toque);
    const modal = page.getByRole("dialog", { name: "Publicar notícia?" });
    await apertar(modal.getByRole("button", { name: "Publicar agora" }), toque);
    await expect(page.getByText("Notícia publicada.", { exact: true })).toBeVisible();
  },
};

const DOCUMENTO = {
  nome: "documento",
  endereco: "/painel/conteudos/documento/nova?tipo=edital",
  campo: "Título oficial",
  campoAlterado: "Resumo",
  async preencher(page: Page, sufixo: string, toque: boolean) {
    await page.getByLabel("Título oficial").fill(`Edital de convocação · Assembleia geral (${sufixo})`);
    await page.getByLabel("Número ou identificação").fill(`Edital ${sufixo}`);
    await page.getByLabel("Tipo de edital").selectOption({ label: "Convocação" });
    await page.getByLabel("Data do documento").fill(new Date(Date.now() - 86_400_000).toISOString().slice(0, 10));
    await page.getByLabel("Resumo").fill("Convoca os trabalhadores rodoviários para a assembleia geral.");
    await page.getByLabel("Categoria").selectOption({ label: "Assembleias" });
    const arquivo = `edital-topo-${sufixo.replace(/\W+/g, "-")}.pdf`;
    const [seletor] = await Promise.all([page.waitForEvent("filechooser"), apertar(page.getByRole("button", { name: "Enviar PDF" }), toque)]);
    await seletor.setFiles({ name: arquivo, mimeType: "application/pdf", buffer: await pdfComTexto(["EDITAL DE CONVOCACAO"]) });
    await expect(page.getByText(arquivo, { exact: true })).toBeVisible();
  },
  async publicar(page: Page, toque: boolean) {
    await apertar(page.locator("main header").first().getByRole("button", { name: "Publicar…" }), toque);
    const modal = page.getByRole("alertdialog", { name: "Publicar documento oficial?" });
    await apertar(modal.getByLabel("Confirmo que o PDF é a versão oficial e assinada"), toque);
    await apertar(modal.getByRole("button", { name: "Publicar documento" }), toque);
    await expect(page.getByText("Documento publicado.")).toBeVisible();
  },
};

const EDITORES = [NOTICIA, DOCUMENTO];

/**
 * A partir do corte (#48): título e status de um lado, botões do outro, numa linha só; o topo não
 * passa da largura; o título não é cortado e fica em até 2 linhas; o status, numa linha.
 */
async function topoNumaLinha(page: Page, testInfo: TestInfo, cabecalho: Locator) {
  const titulo = cabecalho.getByRole("heading", { level: 1 });
  const status = cabecalho.getByTestId("status-do-salvamento");
  await emCadaLargura(page, testInfo, async (largura) => {
    if (largura < RESPONSIVO.menuLateralAPartirDe) return;
    const medida = await cabecalho.evaluate((header, tolerancia) => {
      const [bloco, acoes] = [...header.children] as [HTMLElement, HTMLElement];
      const b = bloco.getBoundingClientRect();
      const a = acoes.getBoundingClientRect();
      const topos = [...acoes.querySelectorAll("button")].filter((el) => el.getClientRects().length > 0).map((el) => el.getBoundingClientRect().top);
      return {
        aoLado: a.left >= b.right - tolerancia.arredondamento && a.top < b.bottom && a.bottom > b.top,
        botoesNumaLinha: Math.max(...topos) - Math.min(...topos) < tolerancia.mesmaLinha,
        cabe: header.scrollWidth <= header.clientWidth,
      };
    }, TOLERANCIA);
    expect(medida.aoLado, `a ${largura} px, os botões ficam ao lado do título e do status`).toBe(true);
    expect(medida.botoesNumaLinha, `a ${largura} px, os botões ficam numa linha só`).toBe(true);
    expect(medida.cabe, `a ${largura} px, o topo não passa da largura`).toBe(true);
    expect(await textoCortado(titulo), `a ${largura} px, o título não é cortado`).toBe(false);
    expect(await linhasDoTexto(titulo), `a ${largura} px, o título fica em até 2 linhas`).toBeLessThanOrEqual(2);
    expect(await linhasDoTexto(status), `a ${largura} px, o status do salvamento fica numa linha`).toBe(1);
  });
}

/**
 * No topo compacto com toque (ipad e tablet deitados), Desfazer, Refazer, Pré-visualizar, Salvar,
 * Publicar e ⋯ têm área de toque de RESPONSIVO.alvoDeToque sem um cobrir o vizinho (E48, #48).
 */
async function alvosDoTopo(page: Page, toque: boolean, caso: string) {
  if (!toque) return;
  expect(await alvosPequenos(page, "main header"), `${caso}: alvos de toque pequenos no topo`).toEqual([]);
}

/** Quanto os centros dos elementos, na vertical, ficam longe um do outro (perto: estão na mesma linha). */
async function distanciaDosCentros(...elementos: Locator[]) {
  const centros = await Promise.all(
    elementos.map(async (el) => {
      const caixa = (await el.boundingBox())!;
      return caixa.y + caixa.height / 2;
    }),
  );
  return Math.max(...centros) - Math.min(...centros);
}

/** A partir do corte, a linha do PDF: o arquivo e os botões numa linha, cada botão inteiro, e nada passa da área. */
async function conferirLinhaDoPdf(page: Page, testInfo: TestInfo, area: Locator, itens: Locator[]) {
  await emCadaLargura(page, testInfo, async (largura) => {
    if (largura < RESPONSIVO.menuLateralAPartirDe) return;
    for (const item of itens) await expect(item).toBeVisible();
    expect(await distanciaDosCentros(...itens), `a ${largura} px, o arquivo e os botões ficam numa linha`).toBeLessThan(TOLERANCIA.mesmaLinha);
    const passa = await area.evaluate((el, tolerancia) => el.scrollWidth > el.clientWidth + tolerancia, TOLERANCIA.arredondamento);
    expect(passa, `a ${largura} px, nada passa da área do PDF`).toBe(false);
    for (const botao of itens.slice(1)) expect(await linhasDoTexto(botao), `a ${largura} px, o botão fica numa linha`).toBe(1);
  });
}

/** Alvos da tela com área de toque menor que RESPONSIVO.alvoDeToque, como “alvo · tamanho”. */
async function alvosPequenos(page: Page, dentro = "body") {
  const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro });
  return pequenos.map((p) => `${p.alvo} · ${p.tamanho}`);
}

for (const tema of ["claro", "escuro"] as const) {
  test.describe(`painel no tema ${tema}`, { tag: "@responsivo" }, () => {
    test.use({ colorScheme: tema === "escuro" ? "dark" : "light" });

    test("menu lateral: em tela baixa rola sem encolher os itens, sem barra na borda e com o rodapé inteiro", async ({ page, hasTouch }) => {
      await entrarComoAdm(page, "/painel", { toque: hasTouch });
      const menu = page.getByRole("navigation", { name: "Menu do painel" });

      if (telaEstreita(page)) {
        // Celular e tablet em pé: o resto do menu fica na folha do “Mais”, que rola por dentro sem
        // encolher os itens e mostra a conta inteira no fim (E49).
        await apertar(page.getByRole("navigation", { name: "Navegação do painel" }).getByRole("button", { name: "Mais" }), hasTouch);
        const folha = page.getByRole("dialog", { name: "Mais" });
        await expect(folha).toBeVisible();
        await semAnimacao(page);
        // O corpo da folha é o que rola (encolhe de propósito); os itens dentro dele, não.
        expect(await itensEsmagados(folha.locator("[data-slot=drawer-body]")), "nenhum item do “Mais” encolhe").toEqual([]);
        const nome = folha.getByText(pessoas.adm.nome, { exact: true });
        await nome.scrollIntoViewIfNeeded();
        await expect(nome).toBeInViewport({ ratio: 1 });
        await expect(folha.getByRole("button", { name: "Sair do painel" })).toBeInViewport({ ratio: 1 });
        expect(await textoCortado(nome), "o nome aparece inteiro, sem reticências").toBe(false);
        return;
      }
      // Menu lateral fixo: na tela baixa da varredura (e no tamanho do próprio perfil).
      const { width, height } = page.viewportSize()!;
      await page.setViewportSize({ width, height: Math.min(height, ALTURA_BAIXA) });
      await expect(menu).toBeVisible();
      await assentar(page);

      expect(await itensEsmagados(menu), "nenhum item do menu encolhe").toEqual([]);
      const criar = menu.getByRole("button", { name: "Criar conteúdo" });
      await expect(criar).toBeVisible();
      expect(await larguraDaBarra(menu), "a barra de rolagem não ocupa espaço na borda do menu").toBe(0);

      // Sem a barra, um esmaecido no pé do menu mostra que há itens abaixo; no fim, ele some.
      const esmaecido = menu.getByTestId("menu-tem-mais-abaixo");
      const rola = await menu.evaluate((nav) => nav.scrollHeight > nav.clientHeight);
      if (rola) await expect(esmaecido, "o menu rola: o pé dele esmaece").toBeAttached();
      else await expect(esmaecido, "o menu não rola: nada esmaece").toHaveCount(0);

      // O rodapé, com nome e perfil, aparece inteiro quando se rola o menu até o fim.
      const nome = menu.getByText(pessoas.adm.nome, { exact: true });
      await nome.scrollIntoViewIfNeeded();
      await expect(nome).toBeInViewport({ ratio: 1 });
      const perfil = menu.getByText("Administrador geral", { exact: true });
      await expect(perfil).toBeInViewport({ ratio: 1 });
      await expect(esmaecido, "rolado até o fim, o esmaecido some").toHaveCount(0);
      expect(await textoCortado(nome), "o nome aparece inteiro, sem reticências").toBe(false);
      expect(await textoCortado(perfil), "o perfil aparece inteiro, sem reticências").toBe(false);
    });

    test("Conteúdos: a partir do corte, o título e Lista/Calendário/Criar ficam numa linha, e a busca e os filtros em outra (#48)", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel/conteudos", { toque: hasTouch });
      // Abaixo do menu lateral, criar é pelo “+” da barra de baixo e os filtros ficam numa folha (E49; e2e/conteudos-celular.spec.ts).
      test.skip(telaEstreita(page), "no celular e no tablet em pé, o topo de Conteúdos não tem esses botões");
      const cabecalho = page.locator("main header").first();
      const titulo = cabecalho.getByRole("heading", { level: 1, name: "Conteúdos" });
      const modo = cabecalho.getByRole("navigation", { name: "Modo de ver" });
      const criar = cabecalho.getByRole("button", { name: "Criar conteúdo" });
      const busca = page.getByRole("search");
      const filtros = page.locator("main select:visible");
      await expect(criar).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        if (largura < RESPONSIVO.menuLateralAPartirDe) {
          // Abaixo do corte, o topo continua o do Figma mobile (E49): o título e o ícone do calendário, numa linha.
          const calendario = cabecalho.getByRole("link", { name: "Ver calendário" });
          await expect(calendario).toBeVisible();
          expect(await distanciaDosCentros(titulo, calendario), `a ${largura} px, o título e o calendário ficam numa linha`).toBeLessThan(TOLERANCIA.mesmaLinha);
          return;
        }
        expect(await distanciaDosCentros(titulo, modo, criar), `a ${largura} px, o título, Lista/Calendário e “Criar conteúdo” ficam numa linha`).toBeLessThan(
          TOLERANCIA.mesmaLinha,
        );
        await expect(filtros).toHaveCount(3);
        expect(await distanciaDosCentros(busca, ...(await filtros.all())), `a ${largura} px, a busca e os filtros ficam numa linha`).toBeLessThan(TOLERANCIA.mesmaLinha);
        await semRolagemLateral(page);
      });
    });

    test("Conteúdos, lista: “No site” e “Atualizado” ficam numa linha (#48)", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, NOTICIA.endereco, { toque: hasTouch });
      test.skip(telaEstreita(page), "no celular e no tablet em pé, a linha vira cartão, sem essas colunas");
      // Uma notícia publicada pela tela, para a coluna “No site” ter data.
      const sufixo = `${testInfo.project.name}, tema ${tema}, tentativa ${testInfo.retry}, ${Date.now()}`;
      await NOTICIA.preencher(page, sufixo, hasTouch);
      await salvo(page);
      await NOTICIA.publicar(page, hasTouch);
      await page.goto("/painel/conteudos");
      const linha = page.getByRole("row").filter({ has: page.getByRole("link", { name: `Assembleia geral dos rodoviários (${sufixo})`, exact: true }) });
      await expect(linha).toBeVisible();
      const colunas = (await page.locator("main thead th").allTextContents()).map((texto) => texto.trim());

      await emCadaLargura(page, testInfo, async (largura) => {
        if (largura < RESPONSIVO.menuLateralAPartirDe) return;
        for (const nome of ["No site", "Atualizado"]) {
          const cabecalho = page.getByRole("columnheader", { name: nome, exact: true });
          // “No site” só aparece no xl.
          if (!(await cabecalho.isVisible())) continue;
          const celula = linha.locator("td").nth(colunas.indexOf(nome));
          expect(await linhasDoTexto(cabecalho), `a ${largura} px, o cabeçalho “${nome}” fica numa linha`).toBe(1);
          expect(await linhasDoTexto(celula), `a ${largura} px, “${nome}” fica numa linha`).toBe(1);
        }
      });
    });

    test("Conteúdos, lista: “Publicado” e “Prazo” ficam numa linha (#51)", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, DOCUMENTO.endereco, { toque: hasTouch });
      test.skip(telaEstreita(page), "no celular e no tablet em pé, a linha vira cartão, sem a coluna Estado");
      // Um edital publicado pela tela, com o evento daqui a 5 dias: o selo de vigência é “Prazo” (C2).
      const sufixo = `${testInfo.project.name}, tema ${tema}, tentativa ${testInfo.retry}, ${Date.now()}`;
      await DOCUMENTO.preencher(page, sufixo, hasTouch);
      await page.getByLabel("Data do evento ou prazo").fill(new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10));
      await page.getByLabel("Hora do evento ou prazo").fill("19:00");
      await salvo(page);
      await DOCUMENTO.publicar(page, hasTouch);
      await page.goto("/painel/conteudos");
      const linha = page.getByRole("row").filter({ hasText: sufixo });
      const publicado = linha.getByTestId("selo-estado");
      const prazo = linha.getByText("Vigência: Prazo");
      await expect(publicado).toHaveText("Publicado");
      await expect(prazo).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        if (largura < RESPONSIVO.menuLateralAPartirDe) return;
        expect.soft(await distanciaDosCentros(publicado, prazo), `a ${largura} px, “Publicado” e “Prazo” ficam numa linha`).toBeLessThan(TOLERANCIA.mesmaLinha);
        await semRolagemLateral(page);
      });
    });

    test("editor de notícia: a barra de formatação do corpo fica numa linha (#51)", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, NOTICIA.endereco, { toque: hasTouch });
      const barra = barraDoCorpo(page);
      await expect(barra).toBeVisible();
      const conferir = async (onde: string) => {
        const medida = await barra.evaluate((el, tolerancia) => {
          const centros = [...el.querySelectorAll("button, select")]
            .filter((item) => item.getClientRects().length > 0)
            .map((item) => {
              const r = item.getBoundingClientRect();
              return r.top + r.height / 2;
            });
          return { numaLinha: Math.max(...centros) - Math.min(...centros) < tolerancia, cabe: el.scrollWidth <= el.clientWidth };
        }, TOLERANCIA.mesmaLinha);
        expect.soft(medida.numaLinha, `${onde}, a barra do corpo fica numa linha`).toBe(true);
        expect.soft(medida.cabe, `${onde}, nada passa da barra do corpo`).toBe(true);
        if (hasTouch) expect.soft(await alvosPequenos(page, "[role=toolbar]"), `${onde}, alvos de toque pequenos na barra`).toEqual([]);
      };
      await emCadaLargura(page, testInfo, (largura) => conferir(`a ${largura} px`));

      // Girar o tablet sem recarregar: a barra muda de degrau e continua numa linha.
      const giro = tabletQueGira(testInfo.project.name);
      if (giro) {
        for (const [posicao, janela] of [["deitado", giro.deitado], ["em pé", giro.emPe]] as const) {
          await page.setViewportSize(janela);
          await assentar(page);
          await conferir(`com o tablet ${posicao}`);
        }
      }
    });

    test("editor de notícia: o “Mais” da barra do corpo lista só o que está escondido e aplica o formato (#51)", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, NOTICIA.endereco, { toque: hasTouch });
      const barra = barraDoCorpo(page);
      const mais = barra.getByRole("button", { name: "Mais formatação" });
      const menu = page.getByRole("menu", { name: "Mais formatação" });
      await expect(barra).toBeVisible();

      // Em cada largura, o menu tem exatamente as ferramentas que não aparecem na barra; sem nenhuma escondida, não há ⋯.
      await emCadaLargura(page, testInfo, async (largura) => {
        const escondidas: string[] = [];
        for (const nome of FERRAMENTAS_DO_CORPO) {
          const naBarra = barra.getByRole(nome === "Estilo do parágrafo" ? "combobox" : "button", { name: nome, exact: true });
          if (!(await naBarra.isVisible())) escondidas.push(nome);
        }
        if (escondidas.length === 0) {
          await expect(mais, `a ${largura} px, tudo cabe e o ⋯ não aparece`).toBeHidden();
          return;
        }
        await apertar(mais, hasTouch);
        await expect(menu).toBeVisible();
        const noMenu = await menu.locator("[role=menuitem], [role=menuitemcheckbox], [role=group]").evaluateAll((itens) => itens.map((item) => item.getAttribute("aria-label") ?? ""));
        expect.soft(noMenu.toSorted(), `a ${largura} px, o ⋯ lista só o que está escondido na barra`).toEqual(escondidas.toSorted());
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
      });

      // Na janela mais estreita da varredura (no desktop) ou no próprio perfil, aplica a citação pelo ⋯ ou pela barra.
      if (testInfo.project.name === "chromium") {
        await page.setViewportSize({ width: RESPONSIVO.varredura.de, height: page.viewportSize()!.height });
        await assentar(page);
      }
      const corpo = page.getByRole("textbox", { name: "Corpo da notícia" });
      await apertar(corpo, hasTouch);
      await page.keyboard.type("A assembleia aprovou a pauta.");
      // Na largura de um celular, as ferramentas não cabem todas numa linha com a área de toque: o ⋯ aparece e a citação vai por ele.
      const comoCelular = page.viewportSize()!.width <= RESPONSIVO.perfis.celular.largura;
      if (comoCelular) await expect(mais, "na largura de um celular, nem tudo cabe: o ⋯ aparece").toBeVisible();
      const paraCitar = await ferramentaDoCorpo(page, "Citação", hasTouch);
      if (comoCelular) expect(paraCitar.noMenu, "na largura de um celular, a citação fica no ⋯").toBe(true);
      await apertar(paraCitar.alvo, hasTouch);
      await expect(corpo.locator("blockquote"), "a citação vai para o corpo").toHaveText("A assembleia aprovou a pauta.");
      await expect(corpo, "o cursor volta para o corpo").toBeFocused();
      const citacao = await ferramentaDoCorpo(page, "Citação", hasTouch);
      await expect(citacao.alvo).toHaveAttribute(citacao.noMenu ? "aria-checked" : "aria-pressed", "true");
      await citacao.fechar();

      // Link pelo ⋯ (ou pela barra) abre o diálogo de sempre.
      await usarFerramentaDoCorpo(page, "Link", hasTouch);
      const dialogoLink = page.getByRole("dialog", { name: "Link" });
      await expect(dialogoLink).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialogoLink).toBeHidden();

      // Com o teclado: Enter abre o ⋯, as setas andam e Esc fecha e devolve o foco ao ⋯.
      if (!hasTouch && (await mais.isVisible())) {
        await mais.focus();
        await page.keyboard.press("Enter");
        await expect(menu).toBeVisible();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await expect(mais).toBeFocused();
      }
    });

    for (const editor of EDITORES) {
      test(`editor de ${editor.nome}: cabeçalho sem nada sobreposto, título legível e “Salvo automaticamente” em até 2 linhas`, async ({ page, hasTouch }, testInfo) => {
        await entrarComoAdm(page, editor.endereco, { toque: hasTouch });
        await page.getByLabel(editor.campo).fill("Assembleia geral dos rodoviários");
        const status = page.getByTestId("status-do-salvamento");
        await expect(status).toContainText("Salvo automaticamente às");
        const cabecalho = page.locator("main header").first();
        const titulo = cabecalho.getByRole("heading", { level: 1 });
        // No topo compacto do celular (E49), o estado fica no resumo da Publicação, e não no topo.
        if (!telaEstreita(page)) await expect(cabecalho.getByTestId("selo-estado")).toBeVisible();

        await emCadaLargura(page, testInfo, async (largura) => {
          expect(
            await caixasQueSeCruzam(cabecalho, "h1, [data-testid=selo-estado], [data-testid=status-do-salvamento], a, button"),
            `a ${largura} px, nada se sobrepõe no cabeçalho`,
          ).toEqual([]);
          expect(await textoCortado(titulo), `a ${largura} px, o título não é cortado`).toBe(false);
          // Abaixo do lg o texto é o curto (“Salvo às …”), que cabe numa linha.
          expect(await linhasDoTexto(status), `a ${largura} px, o status do salvamento não passa de 2 linhas`).toBeLessThanOrEqual(2);
        });
      });

      test(`editor de ${editor.nome}: a partir do corte, título, status e botões ficam numa linha só, também já publicado (#48)`, async ({ page, hasTouch }, testInfo) => {
        await entrarComoAdm(page, editor.endereco, { toque: hasTouch });
        // Abaixo do corte, Salvar e Publicar ficam na barra de baixo (E49; e2e/publicar-pelo-celular.spec.ts).
        test.skip(telaEstreita(page), "no celular e no tablet em pé, o topo é o compacto do E49");
        const cabecalho = page.locator("main header").first();

        // Rascunho salvo e completo: o topo ganha o ⋯.
        await editor.preencher(page, `${testInfo.project.name}, tema ${tema}, tentativa ${testInfo.retry}, ${Date.now()}`, hasTouch);
        await salvo(page);
        // Os nomes acessíveis não mudam quando o rótulo encurta (WCAG 2.5.3: o visível está contido no nome).
        await expect(cabecalho.getByRole("button", { name: "Salvar rascunho" })).toBeVisible();
        await expect(cabecalho.getByRole("button", { name: "Pré-visualizar" })).toBeVisible();
        await expect(cabecalho.getByRole("button", { name: "Publicar…" })).toBeVisible();
        await expect(cabecalho.getByRole("button", { name: "Mais ações" })).toBeVisible();
        await topoNumaLinha(page, testInfo, cabecalho);
        await alvosDoTopo(page, hasTouch, "rascunho");

        // O pior caso: já publicado e com alterações, com “Publicar alterações…” e o ⋯ no topo.
        await editor.publicar(page, hasTouch);
        await page.getByLabel(editor.campoAlterado).fill("Texto revisto depois de publicar, para gerar alterações no site.");
        await salvo(page);
        const publicarAlteracoes = cabecalho.getByRole("button", { name: "Publicar alterações…" });
        await expect(publicarAlteracoes).toBeVisible();
        await expect(publicarAlteracoes, "com alterações, o botão não fica travado").not.toHaveAttribute("aria-disabled", "true");
        await expect(cabecalho.getByRole("button", { name: "Salvar", exact: true })).toBeVisible();
        await expect(cabecalho.getByRole("button", { name: "Mais ações" })).toBeVisible();
        await topoNumaLinha(page, testInfo, cabecalho);
        await alvosDoTopo(page, hasTouch, "publicado com alterações");
      });
    }

    test("editor de documento: a partir do corte, “Enviar PDF” e o arquivo ficam numa linha (#48)", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, DOCUMENTO.endereco, { toque: hasTouch });
      // No celular e no tablet em pé, o arquivo fica numa seção que abre ao tocar (E49; e2e/publicar-pelo-celular.spec.ts).
      test.skip(telaEstreita(page), "abaixo do corte, o arquivo fica na seção que abre ao tocar");
      const enviar = page.getByRole("button", { name: "Enviar PDF" });
      const semArquivo = page.getByText("Nenhum PDF enviado", { exact: true });
      // O bloco de texto inteiro (nome e explicação), e não só a 1ª linha dele.
      await conferirLinhaDoPdf(page, testInfo, semArquivo.locator("xpath=../.."), [semArquivo.locator(".."), enviar]);

      // Com o PDF enviado (pelo botão, como a pessoa faria): Visualizar e Substituir.
      await page.getByLabel("Título oficial").fill(`Edital de convocação (${testInfo.project.name}, tema ${tema}, ${Date.now()})`);
      await salvo(page);
      const arquivo = `edital-linha-${testInfo.project.name}-${tema}-${Date.now()}.pdf`;
      const [seletor] = await Promise.all([page.waitForEvent("filechooser"), apertar(enviar, hasTouch)]);
      await seletor.setFiles({ name: arquivo, mimeType: "application/pdf", buffer: await pdfComTexto(["EDITAL DE CONVOCACAO"]) });
      const nome = page.getByText(arquivo, { exact: true });
      await expect(nome).toBeVisible();
      await conferirLinhaDoPdf(page, testInfo, nome.locator("xpath=../.."), [
        nome.locator(".."),
        page.getByRole("link", { name: "Visualizar" }),
        page.getByRole("button", { name: "Substituir" }),
      ]);
    });

    test("editor de documento: “Texto pesquisável” tem altura máxima e rola por dentro, sem empurrar a página", async ({ page, hasTouch }) => {
      await entrarComoAdm(page, "/painel/conteudos/documento/nova?tipo=edital", { toque: hasTouch });
      // No celular e no tablet em pé, o arquivo fica numa seção que abre ao tocar (E49).
      if (telaEstreita(page)) await apertar(page.getByRole("button", { name: /^Arquivo oficial/ }), hasTouch);
      const campo = page.getByLabel("Texto pesquisável");
      const alturaDaPagina = () => page.evaluate(() => document.documentElement.scrollHeight);
      const antes = await alturaDaPagina();

      // Um PDF de várias páginas traz centenas de linhas de texto.
      await campo.fill(Array.from({ length: 300 }, (_, i) => `Cláusula ${i + 1}: reajuste salarial dos rodoviários.`).join("\n"));
      const { rola, escondido } = await campo.evaluate((el) => ({ rola: el.scrollHeight > el.clientHeight, escondido: el.scrollHeight - el.clientHeight }));
      expect(rola, "o campo rola por dentro").toBe(true);
      expect((await alturaDaPagina()) - antes, "a página quase não cresce: o texto fica dentro do campo").toBeLessThan(escondido);
      const caixa = (await campo.boundingBox())!;
      expect(caixa.height, "o campo cabe na tela").toBeLessThan(page.viewportSize()!.height);
    });

    test("Conteúdos, lista: o título usa o espaço livre da linha antes de cortar com reticências, sem vazar sobre o autor", async ({ page, hasTouch }, testInfo) => {
      const manchete = `Assembleia geral aprova a pauta de reajuste dos rodoviários (${tema}, ${testInfo.project.name})`;
      await entrarComoAdm(page, "/painel/conteudos/noticia/nova", { toque: hasTouch });
      await page.getByLabel("Manchete").fill(manchete);
      await expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");
      await page.goto("/painel/conteudos");
      const titulo = page.getByRole("link", { name: manchete, exact: true });
      await expect(titulo).toBeVisible();
      // A linha de baixo do título: categoria e autor.
      const autor = titulo.locator("xpath=following-sibling::*[1]");

      await emCadaLargura(page, testInfo, async (largura) => {
        const medida = await titulo.evaluate((link, tolerancia) => {
          const linha = link.closest("tr")!;
          // No celular a linha vira cartão e o título ocupa a largura toda: não há colunas para comparar.
          if (getComputedStyle(linha).display !== "table-row") return { cortado: false, sobra: 0 };
          const celulaDoTitulo = link.closest("td")!;
          // Espaço livre de cada outra coluna: a largura de dentro da célula menos a do conteúdo.
          const sobra = [...linha.children]
            .filter((td) => td !== celulaDoTitulo && td.getClientRects().length > 0)
            .reduce((total, td) => {
              const estilo = getComputedStyle(td);
              const dentro = td.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
              const intervalo = document.createRange();
              intervalo.selectNodeContents(td);
              return total + Math.max(0, dentro - intervalo.getBoundingClientRect().width);
            }, 0);
          // O corte é medido na caixa que esconde o que passa (o link ou o texto dentro dele).
          const caixa = [link, ...link.querySelectorAll("*")].find((el) => getComputedStyle(el).overflow !== "visible") ?? link;
          return { cortado: caixa.scrollWidth > caixa.clientWidth + tolerancia, sobra };
        }, TOLERANCIA.arredondamento);
        expect(await textoVisivelCruza(titulo, autor), `a ${largura} px, o título não vaza por cima da linha do autor`).toBe(false);
        if (medida.cortado) {
          expect(medida.sobra, `a ${largura} px, o título foi cortado com ${Math.round(medida.sobra)} px livres nas outras colunas`).toBeLessThan(TOLERANCIA.sobraDesprezivel);
        }
      });
    });

    test("Equipe: as iniciais do avatar têm contraste de pelo menos 4,5:1 (RNF09, #48)", async ({ page, hasTouch }) => {
      await entrarComoAdm(page, "/painel/equipe", { toque: hasTouch });
      const avatares = page.getByTestId("avatar-da-pessoa");
      // O ADM (“você”, no amarelo) e pelo menos mais uma pessoa da equipe (no fundo neutro).
      await expect(avatares.nth(1)).toBeVisible();
      for (const avatar of await avatares.all()) {
        const iniciais = (await avatar.textContent())?.trim();
        expect(await contraste(avatar), `as iniciais “${iniciais}” têm contraste de pelo menos ${CONTRASTE_MINIMO}:1`).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
      }
    });

    test("Equipe: “Último acesso” aparece inteiro, sem reticências (#51)", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel/equipe", { toque: hasTouch });
      const ultimosAcessos = page.getByRole("cell").getByText(/^Último acesso:/);
      await expect(page.getByRole("table", { name: "Equipe" })).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        // Entre o md e o xl, “Último acesso: …” fica embaixo do e-mail; fora dessa faixa, é coluna (ou linha do cartão).
        for (const texto of await ultimosAcessos.all()) {
          if (!(await texto.isVisible())) continue;
          expect.soft(await textoCortado(texto), `a ${largura} px, “${(await texto.textContent())?.trim()}” aparece inteiro`).toBe(false);
        }
        await semRolagemLateral(page);
      });
    });

    test("Equipe: a coluna Pessoa nunca some e o nome e o e-mail são os últimos a encolher", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel/equipe", { toque: hasTouch });
      // Uma pessoa de nome e e-mail longos, convidada pela tela.
      const longo = {
        nome: "Maria Aparecida dos Santos Oliveira",
        email: `maria.aparecida.santos.oliveira.${tema}.${testInfo.project.name}.${Date.now()}@sintravc.local`,
      };
      await apertar(page.getByRole("button", { name: "Convidar pessoa" }), hasTouch);
      const modal = page.getByRole("dialog", { name: "Convidar pessoa" });
      await modal.getByLabel("Nome *").fill(longo.nome);
      await modal.getByLabel("E-mail de trabalho *").fill(longo.email);
      await apertar(modal.getByText("Comunicação", { exact: true }), hasTouch);
      await apertar(modal.getByRole("button", { name: "Enviar convite" }), hasTouch);
      // O convite sai por e-mail (Mailpit) antes de o diálogo fechar: pode passar de 5 s.
      await expect(page.getByText(`Convite enviado para ${longo.email}.`)).toBeVisible({ timeout: 20_000 });
      await expect(modal).toBeHidden();

      const nome = page.getByRole("cell").getByText(pessoas.adm.nome, { exact: true });
      const email = page.getByRole("cell").getByText(pessoas.adm.email, { exact: true });
      const linhaLonga = page.getByRole("row").filter({ hasText: longo.email });
      await expect(linhaLonga).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        await expect(nome, `a ${largura} px, a coluna Pessoa aparece`).toBeVisible();
        expect(await textoCortado(nome), `a ${largura} px, o nome aparece inteiro`).toBe(false);
        expect(await textoCortado(email), `a ${largura} px, o e-mail aparece inteiro`).toBe(false);

        // Nome e e-mail longos só são cortados quando as outras colunas já encolheram ao mínimo.
        const medida = await linhaLonga.evaluate((linha, tolerancia) => {
          // No celular a linha vira cartão: cada coluna fica numa linha própria, nada disputa a largura.
          if (getComputedStyle(linha).display !== "grid") return null;
          const visiveis = (l: Element) => [...l.children].filter((c) => c.getClientRects().length > 0) as HTMLElement[];
          const textos = [...visiveis(linha)[0]!.querySelectorAll("p")].slice(0, 2);
          const cortado = textos.some((p) => p.scrollWidth > p.clientWidth + tolerancia);
          // O mínimo de cada coluna: a largura dela com a tabela espremida até onde a grade deixa.
          const larguras = () => visiveis(linha).map((c) => c.getBoundingClientRect().width);
          const agora = larguras();
          const tabela = linha.parentElement!;
          const antes = tabela.style.width;
          tabela.style.width = "0px";
          const minimos = larguras();
          tabela.style.width = antes;
          const comFolga = agora.slice(1).flatMap((largura, i) => {
            const minimo = minimos[i + 1] ?? largura;
            return largura - minimo > tolerancia ? [`coluna ${i + 2}: ${Math.round(largura)} px, mínimo ${Math.round(minimo)} px`] : [];
          });
          return { cortado, comFolga };
        }, TOLERANCIA.arredondamento);
        if (medida?.cortado) {
          expect(medida.comFolga, `a ${largura} px, o nome ou o e-mail foi cortado com folga nas outras colunas`).toEqual([]);
        }
      });
    });

    test("no toque, “Destacar na Home” e “Baixar PDF” têm a área de toque mínima (#51)", async ({ page, hasTouch }, testInfo) => {
      test.skip(!hasTouch, "só nos perfis com toque");
      await entrarComoAdm(page, NOTICIA.endereco, { toque: hasTouch });
      // Abaixo do corte, Salvar e Publicar ficam na barra de baixo (já conferida em e2e/publicar-pelo-celular.spec.ts).
      test.skip(telaEstreita(page), "a área de toque dos deitados (ipad e tablet); abaixo do corte o editor é o compacto do E49");
      const sufixo = `${testInfo.project.name}, tema ${tema}, tentativa ${testInfo.retry}, ${Date.now()}`;
      const pequenosCom = async (nome: string) => (await alvosPequenos(page)).filter((alvo) => alvo.includes(nome));

      // Notícia publicada pela tela: “Destacar na Home” fica ativo.
      await NOTICIA.preencher(page, sufixo, hasTouch);
      await salvo(page);
      await NOTICIA.publicar(page, hasTouch);
      await expect(page.getByRole("link", { name: "Destacar na Home" })).toBeVisible();
      expect.soft(await pequenosCom("Destacar na Home"), "“Destacar na Home” com área de toque pequena").toEqual([]);

      // Edital com o PDF enviado pelo botão: aparece “Baixar PDF”.
      await page.goto(DOCUMENTO.endereco);
      await DOCUMENTO.preencher(page, sufixo, hasTouch);
      await salvo(page);
      await expect(page.getByRole("link", { name: "Baixar PDF" })).toBeVisible();
      expect.soft(await pequenosCom("Baixar PDF"), "“Baixar PDF” com área de toque pequena").toEqual([]);
    });

    test("editor de documento: o rótulo do tipo não quebra dentro da pílula", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel/conteudos/documento/nova?tipo=acordo", { toque: hasTouch });
      const tipos = page.getByRole("navigation", { name: "Tipo de conteúdo" });
      await expect(tipos.getByText("Acordo ou convenção")).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        for (const rotulo of ["Notícia", "Edital", "Acordo ou convenção"]) {
          expect(await linhasDoTexto(tipos.getByText(rotulo, { exact: true })), `a ${largura} px, “${rotulo}” fica em uma linha`).toBe(1);
        }
      });
    });

    test("no toque, links, caixas de seleção, ícones e botões têm a área de toque mínima", async ({ page, hasTouch }, testInfo) => {
      test.skip(!hasTouch, "só nos perfis com toque (celular e tablet)");
      await entrarComoAdm(page, "/painel/midia", { toque: hasTouch });
      // Arquivos próprios na Mídia (logo em PNG e foto em JPG), sem depender de outro teste.
      // Com a tentativa no nome: na segunda, os arquivos da primeira já estão na Mídia.
      const sufixo = `${tema}-${testInfo.project.name}-${testInfo.retry}`;
      const cor = { width: 320, height: 200, channels: 3 as const, background: "#02488d" };
      // O campo de arquivo já vem no HTML: antes de a página carregar os scripts, a escolha se perde.
      await page.waitForLoadState("networkidle");
      await page.getByTestId("entrada-arquivos").setInputFiles([
        { name: `logo-toque-${sufixo}.png`, mimeType: "image/png", buffer: await sharp({ create: cor }).png().toBuffer() },
        { name: `foto-toque-${sufixo}.jpg`, mimeType: "image/jpeg", buffer: await sharp({ create: cor }).jpeg().toBuffer() },
      ]);
      await expect(page.getByText(`logo-toque-${sufixo}.png está na Mídia.`)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(`foto-toque-${sufixo}.jpg está na Mídia.`)).toBeVisible({ timeout: 20_000 });

      // Uma notícia na lista, para conferir as caixas de seleção e os ícones de cada linha.
      await page.goto("/painel/conteudos/noticia/nova");
      await page.getByLabel("Manchete").fill(`Plantão jurídico no toque (${sufixo})`);
      await expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");
      await expect(page).toHaveURL(/\/painel\/conteudos\/noticia\/[0-9a-f-]+$/);
      const noticia = new URL(page.url()).pathname;

      const porTela: Record<string, string[]> = {};
      const medir = async (onde: string) => {
        await semAnimacao(page);
        const pequenos = await alvosPequenos(page);
        if (pequenos.length > 0) porTela[onde] = pequenos;
      };
      for (const endereco of [
        "/painel",
        "/painel/conteudos",
        "/painel/conteudos?visao=calendario",
        noticia,
        "/painel/conteudos/documento/nova?tipo=edital",
        "/painel/equipe",
        "/painel/midia",
      ]) {
        await page.goto(endereco);
        await page.waitForLoadState("networkidle");
        await medir(endereco);
      }

      // Diálogos do editor de notícia: o seletor de mídia (com os arquivos acima) e “Adicionar link”.
      await page.goto(noticia);
      await apertar(page.getByRole("textbox", { name: "Corpo da notícia" }), hasTouch);
      await usarFerramentaDoCorpo(page, "Imagem da Mídia", hasTouch);
      const seletor = page.getByRole("dialog", { name: "Imagem no corpo da notícia" });
      await expect(seletor.getByRole("button", { name: new RegExp(`logo-toque-${sufixo}`) })).toBeVisible();
      await medir("seletor de mídia");
      await page.keyboard.press("Escape");
      await expect(seletor).toBeHidden();

      // No celular e no tablet em pé, Fontes fica numa seção que abre ao tocar (E49).
      if (telaEstreita(page)) await apertar(page.getByRole("button", { name: /^Fontes, links e anexos/ }), hasTouch);
      await apertar(page.getByRole("button", { name: "Adicionar link" }), hasTouch);
      const link = page.getByRole("dialog", { name: "Adicionar link" });
      await expect(link).toBeVisible();
      await medir("diálogo “Adicionar link”");
      await page.keyboard.press("Escape");
      await expect(link).toBeHidden();

      if (telaEstreita(page)) {
        const barra = page.getByRole("navigation", { name: "Navegação do painel" });
        await page.goto("/painel");
        await medir("barra de baixo e topo");
        await apertar(barra.getByRole("button", { name: "Mais" }), hasTouch);
        await expect(page.getByRole("dialog", { name: "Mais" })).toBeVisible();
        await medir("“Mais” aberto");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog", { name: "Mais" })).toBeHidden();
        await apertar(barra.getByRole("button", { name: "Criar conteúdo" }), hasTouch);
        await expect(page.getByRole("dialog", { name: "Criar conteúdo" })).toBeVisible();
        await medir("“+” aberto");
      }
      expect(porTela, `alvos com área de toque menor que ${RESPONSIVO.alvoDeToque} px, por tela`).toEqual({});
    });
  });
}
