/**
 * Confere a responsividade das telas e só relata: não corrige nada.
 *
 * 1. Varredura com mouse (janela reduzida, tela dividida, telas baixas): largura de 320 a 1920 px,
 *    de 40 em 40, nas alturas 600, 700, 800 e 1080, nos temas claro e escuro.
 * 2. Toque: celular (375×667) e tablet em pé (800×1280) e deitado (1280×800), com isMobile e
 *    hasTouch. Aqui também entram alvos menores que 44 px, ações que só aparecem com o mouse por
 *    cima e o que muda ao girar o tablet sem recarregar a página.
 *
 * Salva print só dos tamanhos com problema (um por problema novo) e grava resultado.md e
 * resultado.json na pasta de saída.
 *
 * Uso (com o app rodando):
 *   pnpm exec tsx .claude/skills/conferir-responsivo/conferir.ts inicio painel/entrar
 *   pnpm exec tsx .claude/skills/conferir-responsivo/conferir.ts --entrar painel painel/conteudos
 *
 * As rotas vão sem a barra inicial (“inicio” é a página inicial): o Git Bash do Windows troca
 * “/painel” por “C:/Program Files/Git/painel”.
 *
 * --url      endereço do app (padrão http://localhost:3000)
 * --entrar   entra no painel antes, com RESPONSIVO_EMAIL, RESPONSIVO_SENHA e RESPONSIVO_TOTP
 *            (segredo das duas etapas). Em dev, saem do pnpm dev:pessoas-teste.
 * --saida    pasta dos prints (padrão .scratch/responsivo/<data-hora>, ignorada pelo git)
 * --rapido   varre de 80 em 80 px e só nas alturas 700 e 1080 (para uma olhada rápida)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { codigoTotp } from "../../../src/lib/acesso/totp";

const TEMAS = ["claro", "escuro"] as const;
type Tema = (typeof TEMAS)[number];
const ALVO_MINIMO = 44;
const TOQUE = [
  { nome: "celular", largura: 375, altura: 667 },
  { nome: "tablet em pé", largura: 800, altura: 1280 },
  { nome: "tablet deitado", largura: 1280, altura: 800 },
] as const;

/**
 * Um ponto encontrado. `alvo` identifica o elemento; `molde` junta os elementos iguais (as linhas de
 * uma tabela, por exemplo); `medida` muda de tamanho para tamanho.
 */
type Ponto = { tipo: string; alvo: string; molde: string; medida: string };
type Achado = Ponto & { tela: string; modo: string; tema: Tema; largura: number; altura: number; print?: string };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    entrar: { type: "boolean", default: false },
    saida: { type: "string" },
    rapido: { type: "boolean", default: false },
  },
});

if (positionals.length === 0) {
  console.error("Diga as telas: conferir.ts inicio painel/entrar");
  process.exit(1);
}
const telas = positionals.map((t) => (t === "inicio" ? "/" : `/${t.replace(/^\/+/, "")}`));

const PASSO = values.rapido ? 80 : 40;
const LARGURAS = Array.from({ length: Math.floor((1920 - 320) / PASSO) + 1 }, (_, i) => 320 + i * PASSO);
const ALTURAS = values.rapido ? [700, 1080] : [600, 700, 800, 1080];

const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const saida = values.saida ?? join(".scratch", "responsivo", carimbo);
mkdirSync(saida, { recursive: true });

async function entrarNoPainel(browser: Browser): Promise<string> {
  const { RESPONSIVO_EMAIL: email, RESPONSIVO_SENHA: senha, RESPONSIVO_TOTP: segredo } = process.env;
  if (!email || !senha || !segredo) {
    throw new Error("Para --entrar, defina RESPONSIVO_EMAIL, RESPONSIVO_SENHA e RESPONSIVO_TOTP.");
  }
  const contexto = await browser.newContext({ baseURL: values.url });
  const page = await contexto.newPage();
  await page.goto("/painel/entrar");
  await page.getByLabel("E-mail de trabalho").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Número 1 de 6").fill(await codigoTotp(segredo));
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
  await page.waitForURL(/\/painel(?!\/entrar)/);
  const arquivo = join(saida, "sessao.json");
  await contexto.storageState({ path: arquivo });
  await contexto.close();
  return arquivo;
}

