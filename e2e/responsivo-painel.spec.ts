import { expect, test } from "@playwright/test";

import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import {
  ALTURA_BAIXA,
  ALVO_DE_TOQUE,
  assentar,
  caixasQueSeCruzam,
  emCadaLargura,
  entrarComoAdm,
  itensEsmagados,
  larguraDaBarra,
  linhasDoTexto,
  menuPeloBotao,
  pessoas,
  textoCortado,
  textoVisivelCruza,
} from "./responsivo";

/**
 * Correções de responsividade do painel (issue #44, E48). Roda no desktop e em cada perfil de
 * RESPONSIVO do playwright.config.ts, nos temas claro e escuro.
 */

// Sem --hide-scrollbars: a barra de rolagem de um menu precisa aparecer para se medir o espaço dela.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const tema of ["claro", "escuro"] as const) {
  test.describe(`painel no tema ${tema}`, { tag: "@responsivo" }, () => {
    test.use({ colorScheme: tema === "escuro" ? "dark" : "light" });

    test("menu lateral: em tela baixa rola sem encolher os itens, sem barra na borda e com o rodapé inteiro", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel", { toque: hasTouch });
      const menu = page.getByRole("navigation", { name: "Menu do painel" });

      if (menuPeloBotao(testInfo)) {
        // Celular e tablet em pé: o menu abre por cima da tela inteira.
        await apertar(page.getByRole("button", { name: "Menu", exact: true }), hasTouch);
      } else {
        // Menu lateral fixo: na tela baixa da varredura (e no tamanho do próprio perfil).
        const { width, height } = page.viewportSize()!;
        await page.setViewportSize({ width, height: Math.min(height, ALTURA_BAIXA) });
      }
      await expect(menu).toBeVisible();
      await assentar(page);

      expect(await itensEsmagados(menu), "nenhum item do menu encolhe").toEqual([]);
      const criar = menu.getByRole("button", { name: "Criar conteúdo" });
      await expect(criar).toBeVisible();
      expect(await larguraDaBarra(menu), "a barra de rolagem não ocupa espaço na borda do menu").toBe(0);

      // O rodapé, com nome e perfil, aparece inteiro quando se rola o menu até o fim.
      const nome = menu.getByText(pessoas.adm.nome, { exact: true });
      await nome.scrollIntoViewIfNeeded();
      await expect(nome).toBeInViewport({ ratio: 1 });
      const perfil = menu.getByText("Administrador geral", { exact: true });
      await expect(perfil).toBeInViewport({ ratio: 1 });
      expect(await textoCortado(nome), "o nome aparece inteiro, sem reticências").toBe(false);
      expect(await textoCortado(perfil), "o perfil aparece inteiro, sem reticências").toBe(false);
    });

    test("Conteúdos: “Criar conteúdo” fica ao lado de Lista/Calendário e só desce quando falta espaço", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel/conteudos", { toque: hasTouch });
      const cabecalho = page.locator("main header").first();
      const modo = cabecalho.getByRole("navigation", { name: "Modo de ver" });
      const criar = cabecalho.getByRole("button", { name: "Criar conteúdo" });
      await expect(criar).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        const medida = await cabecalho.evaluate((header) => {
          const nav = header.querySelector("nav[aria-label='Modo de ver']")!.getBoundingClientRect();
          const botao = [...header.querySelectorAll("button")].find((b) => b.textContent?.includes("Criar conteúdo"))!;
          const b = botao.getBoundingClientRect();
          const grupo = getComputedStyle(botao.parentElement!);
          const vao = parseFloat(grupo.columnGap) || 0;
          return { mesmaLinha: Math.abs(nav.top - b.top) < 8, cabe: nav.width + vao + b.width <= header.clientWidth };
        });
        expect(medida.mesmaLinha || !medida.cabe, `a ${largura} px, “Criar conteúdo” desceu embora coubesse ao lado`).toBe(true);
      });
      await expect(modo).toBeVisible();
    });

    for (const editor of [
      { nome: "notícia", endereco: "/painel/conteudos/noticia/nova", campo: "Manchete" },
      { nome: "documento", endereco: "/painel/conteudos/documento/nova?tipo=edital", campo: "Título oficial" },
    ]) {
      test(`editor de ${editor.nome}: cabeçalho sem nada sobreposto, título legível e “Salvo automaticamente” em até 2 linhas`, async ({ page, hasTouch }, testInfo) => {
        await entrarComoAdm(page, editor.endereco, { toque: hasTouch });
        await page.getByLabel(editor.campo).fill("Assembleia geral dos rodoviários");
        const status = page.getByTestId("status-do-salvamento");
        await expect(status).toContainText("Salvo automaticamente às");
        const cabecalho = page.locator("main header").first();
        const titulo = cabecalho.getByRole("heading", { level: 1 });

        await emCadaLargura(page, testInfo, async (largura) => {
          expect(await caixasQueSeCruzam(cabecalho, "h1, [data-testid=status-do-salvamento], a, button"), `a ${largura} px, nada se sobrepõe no cabeçalho`).toEqual([]);
          expect(await textoCortado(titulo), `a ${largura} px, o título não é cortado`).toBe(false);
          expect(await linhasDoTexto(status), `a ${largura} px, “Salvo automaticamente” não passa de 2 linhas`).toBeLessThanOrEqual(2);
        });
      });
    }

    test("editor de documento: “Texto pesquisável” tem altura máxima e rola por dentro, sem empurrar a página", async ({ page, hasTouch }) => {
      await entrarComoAdm(page, "/painel/conteudos/documento/nova?tipo=edital", { toque: hasTouch });
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
        const medida = await titulo.evaluate((link) => {
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
          return { cortado: caixa.scrollWidth > caixa.clientWidth + 1, sobra };
        });
        expect(await textoVisivelCruza(titulo, autor), `a ${largura} px, o título não vaza por cima da linha do autor`).toBe(false);
        if (medida.cortado) {
          expect(medida.sobra, `a ${largura} px, o título foi cortado com ${Math.round(medida.sobra)} px livres nas outras colunas`).toBeLessThan(8);
        }
      });
    });

    test("Equipe: a coluna Pessoa nunca some e o nome e o e-mail têm prioridade sobre as outras colunas", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel/equipe", { toque: hasTouch });
      const nome = page.getByRole("cell").getByText(pessoas.adm.nome, { exact: true });
      const email = page.getByRole("cell").getByText(pessoas.adm.email, { exact: true });
      await expect(nome).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        await expect(nome, `a ${largura} px, a coluna Pessoa aparece`).toBeVisible();
        expect(await textoCortado(nome), `a ${largura} px, o nome aparece inteiro`).toBe(false);
        expect(await textoCortado(email), `a ${largura} px, o e-mail aparece inteiro`).toBe(false);
      });
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

    test("no toque, links, caixas de seleção, ícones e botões têm área de toque de 44 px", async ({ page, hasTouch }, testInfo) => {
      test.skip(!hasTouch, "só nos perfis com toque (celular e tablet)");
      await entrarComoAdm(page, "/painel", { toque: hasTouch });
      // Uma notícia na lista, para conferir as caixas de seleção e os ícones de cada linha.
      await page.goto("/painel/conteudos/noticia/nova");
      await page.getByLabel("Manchete").fill(`Plantão jurídico no toque (${tema}, ${testInfo.project.name})`);
      await expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");

      const porTela: Record<string, string[]> = {};
      for (const endereco of [
        "/painel",
        "/painel/conteudos",
        "/painel/conteudos/noticia/nova",
        "/painel/conteudos/documento/nova?tipo=edital",
        "/painel/equipe",
        "/painel/midia",
      ]) {
        await page.goto(endereco);
        await page.waitForLoadState("networkidle");
        const pequenos = await page.evaluate(alvosDeToquePequenos, ALVO_DE_TOQUE);
        if (pequenos.length > 0) porTela[endereco] = pequenos.map((p) => `${p.alvo} · ${p.tamanho}`);
      }

      if (menuPeloBotao(testInfo)) {
        await apertar(page.getByRole("button", { name: "Menu", exact: true }), hasTouch);
        const pequenos = await page.evaluate(alvosDeToquePequenos, ALVO_DE_TOQUE);
        if (pequenos.length > 0) porTela["menu aberto"] = pequenos.map((p) => `${p.alvo} · ${p.tamanho}`);
      }
      expect(porTela, `alvos com área de toque menor que ${ALVO_DE_TOQUE} px, por tela`).toEqual({});
    });

    test("edital: a data do evento continua no mesmo dia depois de salvar e abrir de novo (pt-BR, America/Bahia)", async ({ page, hasTouch }) => {
      await entrarComoAdm(page, "/painel/conteudos/documento/nova?tipo=edital", { toque: hasTouch });
      await page.getByLabel("Título oficial").fill("Edital de convocação para a assembleia da noite");
      // Perto da meia-noite: em UTC já é o dia seguinte (23h30 na Bahia = 02h30 UTC).
      await page.getByLabel("Data do evento ou prazo").fill("2027-03-15");
      await page.getByLabel("Hora do evento ou prazo").fill("23:30");
      await expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");
      await expect(page).toHaveURL(/\/painel\/conteudos\/documento\/[0-9a-f-]+$/);

      await page.reload();
      await expect(page.getByLabel("Data do evento ou prazo")).toHaveValue("2027-03-15");
      await expect(page.getByLabel("Hora do evento ou prazo")).toHaveValue("23:30");
    });
  });
}
