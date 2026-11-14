import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import {
  ALTURA_BAIXA,
  assentar,
  caixasQueSeCruzam,
  emCadaLargura,
  entrarComoAdm,
  itensEsmagados,
  larguraDaBarra,
  linhasDoTexto,
  pessoas,
  semAnimacao,
  telaEstreita,
  textoCortado,
  textoVisivelCruza,
  TOLERANCIA,
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

/** Alvos da tela com área de toque menor que RESPONSIVO.alvoDeToque, como “alvo · tamanho”. */
async function alvosPequenos(page: Page) {
  const pequenos = await page.evaluate(alvosDeToquePequenos, RESPONSIVO.alvoDeToque);
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

    test("Conteúdos: “Criar conteúdo” fica ao lado de Lista/Calendário e só desce quando falta espaço", async ({ page, hasTouch }, testInfo) => {
      await entrarComoAdm(page, "/painel/conteudos", { toque: hasTouch });
      const cabecalho = page.locator("main header").first();
      const modo = cabecalho.getByRole("navigation", { name: "Modo de ver" });
      const criar = cabecalho.getByRole("button", { name: "Criar conteúdo" });
      await expect(criar).toBeVisible();

      await emCadaLargura(page, testInfo, async (largura) => {
        const medida = await cabecalho.evaluate((header, mesmaLinha) => {
          const nav = header.querySelector("nav[aria-label='Modo de ver']")!.getBoundingClientRect();
          const botao = [...header.querySelectorAll("button")].find((b) => b.textContent?.includes("Criar conteúdo"))!;
          const b = botao.getBoundingClientRect();
          const grupo = getComputedStyle(botao.parentElement!);
          const vao = parseFloat(grupo.columnGap) || 0;
          return { mesmaLinha: Math.abs(nav.top - b.top) < mesmaLinha, cabe: nav.width + vao + b.width <= header.clientWidth };
        }, TOLERANCIA.mesmaLinha);
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
        await expect(cabecalho.getByTestId("selo-estado")).toBeVisible();

        await emCadaLargura(page, testInfo, async (largura) => {
          expect(
            await caixasQueSeCruzam(cabecalho, "h1, [data-testid=selo-estado], [data-testid=status-do-salvamento], a, button"),
            `a ${largura} px, nada se sobrepõe no cabeçalho`,
          ).toEqual([]);
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
      await apertar(page.getByRole("toolbar", { name: "Formatação do corpo" }).getByRole("button", { name: "Imagem da Mídia" }), hasTouch);
      const seletor = page.getByRole("dialog", { name: "Imagem no corpo da notícia" });
      await expect(seletor.getByRole("button", { name: new RegExp(`logo-toque-${sufixo}`) })).toBeVisible();
      await medir("seletor de mídia");
      await page.keyboard.press("Escape");
      await expect(seletor).toBeHidden();

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
