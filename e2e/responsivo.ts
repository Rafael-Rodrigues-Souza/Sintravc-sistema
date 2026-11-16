import { readFileSync } from "node:fs";

import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { RESPONSIVO } from "../playwright.config";
import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { apertar, entrarNoPainel } from "./entrar";

/** Apoio dos e2e @responsivo (E48). Os tamanhos vêm sempre de RESPONSIVO, no playwright.config.ts. */

export const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm" | "com", PessoaDeTeste>;

/**
 * A altura máxima da folha inferior, como fração da tela: lida do max-h-[NNdvh] de
 * src/components/ui/drawer.tsx, para o número não se repetir aqui.
 */
export const ALTURA_MAXIMA_DA_FOLHA = (() => {
  const achado = readFileSync("src/components/ui/drawer.tsx", "utf8").match(/max-h-\[(\d+)dvh\]/);
  if (!achado) throw new Error("drawer.tsx sem max-h-[NNdvh]: a folha inferior precisa de altura máxima (nunca tela cheia)");
  return Number(achado[1]) / 100;
})();

/** PDF com texto de verdade, como o edital assinado que o sindicato digitaliza. */
export async function pdfComTexto(linhas: string[]) {
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const pagina = doc.addPage();
  linhas.forEach((texto, i) => pagina.drawText(texto, { x: 50, y: 700 - i * 24, size: 14, font: fonte }));
  return Buffer.from(await doc.save());
}

/** A menor altura da varredura da janela: a “tela baixa” (notebook baixo, tela dividida). */
export const ALTURA_BAIXA = Math.min(...RESPONSIVO.varredura.alturas);

/** Folgas das medidas, em px. Não são tamanhos de tela (esses ficam em RESPONSIVO). */
export const TOLERANCIA = {
  /** Arredondamento de subpixel: diferenças até aqui são a mesma medida. */
  arredondamento: 1,
  /** Item de coluna até isso mais baixo que o natural não conta como esmagado. */
  encolhimento: 2,
  /** Pedaços de texto com o topo a menos disso estão na mesma linha de texto. */
  linhaDeTexto: 4,
  /** Itens de alturas diferentes, centrados, com o topo a menos disso estão na mesma linha. */
  mesmaLinha: 8,
  /** Espaço livre numa coluna abaixo disso não dá para usar (vãos e arredondamento). */
  sobraDesprezivel: 8,
} as const;

/** As larguras da varredura da janela, de RESPONSIVO.varredura.de até .ate, de passo em passo. */
export function largurasDaVarredura(): number[] {
  const { de, ate, passo } = RESPONSIVO.varredura;
  const larguras: number[] = [];
  for (let largura = de; largura <= ate; largura += passo) larguras.push(largura);
  return larguras;
}

/** A janela é estreita (abaixo de RESPONSIVO.menuLateralAPartirDe): o painel usa a versão mobile. */
export const telaEstreita = (page: Page) => page.viewportSize()!.width < RESPONSIVO.menuLateralAPartirDe;

/** No desktop (“chromium”), estreita a janela até logo abaixo do menu lateral; nos perfis, fica no tamanho deles. */
export async function janelaEstreitaNoDesktop(page: Page, projeto: string) {
  if (projeto !== "chromium") return;
  await page.setViewportSize({ width: RESPONSIVO.menuLateralAPartirDe - 1, height: page.viewportSize()!.height });
  await assentar(page);
}

type Janela = { width: number; height: number };

/**
 * Os dois tamanhos de um tablet que gira, achados em RESPONSIVO: o perfil e o perfil com toque de
 * largura e altura trocadas. Fora dos tablets (sem o par girado), null.
 */
export function tabletQueGira(projeto: string): { emPe: Janela; deitado: Janela } | null {
  const perfil = (RESPONSIVO.perfis as Record<string, { largura: number; altura: number; toque: boolean }>)[projeto];
  const girado = perfil && Object.values(RESPONSIVO.perfis).find((o) => o.toque && o.largura === perfil.altura && o.altura === perfil.largura);
  if (!girado) return null;
  const janela = (p: { largura: number; altura: number }) => ({ width: p.largura, height: p.altura });
  return perfil.largura < perfil.altura ? { emPe: janela(perfil), deitado: janela(girado) } : { emPe: janela(girado), deitado: janela(perfil) };
}