/** Medições feitas dentro da página. `toque` liga as conferências de celular e tablet. */
async function medir(page: Page, toque: boolean): Promise<Ponto[]> {
  return page.evaluate(
    ({ alvoMinimo, toque }) => {
      const pontos: { tipo: string; alvo: string; molde: string; medida: string }[] = [];
      const molde = (el: Element) => `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 120)}`;
      const add = (tipo: string, el: Element | Element[] | null, medida = "") => {
        const lista = el === null ? [] : Array.isArray(el) ? el : [el];
        pontos.push({
          tipo,
          alvo: lista.length ? lista.map(nome).join(" × ") : "página",
          molde: lista.length ? lista.map(molde).join(" × ") : "página",
          medida,
        });
      };
      const largura = document.documentElement.clientWidth;
      const todos = [...document.body.querySelectorAll("*")];
      const px = (n: number) => `${Math.round(n)} px`;
      const visivel = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
      };
      const nome = (el: Element) => {
        const imagem = el.querySelector("img[alt]")?.getAttribute("alt");
        const texto = (el.getAttribute("aria-label") ?? (el.textContent?.trim() || imagem) ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
        const id = el.id ? `#${el.id}` : "";
        return `<${el.tagName.toLowerCase()}${id}> “${texto}”`;
      };
      const clicaveis =
        "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch], [role=menuitem]";
      const ehClicavel = (el: Element) => el.matches(clicaveis);
      const visiveis = todos.filter(visivel);
      // Texto só para leitor de tela (sr-only): 1 px e recortado. Não conta como texto na tela.
      const soLeitor = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.width <= 2 || r.height <= 2;
      };
      // Caixa visível de um elemento: o que sobra depois dos recortes (overflow, clip) dos pais.
      const recortes = new Map<Element, DOMRect | null>();
      const recorte = (el: Element | null): DOMRect | null => {
        if (!el || el === document.documentElement) return new DOMRect(-1e6, -1e6, 2e6, 2e6);
        if (recortes.has(el)) return recortes.get(el)!;
        const pai = recorte(el.parentElement);
        const s = getComputedStyle(el);
        let r = pai;
        const corta = s.overflowX !== "visible" || s.overflowY !== "visible" || s.clip !== "auto" || s.clipPath !== "none";
        if (pai && corta) {
          const b = el.getBoundingClientRect();
          const x1 = Math.max(pai.left, b.left);
          const y1 = Math.max(pai.top, b.top);
          const x2 = Math.min(pai.right, b.right);
          const y2 = Math.min(pai.bottom, b.bottom);
          r = x2 - x1 > 2 && y2 - y1 > 2 ? new DOMRect(x1, y1, x2 - x1, y2 - y1) : null;
        }
        recortes.set(el, r);
        return r;
      };

      // Rolagem lateral, e quem passa da borda (só quando a página rola de lado).
      if (document.documentElement.scrollWidth > largura) {
        add("rolagem lateral", null, `${document.documentElement.scrollWidth} px de conteúdo para ${largura} px de tela`);
        const vazando = visiveis.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.right > largura + 1 || r.left < -1;
        });
        for (const el of vazando.filter((el) => !vazando.includes(el.parentElement as Element)).slice(0, 8)) {
          const r = el.getBoundingClientRect();
          add("passa da borda", el, `de ${px(r.left)} a ${px(r.right)}`);
        }
      }

      // Texto cortado: reticências, line-clamp ou overflow escondido com texto próprio maior que a caixa.
      for (const el of visiveis) {
        const s = getComputedStyle(el);
        const clamp = s.getPropertyValue("-webkit-line-clamp");
        const textoProprio = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
        const corta =
          s.textOverflow === "ellipsis" ||
          (clamp && clamp !== "none") ||
          (textoProprio && (s.overflowX === "hidden" || s.overflowY === "hidden" || s.overflowX === "clip" || s.overflowY === "clip"));
        if (!corta || !el.textContent?.trim() || soLeitor(el)) continue;
        const h = el as HTMLElement;
        if (h.scrollWidth > h.clientWidth + 1 || h.scrollHeight > h.clientHeight + 1) add("texto cortado", el);
      }

      // Esmagado: filho de flex que encolheu abaixo do tamanho natural. Na coluna, qualquer elemento
      // (altura); na linha, só o que é clicável (largura), porque texto que encolhe com reticências é
      // intencional. Mede tudo de uma vez: tira o encolhimento, mede de novo e devolve como estava.
      const candidatos = visiveis.flatMap((el) => {
        const pai = el.parentElement;
        if (!pai || getComputedStyle(el).flexShrink === "0") return [];
        const sp = getComputedStyle(pai);
        if (!sp.display.includes("flex")) return [];
        const coluna = sp.flexDirection.startsWith("column");
        if (!coluna && !ehClicavel(el)) return [];
        const r = el.getBoundingClientRect();
        return [{ el: el as HTMLElement, coluna, antes: coluna ? r.height : r.width }];
      });
      const inline = candidatos.map((c) => c.el.style.getPropertyValue("flex-shrink"));
      const prioridade = candidatos.map((c) => c.el.style.getPropertyPriority("flex-shrink"));
      for (const c of candidatos) c.el.style.setProperty("flex-shrink", "0", "important");
      const natural = candidatos.map((c) => {
        const r = c.el.getBoundingClientRect();
        return c.coluna ? r.height : r.width;
      });
      candidatos.forEach((c, i) => {
        if (inline[i]) c.el.style.setProperty("flex-shrink", inline[i], prioridade[i]);
        else c.el.style.removeProperty("flex-shrink");
      });
      candidatos.forEach((c, i) => {
        if (natural[i] - c.antes > 2) {
          add("esmagado", c.el, `${c.coluna ? "altura" : "largura"} ${px(c.antes)}, o natural é ${px(natural[i])}`);
        }
      });

      // Texto sobreposto: linhas de texto de nós diferentes que se cruzam.
      const caixas: { r: DOMRect; dono: Element }[] = [];
      const percorrer = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = percorrer.nextNode(); n && caixas.length < 3000; n = percorrer.nextNode()) {
        const dono = n.parentElement;
        if (!dono || !n.textContent?.trim() || !visivel(dono) || Number(getComputedStyle(dono).opacity) < 0.05) continue;
        const limite = recorte(dono);
        if (!limite) continue;
        const faixa = document.createRange();
        faixa.selectNodeContents(n);
        for (const linha of faixa.getClientRects()) {
          const x1 = Math.max(linha.left, limite.left);
          const y1 = Math.max(linha.top, limite.top);
          const x2 = Math.min(linha.right, limite.right);
          const y2 = Math.min(linha.bottom, limite.bottom);
          if (x2 - x1 > 4 && y2 - y1 > 4) caixas.push({ r: new DOMRect(x1, y1, x2 - x1, y2 - y1), dono });
        }
      }
      const vistos = new Set<string>();
      for (let i = 0; i < caixas.length; i++) {
        for (let j = i + 1; j < caixas.length; j++) {
          const a = caixas[i]!;
          const b = caixas[j]!;
          if (a.dono === b.dono || a.dono.contains(b.dono) || b.dono.contains(a.dono)) continue;
          const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
          const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          if (x > 3 && y > 3) {
            const chave = `${nome(a.dono)} × ${nome(b.dono)}`;
            if (!vistos.has(chave)) {
              vistos.add(chave);
              add("texto sobreposto", [a.dono, b.dono]);
            }
          }
        }
      }

      // Quebra de linha: itens de uma linha flex com wrap que foram para baixo uns dos outros.
      for (const el of visiveis) {
        const s = getComputedStyle(el);
        if (!s.display.includes("flex") || s.flexDirection.startsWith("column") || s.flexWrap !== "wrap") continue;
        const filhos = [...el.children].filter(visivel);
        if (filhos.length < 2) continue;
        const linhas: Element[][] = [];
        for (const f of filhos) {
          const r = f.getBoundingClientRect();
          const linha = linhas.find((l) => {
            const p = l[0]!.getBoundingClientRect();
            return r.top < p.bottom - 1 && r.bottom > p.top + 1;
          });
          if (linha) linha.push(f);
          else linhas.push([f]);
        }
        if (linhas.length > 1) {
          add("quebrou a linha", el, linhas.map((l) => l.map((f) => nome(f)).join(", ")).join(" | "));
        }
      }

      // Barra de rolagem que aparece dentro da página (ex.: na borda de um menu).
      for (const el of visiveis) {
        const s = getComputedStyle(el);
        const h = el as HTMLElement;
        const bordas = parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth);
        const barraY = h.offsetWidth - h.clientWidth - bordas;
        if (/(auto|scroll)/.test(s.overflowY) && h.scrollHeight > h.clientHeight + 1 && barraY > 0) {
          add("barra de rolagem", el, `${px(barraY)} de barra, conteúdo de ${px(h.scrollHeight)} em ${px(h.clientHeight)}`);
        }
      }

      // Menu escondido sem botão visível que o abra.
      for (const nav of document.querySelectorAll("nav")) {
        if (visivel(nav)) continue;
        const botoes = [...document.querySelectorAll("[aria-controls], [aria-expanded], [aria-haspopup]")].filter(visivel);
        const abre = botoes.some((b) => (nav.id && b.getAttribute("aria-controls") === nav.id) || b.hasAttribute("aria-expanded"));
        if (!abre) add("menu sem botão", nav, "escondido e nada visível o abre");
      }

      if (toque) {
        // Alvos de toque menores que 44 px.
        for (const el of visiveis.filter(ehClicavel)) {
          const r = el.getBoundingClientRect();
          if (r.width < alvoMinimo || r.height < alvoMinimo) add("alvo pequeno", el, `${Math.round(r.width)}×${Math.round(r.height)} px`);
        }

        // Ações que só aparecem com o mouse por cima: clicáveis transparentes ou escondidos, e regras
        // :hover que mostram algo que no toque continua escondido.
        const opacidade = (el: Element | null): number => (el ? Number(getComputedStyle(el).opacity) * opacidade(el.parentElement) : 1);
        for (const el of todos.filter(ehClicavel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (opacidade(el) < 0.05 || getComputedStyle(el).visibility === "hidden") add("só com o mouse", el, "invisível no toque");
        }
        const regras: CSSStyleRule[] = [];
        const juntar = (lista: CSSRuleList) => {
          for (const regra of lista) {
            if (regra instanceof CSSStyleRule && regra.selectorText.includes(":hover")) regras.push(regra);
            if ("cssRules" in regra && regra.cssRules) juntar(regra.cssRules as CSSRuleList);
          }
        };
        for (const folha of document.styleSheets) {
          try {
            juntar(folha.cssRules);
          } catch {
            // folha de outro domínio: não dá para ler
          }
        }
        for (const regra of regras) {
          const st = regra.style;
          if (!st.opacity && !st.visibility && !st.display) continue;
          let alvos: Element[] = [];
          try {
            alvos = [...document.querySelectorAll(regra.selectorText.replace(/:hover/g, ""))];
          } catch {
            continue;
          }
          for (const el of alvos) {
            const s = getComputedStyle(el);
            const escondido = s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05;
            const temAcao = ehClicavel(el) || el.querySelector(clicaveis);
            if (escondido && temAcao) add("só com o mouse", el, `só aparece com :hover (${regra.selectorText.slice(0, 60)})`);
          }
        }
      }

      // Um mesmo tipo e alvo uma vez só por tamanho.
      const unicos = new Map(pontos.map((p) => [`${p.tipo}|${p.alvo}`, p]));
      return [...unicos.values()];
    },
    { alvoMinimo: ALVO_MINIMO, toque },
  );
}

