/**
 * Confere a responsividade das telas e só relata: não corrige nada.
 *
 Os tamanhos vêm de RESPONSIVO, no playwright.config.ts (E48), nos temas claro e escuro:
 * 1. Varredura com mouse (janela reduzida, tela dividida, telas baixas): RESPONSIVO.varredura.
 * 2. Perfis (os mesmos dos projetos @responsivo): RESPONSIVO.perfis. Nos perfis com toque também
 *    entram alvos com área de toque menor que RESPONSIVO.alvoDeToque e ações que só aparecem com o mouse por cima; o tablet é girado
 *    para a posição do outro perfil sem recarregar a página.
 *
 * Na varredura, salva print só dos tamanhos com problema (um por problema novo). De cada perfil,
 * salva sempre um print de referência (ref-*.png), com ou sem problema, para comparar com o Figma.
 * Grava resultado.md e resultado.json na pasta de saída.
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

import { alvosDeToquePequenos } from "../../../e2e/alvo-de-toque";
import { entrarNoPainel } from "../../../e2e/entrar";
import { RESPONSIVO } from "../../../playwright.config";

const TEMAS = ["claro", "escuro"] as const;
type Tema = (typeof TEMAS)[number];
const PERFIS = Object.entries(RESPONSIVO.perfis).map(([nome, p]) => ({ nome, ...p }));

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

const { de, ate, passo, alturas } = RESPONSIVO.varredura;
const PASSO = values.rapido ? passo * 2 : passo;
const LARGURAS = Array.from({ length: Math.floor((ate - de) / PASSO) + 1 }, (_, i) => de + i * PASSO);
const ALTURAS: readonly number[] = values.rapido ? [alturas[1], alturas[alturas.length - 1]] : alturas;

const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const saida = values.saida ?? join(".scratch", "responsivo", carimbo);
mkdirSync(saida, { recursive: true });

async function guardarSessao(browser: Browser): Promise<string> {
  const { RESPONSIVO_EMAIL: email, RESPONSIVO_SENHA: senha, RESPONSIVO_TOTP: segredoTotp } = process.env;
  if (!email || !senha || !segredoTotp) {
    throw new Error("Para --entrar, defina RESPONSIVO_EMAIL, RESPONSIVO_SENHA e RESPONSIVO_TOTP.");
  }
  const contexto = await browser.newContext({ baseURL: values.url });
  const page = await contexto.newPage();
  await page.goto("/painel/entrar");
  await entrarNoPainel(page, { email, senha, segredoTotp });
  const arquivo = join(saida, "sessao.json");
  await contexto.storageState({ path: arquivo });
  await contexto.close();
  return arquivo;
}

/** Medições feitas dentro da página. `toque` liga as conferências de celular e tablet. */
async function medir(page: Page, toque: boolean): Promise<Ponto[]> {
  const pontos = await medirNaPagina(page, toque);
  if (!toque) return pontos;
  // A área que responde ao toque, e não só o desenho (e2e/alvo-de-toque.ts, a mesma medida dos e2e).
  const pequenos = await page.evaluate(alvosDeToquePequenos, RESPONSIVO.alvoDeToque);
  return [...pontos, ...pequenos.map((p) => ({ tipo: "alvo pequeno", alvo: p.alvo, molde: p.molde, medida: p.tamanho }))];
}