export async function semRolagemLateral(page: Page) {
  const { conteudo, tela } = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(conteudo, "a página não pode rolar para o lado").toBeLessThanOrEqual(tela);
}

/** Abre o painel já com a sessão do ADM e vai para o endereço pedido. */
export async function entrarComoAdm(page: Page, destino: string, { toque = false } = {}) {
  await entrarComo(page, pessoas.adm, destino, { toque });
}

/** Abre o painel já com a sessão da pessoa e vai para o endereço pedido. */
export async function entrarComo(page: Page, pessoa: PessoaDeTeste, destino: string, { toque = false } = {}) {
  await page.goto(`/painel/entrar`);
  await entrarNoPainel(page, pessoa, { toque });
  if (destino !== "/painel") await page.goto(destino);
}

/**
 * Espera as animações em andamento terminarem (diálogo e menu abrem com zoom de 95%: medido no meio,
 * o alvo parece menor do que é).
 */
export async function semAnimacao(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
}

/** Espera dois quadros, para a tela assentar depois de mudar o tamanho da janela. */
export async function assentar(page: Page) {
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
}

/**
 * Itens esmagados dentro de um elemento: filho de uma coluna flex que ficou mais baixo que o tamanho
 * natural (o flex encolheu o item em vez de deixar o pai rolar). Mede como a skill conferir-responsivo:
 * tira o encolhimento, mede de novo e devolve como estava. Devolve o texto de cada um.
 */
export async function itensEsmagados(area: Locator): Promise<string[]> {
  return area.evaluate((raiz, tolerancia) => {
    const candidatos = [raiz, ...raiz.querySelectorAll<HTMLElement>("*")].filter((el) => {
      const pai = el.parentElement;
      if (el === raiz || !pai || el.getClientRects().length === 0) return false;
      const estilo = getComputedStyle(pai);
      return estilo.display.includes("flex") && estilo.flexDirection.startsWith("column");
    }) as HTMLElement[];
    const antes = candidatos.map((el) => el.getBoundingClientRect().height);
    const inline = candidatos.map((el) => el.style.getPropertyValue("flex-shrink"));
    for (const el of candidatos) el.style.setProperty("flex-shrink", "0", "important");
    const natural = candidatos.map((el) => el.getBoundingClientRect().height);
    candidatos.forEach((el, i) => (inline[i] ? el.style.setProperty("flex-shrink", inline[i]) : el.style.removeProperty("flex-shrink")));
    return candidatos.flatMap((el, i) => {
      const [a = 0, n = 0] = [antes[i], natural[i]];
      return n - a > tolerancia ? [`${el.tagName.toLowerCase()} “${(el.textContent ?? "").trim().slice(0, 40)}” (${Math.round(a)} de ${Math.round(n)} px)`] : [];
    });
  }, TOLERANCIA.encolhimento);
}

/**
 * Percorre as larguras da varredura (só no projeto “chromium”, que é a janela com mouse) e roda a
 * conferência em cada uma. Nos perfis, roda uma vez, no tamanho do próprio perfil.
 */
export async function emCadaLargura(page: Page, testInfo: TestInfo, conferir: (largura: number) => Promise<void>) {
  if (testInfo.project.name !== "chromium") {
    await conferir(page.viewportSize()!.width);
    return;
  }
  const altura = page.viewportSize()!.height;
  for (const largura of largurasDaVarredura()) {
    await page.setViewportSize({ width: largura, height: altura });
    await assentar(page);
    await conferir(largura);
  }
}

/**
 * Pares de elementos visíveis do grupo que se cruzam na tela (texto sobre botão, botão sobre botão).
 * Um elemento e o que está dentro dele não contam como par. Devolve “A × B” de cada par.
 */
export async function caixasQueSeCruzam(area: Locator, seletor: string): Promise<string[]> {
  return area.evaluate((raiz, { sel, tolerancia }) => {
    const els = [...raiz.querySelectorAll<HTMLElement>(sel)].filter((el) => el.getClientRects().length > 0);
    const nome = (el: Element) => `${el.tagName.toLowerCase()} “${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}”`;
    const pares: string[] = [];
    els.forEach((a, i) =>
      els.slice(i + 1).forEach((b) => {
        if (a.contains(b) || b.contains(a)) return;
        const r = a.getBoundingClientRect();
        const s = b.getBoundingClientRect();
        const x = Math.min(r.right, s.right) - Math.max(r.left, s.left);
        const y = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
        if (x > tolerancia && y > tolerancia) pares.push(`${nome(a)} × ${nome(b)}`);
      }),
    );
    return pares;
  }, { sel: seletor, tolerancia: TOLERANCIA.arredondamento });
}