async function novoContexto(browser: Browser, tema: Tema, sessao: string | undefined, toque: boolean, largura: number, altura: number) {
  const contexto = await browser.newContext({
    baseURL: values.url,
    viewport: { width: largura, height: altura },
    isMobile: toque,
    hasTouch: toque,
    colorScheme: tema === "escuro" ? "dark" : "light",
    locale: "pt-BR",
    timezoneId: "America/Bahia",
    storageState: sessao,
  });
  // O next-themes guarda a escolha em "theme": força o tema mesmo se alguém já escolheu outro.
  await contexto.addInitScript((t) => localStorage.setItem("theme", t), tema === "escuro" ? "dark" : "light");
  // O tsx embrulha as funções em __name(); a função de medir roda no navegador, onde ele não existe.
  await contexto.addInitScript("window.__name = (f) => f");
  return contexto;
}

async function assentar(page: Page) {
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
}

const achados: Achado[] = [];
const jaFotografado = new Set<string>();

/** Guarda os pontos e tira print se algum deles ainda não tinha print. */
async function registrar(page: Page, base: Omit<Achado, keyof Ponto | "print">, pontos: Ponto[]) {
  const novos = pontos.filter((p) => !jaFotografado.has(`${base.tela}|${base.modo}|${base.tema}|${p.tipo}|${p.alvo}`));
  let print: string | undefined;
  if (novos.length > 0) {
    const tela = base.tela.replace(/^\//, "").replace(/[/?&=]/g, "_") || "inicio";
    print = `${tela}-${base.modo.replace(/\s+/g, "-")}-${base.tema}-${base.largura}x${base.altura}.png`;
    await page.screenshot({ path: join(saida, print), fullPage: true });
    for (const p of novos) jaFotografado.add(`${base.tela}|${base.modo}|${base.tema}|${p.tipo}|${p.alvo}`);
  }
  for (const p of pontos) achados.push({ ...base, ...p, print: novos.includes(p) ? print : undefined });
}

async function varrer(browser: Browser, tema: Tema, sessao: string | undefined) {
  const contexto = await novoContexto(browser, tema, sessao, false, 1280, 800);
  const page = await contexto.newPage();
  for (const tela of telas) {
    await page.goto(tela, { waitUntil: "networkidle" });
    for (const altura of ALTURAS) {
      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: altura });
        await assentar(page);
        await registrar(page, { tela, modo: "mouse", tema, largura, altura }, await medir(page, false));
      }
    }
    process.stdout.write(`  ${tela} · mouse · ${tema}: ok\n`);
  }
  await contexto.close();
}

