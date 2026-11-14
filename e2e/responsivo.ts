import { readFileSync } from "node:fs";

import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { entrarNoPainel } from "./entrar";

/** Apoio dos e2e @responsivo (E48). Os tamanhos vêm sempre de RESPONSIVO, no playwright.config.ts. */

export const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm", PessoaDeTeste>;

/** Projetos em que o painel é estreito (abaixo de lg) e o menu lateral vira o botão “Menu”. */
export const MENU_PELO_BOTAO = ["celular", "tablet-em-pe"];

/** A menor altura da varredura da janela: a “tela baixa” (notebook baixo, tela dividida). */
/** Área mínima de toque, em px (RESPONSIVO.alvoDeToque). */
export const ALVO_DE_TOQUE = RESPONSIVO.alvoDeToque;

export const ALTURA_BAIXA = Math.min(...RESPONSIVO.varredura.alturas);

/** As larguras da varredura da janela, de RESPONSIVO.varredura.de até .ate, de passo em passo. */
export function largurasDaVarredura(): number[] {
  const { de, ate, passo } = RESPONSIVO.varredura;
  const larguras: number[] = [];
  for (let largura = de; largura <= ate; largura += passo) larguras.push(largura);
  return larguras;
}

export const menuPeloBotao = (testInfo: TestInfo) => MENU_PELO_BOTAO.includes(testInfo.project.name);

export async function semRolagemLateral(page: Page) {
  const { conteudo, tela } = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(conteudo, "a página não pode rolar para o lado").toBeLessThanOrEqual(tela);
}

/** Abre o painel já com a sessão do ADM e vai para o endereço pedido. */
export async function entrarComoAdm(page: Page, destino: string, { toque = false } = {}) {
  await page.goto(`/painel/entrar`);
  await entrarNoPainel(page, pessoas.adm, { toque });
  if (destino !== "/painel") await page.goto(destino);
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
  return area.evaluate((raiz) => {
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
      return n - a > 2 ? [`${el.tagName.toLowerCase()} “${(el.textContent ?? "").trim().slice(0, 40)}” (${Math.round(a)} de ${Math.round(n)} px)`] : [];
    });
  });
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
  return area.evaluate((raiz, sel) => {
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
        if (x > 1 && y > 1) pares.push(`${nome(a)} × ${nome(b)}`);
      }),
    );
    return pares;
  }, seletor);
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
  return a.evaluate((raiz, outra) => {
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
        if (right - left <= 1 || bottom - top <= 1) continue;
        const x = Math.min(right, outra.right) - Math.max(left, outra.left);
        const y = Math.min(bottom, outra.bottom) - Math.max(top, outra.top);
        if (x > 1 && y > 1) return true;
      }
    }
    return false;
  }, caixaB);
}

/** Quantas linhas o texto do elemento ocupa na tela. */
export async function linhasDoTexto(el: Locator): Promise<number> {
  return el.evaluate((no) => {
    // Só os nós de texto (um ícone ao lado do texto não é uma linha); linhas a menos de 4 px são a mesma.
    const topos: number[] = [];
    const andar = document.createTreeWalker(no, NodeFilter.SHOW_TEXT);
    for (let texto = andar.nextNode(); texto; texto = andar.nextNode()) {
      const intervalo = document.createRange();
      intervalo.selectNodeContents(texto);
      for (const r of intervalo.getClientRects()) {
        if (r.width > 0 && !topos.some((t) => Math.abs(t - r.top) < 4)) topos.push(r.top);
      }
    }
    return topos.length;
  });
}

/** O texto foi cortado (reticências ou overflow escondido): o conteúdo é mais largo que a caixa. */
export async function textoCortado(el: Locator): Promise<boolean> {
  return el.evaluate((no) => no.scrollWidth > no.clientWidth + 1 || no.scrollHeight > no.clientHeight + 1);
}

/** Largura que a barra de rolagem vertical ocupa dentro do elemento (0 quando ela não ocupa espaço). */
export async function larguraDaBarra(area: Locator): Promise<number> {
  return area.evaluate((el) => {
    const estilo = getComputedStyle(el);
    const bordas = parseFloat(estilo.borderLeftWidth) + parseFloat(estilo.borderRightWidth);
    return (el as HTMLElement).offsetWidth - bordas - el.clientWidth;
  });
}