async function medirNaPagina(page: Page, toque: boolean): Promise<Ponto[]> {
  return page.evaluate(
    ({ toque }) => {
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
      // Está na página (não é display:none) mas some da vista: 1 px ou recortado por clip (sr-only).
      const soLeitor = (el: Element) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        const s = getComputedStyle(el);
        const recortado = s.position === "absolute" && ((s.clip !== "auto" && s.clip !== "") || s.clipPath !== "none");
        return recortado || r.width <= 2 || r.height <= 2;
      };
      const textoProprio = (el: Element) =>
        [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
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
        const corta =
          s.textOverflow === "ellipsis" ||
          (clamp && clamp !== "none") ||
          (textoProprio(el) && (s.overflowX === "hidden" || s.overflowY === "hidden" || s.overflowX === "clip" || s.overflowY === "clip"));
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
      // Esmagado também em grid (a faixa da grade é menor que o conteúdo do item) e em caixa de altura
      // fixa que corta o conteúdo. Fica de fora o que rola de propósito (overflow auto/scroll), o
      // corte intencional (reticências, line-clamp) e a caixa com texto próprio (vai como texto cortado).
      for (const el of visiveis) {
        const h = el as HTMLElement;
        if (soLeitor(el) || h.scrollHeight <= h.clientHeight + 2) continue;
        const s = getComputedStyle(el);
        const clamp = s.getPropertyValue("-webkit-line-clamp");
        if (/(auto|scroll)/.test(s.overflowY) || s.textOverflow === "ellipsis" || (clamp && clamp !== "none")) continue;
        const emGrid = el.parentElement ? getComputedStyle(el.parentElement).display.includes("grid") : false;
        const corta = s.overflowY === "hidden" || s.overflowY === "clip";
        if (!emGrid && !corta) continue;
        if (!el.textContent?.trim() && !el.querySelector(clicaveis)) continue;
        if (corta && textoProprio(el)) continue;
        add("esmagado", el, `altura ${px(h.clientHeight)}, o conteúdo pede ${px(h.scrollHeight)}${emGrid ? " (item de grid)" : " (altura fixa, conteúdo cortado)"}`);
      }

      // Texto sobreposto: linhas de texto de nós diferentes que se cruzam. Com um diálogo aberto, só
      // conta o texto de dentro dele: o resto da página está coberto de propósito.
      const dialogos = visiveis.filter((el) => el.matches("dialog[open], [role=dialog], [role=alertdialog], [aria-modal=true]"));
      const caixas: { r: DOMRect; dono: Element }[] = [];
      const percorrer = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = percorrer.nextNode(); n && caixas.length < 3000; n = percorrer.nextNode()) {
        const dono = n.parentElement;
        if (!dono || !n.textContent?.trim() || !visivel(dono) || Number(getComputedStyle(dono).opacity) < 0.05) continue;
        if (dialogos.length > 0 && !dialogos.some((d) => d.contains(dono))) continue;
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
      // A camada presa na tela (fixed ou sticky) de um elemento: a página rola por baixo dela de
      // propósito (barra de baixo do painel, cabeçalho do editor). Só textos da mesma camada contam.
      const camadas = new Map<Element, Element | null>();
      const camada = (el: Element): Element | null => {
        if (camadas.has(el)) return camadas.get(el)!;
        let presa: Element | null = null;
        for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
          if (/^(fixed|sticky)$/.test(getComputedStyle(a).position)) presa = a;
        }
        camadas.set(el, presa);
        return presa;
      };
      const vistos = new Set<string>();
      for (let i = 0; i < caixas.length; i++) {
        for (let j = i + 1; j < caixas.length; j++) {
          const a = caixas[i]!;
          const b = caixas[j]!;
          if (a.dono === b.dono || a.dono.contains(b.dono) || b.dono.contains(a.dono)) continue;
          if (camada(a.dono) !== camada(b.dono)) continue;
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

      // Menu escondido sem botão visível que o abra nem outra navegação visível no lugar dele. Só
      // conta como botão o que tem aria-controls apontando para o id do menu; como substituto, a
      // navegação com data-substitui="<id>" (a barra de baixo do painel no lugar do menu lateral, E49).
      for (const nav of document.querySelectorAll("nav")) {
        if (visivel(nav)) continue;
        const id = nav.id !== "" ? CSS.escape(nav.id) : null;
        const abre = id !== null && [...document.querySelectorAll(`[aria-controls="${id}"]`)].some(visivel);
        const substituto = id !== null && [...document.querySelectorAll(`[data-substitui="${id}"]`)].some(visivel);
        if (!abre && !substituto) {
          add("menu sem botão", nav, nav.id ? "escondido, sem botão visível que aponte para ele (aria-controls) e sem navegação no lugar dele (data-substitui)" : "escondido e sem id para um botão apontar");
        }
      }

      if (toque) {
        // Ações que só aparecem com o mouse por cima (e alvos pequenos): fica de fora o que é escondido
        // de propósito: texto só para leitor de tela, campo escondido sob um rótulo visível (ex.:
        // arquivo, o alvo é o rótulo) e o que está marcado como aria-hidden ou inert.
        const dePropósito = (el: Element) =>
          soLeitor(el) ||
          el.closest("[aria-hidden=true], [inert]") !== null ||
          (el instanceof HTMLInputElement && [...(el.labels ?? [])].some(visivel));

        // Alvos de toque pequenos: medidos fora daqui, por alvosDeToquePequenos (a mesma dos e2e).

        const nomeAcessivel = (el: Element) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ");
        // Há alternativa quando outro clicável visível tem o mesmo nome (ex.: a mesma ação no menu ⋯).
        const temAlternativa = (el: Element) => {
          const n = nomeAcessivel(el);
          return n !== "" && visiveis.some((o) => o !== el && ehClicavel(o) && !el.contains(o) && nomeAcessivel(o) === n);
        };
        const escondido = (el: Element) => {
          const s = getComputedStyle(el);
          return s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05;
        };

        // 1. Regra :hover que mostra uma ação que, no toque, continua escondida: defeito, salvo se a
        //    mesma ação aparece em outro lugar.
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
        const explicados = new Set<Element>();
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
            const acoes = ehClicavel(el) ? [el] : [...el.querySelectorAll(clicaveis)];
            if (!escondido(el) || acoes.length === 0 || dePropósito(el)) continue;
            for (const a of acoes) explicados.add(a);
            if (acoes.every(temAlternativa)) continue;
            add("só com o mouse", el, `só aparece com :hover (${regra.selectorText.slice(0, 60)})`);
          }
        }

        // 2. Clicável transparente ou invisível sem regra :hover que explique: não dá para saber se há
        //    outro caminho pelo toque, então vai para conferir à mão.
        const opacidade = (el: Element | null): number => (el ? Number(getComputedStyle(el).opacity) * opacidade(el.parentElement) : 1);
        for (const el of todos.filter(ehClicavel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || explicados.has(el) || dePropósito(el) || temAlternativa(el)) continue;
          if (opacidade(el) < 0.05 || getComputedStyle(el).visibility === "hidden") {
            add("conferir à mão", el, "clicável invisível no toque; confira se há outro caminho pelo toque");
          }
        }
      }

      // Um mesmo tipo e alvo uma vez só por tamanho.
      const unicos = new Map(pontos.map((p) => [`${p.tipo}|${p.alvo}`, p]));
      return [...unicos.values()];
    },
    { toque },
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
    print = `${nomeDoArquivo(base.tela)}-${base.modo.replace(/\s+/g, "-")}-${base.tema}-${base.largura}x${base.altura}.png`;
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

function nomeDoArquivo(tela: string) {
  return tela.replace(/^\//, "").replace(/[/?&=]/g, "_") || "inicio";
}

async function conferirPerfis(browser: Browser, tema: Tema, sessao: string | undefined) {
  for (const perfil of PERFIS) {
    const contexto: BrowserContext = await novoContexto(browser, tema, sessao, perfil.toque, perfil.largura, perfil.altura);
    const page = await contexto.newPage();
    // O perfil na outra posição (tablet em pé ↔ deitado), se houver um com toque.
    const girado = PERFIS.find((o) => o.toque && perfil.toque && o.largura === perfil.altura && o.altura === perfil.largura);
    for (const tela of telas) {
      // Volta à posição do perfil: a tela anterior pode ter terminado girada.
      await page.setViewportSize({ width: perfil.largura, height: perfil.altura });
      await page.goto(tela, { waitUntil: "networkidle" });
      // Print de referência para comparar com o Figma, com ou sem problema.
      await page.screenshot({ path: join(saida, `ref-${nomeDoArquivo(tela)}-${perfil.nome}-${tema}-${perfil.largura}x${perfil.altura}.png`), fullPage: true });
      const base = { tela, modo: perfil.nome, tema, largura: perfil.largura, altura: perfil.altura };
      await registrar(page, base, await medir(page, perfil.toque));
      if (girado) {
        // Gira sem recarregar. O que só aparece depois do giro (e não ao abrir já na outra posição)
        // é problema da troca de posição.
        const outra = await contexto.newPage();
        await outra.setViewportSize({ width: girado.largura, height: girado.altura });
        await outra.goto(tela, { waitUntil: "networkidle" });
        const recarregado = new Set((await medir(outra, true)).map((p) => `${p.tipo}|${p.alvo}`));
        await outra.close();
        await page.setViewportSize({ width: girado.largura, height: girado.altura });
        await assentar(page);
        const sóNoGiro = (await medir(page, true))
          .filter((p) => !recarregado.has(`${p.tipo}|${p.alvo}`))
          .map((p) => ({ ...p, tipo: `ao girar: ${p.tipo}` }));
        await registrar(page, { ...base, modo: `${perfil.nome} → ${girado.nome}`, largura: girado.largura, altura: girado.altura }, sóNoGiro);
      }
    }
    process.stdout.write(`  ${perfil.nome} · ${tema}: ok
`);
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
  const sessao = values.entrar ? await guardarSessao(browser) : undefined;
  for (const tema of TEMAS) {
    await varrer(browser, tema, sessao);
    await conferirPerfis(browser, tema, sessao);
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