async function tocar(browser: Browser, tema: Tema, sessao: string | undefined) {
  for (const perfil of TOQUE) {
    const contexto: BrowserContext = await novoContexto(browser, tema, sessao, true, perfil.largura, perfil.altura);
    const page = await contexto.newPage();
    for (const tela of telas) {
      // Volta à posição do perfil: a tela anterior pode ter terminado girada.
      await page.setViewportSize({ width: perfil.largura, height: perfil.altura });
      await page.goto(tela, { waitUntil: "networkidle" });
      const base = { tela, modo: perfil.nome, tema, largura: perfil.largura, altura: perfil.altura };
      const aoAbrir = await medir(page, true);
      await registrar(page, base, aoAbrir);
      if (perfil.nome.startsWith("tablet")) {
        // Gira sem recarregar. O que só aparece depois do giro (e não ao abrir já na outra posição)
        // é problema da troca de posição.
        const outra = await contexto.newPage();
        await outra.setViewportSize({ width: perfil.altura, height: perfil.largura });
        await outra.goto(tela, { waitUntil: "networkidle" });
        const recarregado = new Set((await medir(outra, true)).map((p) => `${p.tipo}|${p.alvo}`));
        await outra.close();
        await page.setViewportSize({ width: perfil.altura, height: perfil.largura });
        await assentar(page);
        const girado = await medir(page, true);
        const sóNoGiro = girado
          .filter((p) => !recarregado.has(`${p.tipo}|${p.alvo}`))
          .map((p) => ({ ...p, tipo: `ao girar: ${p.tipo}` }));
        await registrar(page, { ...base, modo: `${perfil.nome} → girado`, largura: perfil.altura, altura: perfil.largura }, sóNoGiro);
      }
    }
    process.stdout.write(`  ${perfil.nome} · ${tema}: ok\n`);
    await contexto.close();
  }
}