/**
 * O texto que aparece de `a` (linhas recortadas pela caixa que esconde o que passa, como o
 * line-clamp) cruza a caixa de `b`. Pega a linha escondida que vaza por cima do vizinho.
 */
export async function textoVisivelCruza(a: Locator, b: Locator): Promise<boolean> {
  const caixaB = await b.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });
  return a.evaluate((raiz, { outra, tolerancia }) => {
    const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let texto = andar.nextNode(); texto; texto = andar.nextNode()) {
      // A caixa que recorta: o ancestral mais próximo (até a raiz) com overflow escondido.
      let recorte: Element | null = texto.parentElement;
      while (recorte && recorte !== raiz.parentElement && getComputedStyle(recorte).overflow === "visible") recorte = recorte.parentElement;
      const c = recorte && recorte !== raiz.parentElement ? recorte.getBoundingClientRect() : null;
      const intervalo = document.createRange();
      intervalo.selectNodeContents(texto);
      for (const r of intervalo.getClientRects()) {
        const left = Math.max(r.left, c?.left ?? -Infinity);
        const right = Math.min(r.right, c?.right ?? Infinity);
        const top = Math.max(r.top, c?.top ?? -Infinity);
        const bottom = Math.min(r.bottom, c?.bottom ?? Infinity);
        if (right - left <= tolerancia || bottom - top <= tolerancia) continue;
        const x = Math.min(right, outra.right) - Math.max(left, outra.left);
        const y = Math.min(bottom, outra.bottom) - Math.max(top, outra.top);
        if (x > tolerancia && y > tolerancia) return true;
      }
    }
    return false;
  }, { outra: caixaB, tolerancia: TOLERANCIA.arredondamento });
}

/** Quantas linhas o texto do elemento ocupa na tela. */
export async function linhasDoTexto(el: Locator): Promise<number> {
  return el.evaluate((no, tolerancia) => {
    // Só os nós de texto (um ícone ao lado do texto não é uma linha); topos próximos são a mesma linha.
    // O texto só para o leitor de tela (sr-only: caixa de 1 px recortada) não aparece: não conta.
    const soParaLeitor = (el: Element | null) => {
      for (; el && no.contains(el); el = el.parentElement) {
        const r = el.getBoundingClientRect();
        if (r.width <= 1 && r.height <= 1 && getComputedStyle(el).overflow === "hidden") return true;
      }
      return false;
    };
    const topos: number[] = [];
    const andar = document.createTreeWalker(no, NodeFilter.SHOW_TEXT);
    for (let texto = andar.nextNode(); texto; texto = andar.nextNode()) {
      if (soParaLeitor(texto.parentElement)) continue;
      const intervalo = document.createRange();
      intervalo.selectNodeContents(texto);
      for (const r of intervalo.getClientRects()) {
        if (r.width > 0 && !topos.some((t) => Math.abs(t - r.top) < tolerancia)) topos.push(r.top);
      }
    }
    return topos.length;
  }, TOLERANCIA.linhaDeTexto);
}

/** O texto foi cortado (reticências ou overflow escondido): o conteúdo é mais largo que a caixa. */
export async function textoCortado(el: Locator): Promise<boolean> {
  return el.evaluate(
    (no, tolerancia) => no.scrollWidth > no.clientWidth + tolerancia || no.scrollHeight > no.clientHeight + tolerancia,
    TOLERANCIA.arredondamento,
  );
}

/** Contraste mínimo do texto comum no WCAG 2.1 AA (RNF09). */
export const CONTRASTE_MINIMO = 4.5;

/**
 * Contraste WCAG 2.1 (de 1 a 21) entre a cor do texto do elemento e o fundo atrás dele, pelas cores
 * calculadas na tela. Fundo translúcido é somado ao dos pais até chegar a um opaco (RNF09).
 */
export async function contraste(el: Locator): Promise<number> {
  return el.evaluate((no) => {
    type Rgba = [number, number, number, number];
    const ler = (cor: string): Rgba => {
      const n = cor.match(/[\d.]+/g)?.map(Number) ?? [];
      return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n[3] ?? 1];
    };
    // Põe a cor de cima (com transparência) sobre a de baixo, já opaca.
    const sobre = ([r, g, b, a]: Rgba, [R, G, B]: Rgba): Rgba => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1];
    const camadas: Rgba[] = [];
    for (let atual: Element | null = no; atual; atual = atual.parentElement) {
      const cor = ler(getComputedStyle(atual).backgroundColor);
      if (cor[3] > 0) camadas.push(cor);
      if (cor[3] >= 1) break;
    }
    const fundo = camadas.reduceRight<Rgba>((baixo, cima) => sobre(cima, baixo), [255, 255, 255, 1]);
    const texto = sobre(ler(getComputedStyle(no).color), fundo);
    const luminancia = ([r, g, b]: Rgba) => {
      const canal = (c: number) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
    };
    const [claro, escuro] = [luminancia(texto), luminancia(fundo)].sort((a, b) => b - a) as [number, number];
    return (claro + 0.05) / (escuro + 0.05);
  });
}

/** Largura que a barra de rolagem vertical ocupa dentro do elemento (0 quando ela não ocupa espaço). */
export async function larguraDaBarra(area: Locator): Promise<number> {
  return area.evaluate((el) => {
    const estilo = getComputedStyle(el);
    const bordas = parseFloat(estilo.borderLeftWidth) + parseFloat(estilo.borderRightWidth);
    return (el as HTMLElement).offsetWidth - bordas - el.clientWidth;
  });
}

/** As ferramentas da barra de formatação do corpo, pelo nome acessível (o mesmo na barra e no menu “Mais”). */
export const FERRAMENTAS_DO_CORPO = [
  "Negrito (Ctrl+B)",
  "Itálico (Ctrl+I)",
  "Sublinhado (Ctrl+U)",
  "Estilo do parágrafo",
  "Lista",
  "Lista numerada",
  "Citação",
  "Link",
  "Imagem da Mídia",
  "Desfazer (Ctrl+Z)",
  "Refazer (Ctrl+Shift+Z)",
] as const;

export const barraDoCorpo = (page: Page) => page.getByRole("toolbar", { name: "Formatação do corpo" });

/**
 * Uma ferramenta da barra do corpo como a pessoa a acha (#51, E51): o botão, se ele estiver à mostra
 * na barra; se não, o item do menu “Mais formatação” (⋯), que fica aberto até `fechar()`.
 */
export async function ferramentaDoCorpo(page: Page, nome: (typeof FERRAMENTAS_DO_CORPO)[number], toque: boolean) {
  const barra = barraDoCorpo(page);
  const naBarra = barra.getByRole(nome === "Estilo do parágrafo" ? "combobox" : "button", { name: nome, exact: true });
  if (await naBarra.isVisible()) return { alvo: naBarra, noMenu: false, fechar: async () => {} };
  await apertar(barra.getByRole("button", { name: "Mais formatação" }), toque);
  const menu = page.getByRole("menu", { name: "Mais formatação" });
  await expect(menu).toBeVisible();
  return {
    alvo: menu.getByLabel(nome, { exact: true }),
    noMenu: true,
    fechar: async () => {
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
    },
  };
}

/** Aperta a ferramenta da barra do corpo, pela barra ou pelo menu “Mais”. */
export async function usarFerramentaDoCorpo(page: Page, nome: (typeof FERRAMENTAS_DO_CORPO)[number], toque: boolean) {
  const { alvo } = await ferramentaDoCorpo(page, nome, toque);
  await apertar(alvo, toque);
}

/**
 * Uma ação de uma linha de Conteúdos (“Edição rápida de …”, “Editar …”, “Abrir …”): o ícone, se está
 * à mostra; se não (do lg ao 2xl, a coluna Ações só tem o ⋯, #51), o item do ⋯ da linha.
 */
export async function acaoDaLinha(linha: Locator, nome: string | RegExp, toque = false) {
  const icone = linha.getByRole("link", { name: nome });
  if (await icone.isVisible()) return apertar(icone, toque);
  await apertar(linha.getByRole("button", { name: /^Mais ações para/ }), toque);
  await apertar(linha.page().getByRole("menuitem", { name: nome }), toque);
}