/** “320–760, 1200” a partir das larguras de uma altura. */
function faixas(larguras: number[]): string {
  const ord = [...new Set(larguras)].sort((a, b) => a - b);
  const partes: string[] = [];
  let inicio = ord[0]!;
  let fim = inicio;
  for (const l of ord.slice(1)) {
    if (l === fim + PASSO) fim = l;
    else {
      partes.push(inicio === fim ? `${inicio}` : `${inicio}–${fim}`);
      inicio = fim = l;
    }
  }
  partes.push(inicio === fim ? `${inicio}` : `${inicio}–${fim}`);
  return partes.join(", ");
}

function relatorio(): string {
  const linhas = [`# Conferência de responsividade`, "", `Prints em \`${saida}\`. Medições são pistas: confira cada uma no print.`, ""];
  for (const tela of telas) {
    linhas.push(`## ${tela}`, "");
    const daTela = achados.filter((a) => a.tela === tela);
    if (daTela.length === 0) {
      linhas.push("Nada medido.", "");
      continue;
    }
    const grupos = new Map<string, Achado[]>();
    for (const a of daTela) {
      const chave = `${a.modo}|${a.tipo}|${a.molde}`;
      grupos.set(chave, [...(grupos.get(chave) ?? []), a]);
    }
    for (const modo of [...new Set(daTela.map((a) => a.modo))]) {
      linhas.push(`### ${modo === "mouse" ? "Janela com mouse (varredura)" : modo}`, "");
      for (const [chave, lista] of grupos) {
        if (!chave.startsWith(`${modo}|`)) continue;
        const { tipo, alvo, medida } = lista[0]!;
        const outros = new Set(lista.map((a) => a.alvo)).size - 1;
        const temas = [...new Set(lista.map((a) => a.tema))].join(" e ");
        const onde =
          modo === "mouse"
            ? [...new Set(lista.map((a) => a.altura))]
                .sort((a, b) => a - b)
                .map((h) => `altura ${h}: ${faixas(lista.filter((a) => a.altura === h).map((a) => a.largura))}`)
                .join("; ")
            : `${lista[0]!.largura}×${lista[0]!.altura}`;
        const print = lista.find((a) => a.print)?.print;
        const parecidos = outros > 0 ? ` (e mais ${outros} iguais a ele)` : "";
        linhas.push(`- **${tipo}** · ${alvo}${parecidos}${medida ? ` · ${medida}` : ""} · [${temas}] · ${onde}${print ? ` · print: ${print}` : ""}`);
      }
      linhas.push("");
    }
  }
  return linhas.join("\n");
}

async function main() {
  // Sem --hide-scrollbars: a barra de rolagem que aparece na borda de um menu precisa ocupar espaço.
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
  const sessao = values.entrar ? await entrarNoPainel(browser) : undefined;
  for (const tema of TEMAS) {
    await varrer(browser, tema, sessao);
    await tocar(browser, tema, sessao);
  }
  await browser.close();

  writeFileSync(join(saida, "resultado.json"), JSON.stringify(achados, null, 2));
  const md = relatorio();
  writeFileSync(join(saida, "resultado.md"), md);
  console.log(`\n${md}`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
