/**
 * Abre as telas em 375, 768 e 1280 px, nos temas claro e escuro, salva os prints e procura
 * problemas de responsividade que dá para medir. O resto (itens que não empilham, comparação
 * com o Figma) fica para quem olha os prints. Não corrige nada.
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
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium, type Browser, type Page } from "@playwright/test";

import { codigoTotp } from "../../../src/lib/acesso/totp";

const LARGURAS = [375, 768, 1280] as const;
const TEMAS = ["claro", "escuro"] as const;
const ALVO_MINIMO = 44;

type Ponto = { tipo: string; detalhe: string };
type Resultado = { tela: string; largura: number; tema: string; print: string; pontos: Ponto[] };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    entrar: { type: "boolean", default: false },
    saida: { type: "string" },
  },
});

if (positionals.length === 0) {
  console.error("Diga as telas: conferir.ts inicio painel/entrar");
  process.exit(1);
}
const telas = positionals.map((t) => (t === "inicio" ? "/" : `/${t.replace(/^\/+/, "")}`));

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

/** Medições feitas dentro da página. Devolve os pontos encontrados. */
async function medir(page: Page): Promise<Ponto[]> {
  return page.evaluate((alvo) => {
    const pontos: { tipo: string; detalhe: string }[] = [];
    const largura = document.documentElement.clientWidth;
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const nome = (el: Element) => {
      const texto = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const id = el.id ? `#${el.id}` : "";
      return `<${el.tagName.toLowerCase()}${id}> “${texto}”`;
    };

    // 1. Rolagem lateral, e quem passa da borda.
    if (document.documentElement.scrollWidth > largura) {
      pontos.push({ tipo: "rolagem lateral", detalhe: `a página tem ${document.documentElement.scrollWidth} px para ${largura} px de tela` });
    }
    const vazando = [...document.body.querySelectorAll("*")].filter((el) => {
      if (!visivel(el)) return false;
      const r = el.getBoundingClientRect();
      return r.right > largura + 1 || r.left < -1;
    });
    // Só os mais externos: o filho de quem vaza também vaza.
    for (const el of vazando.filter((el) => !vazando.includes(el.parentElement as Element)).slice(0, 10)) {
      const r = el.getBoundingClientRect();
      pontos.push({ tipo: "passa da borda", detalhe: `${nome(el)} vai de ${Math.round(r.left)} a ${Math.round(r.right)} px` });
    }

    // 2. Texto cortado (reticências, line-clamp ou overflow escondido com conteúdo maior).
    for (const el of document.body.querySelectorAll("*")) {
      if (!visivel(el) || !el.textContent?.trim()) continue;
      const s = getComputedStyle(el);
      const corta = s.overflowX === "hidden" || s.overflowY === "hidden" || s.overflow === "clip" || s.textOverflow === "ellipsis";
      if (!corta) continue;
      const h = el as HTMLElement;
      if (h.scrollWidth > h.clientWidth + 1 || h.scrollHeight > h.clientHeight + 1) {
        pontos.push({ tipo: "texto cortado", detalhe: nome(el) });
      }
    }

    // 3. Alvos de toque menores que 44 px.
    const clicaveis = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch], [role=menuitem]";
    for (const el of document.querySelectorAll(clicaveis)) {
      if (!visivel(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < alvo || r.height < alvo) {
        pontos.push({ tipo: "alvo pequeno", detalhe: `${nome(el)} tem ${Math.round(r.width)}×${Math.round(r.height)} px` });
      }
    }

    // 4. Menu escondido sem botão visível que o abra.
    for (const nav of document.querySelectorAll("nav")) {
      if (visivel(nav)) continue;
      const botoes = [...document.querySelectorAll("[aria-controls], [aria-expanded], [aria-haspopup]")].filter(visivel);
      const abre = botoes.some((b) => (nav.id && b.getAttribute("aria-controls") === nav.id) || b.hasAttribute("aria-expanded"));
      if (!abre) pontos.push({ tipo: "menu sem botão", detalhe: `${nome(nav)} está escondido e nada visível o abre` });
    }

    return pontos;
  }, ALVO_MINIMO);
}

async function main() {
  const browser = await chromium.launch();
  const sessao = values.entrar ? await entrarNoPainel(browser) : undefined;
  const resultados: Resultado[] = [];

  for (const tema of TEMAS) {
    for (const largura of LARGURAS) {
      const contexto = await browser.newContext({
        baseURL: values.url,
        viewport: { width: largura, height: largura < 768 ? 812 : 1000 },
        isMobile: largura < 768,
        hasTouch: largura < 1280,
        colorScheme: tema === "escuro" ? "dark" : "light",
        locale: "pt-BR",
        timezoneId: "America/Bahia",
        storageState: sessao,
      });
      // O next-themes guarda a escolha em "theme": força o tema mesmo se alguém já escolheu outro.
      await contexto.addInitScript((t) => localStorage.setItem("theme", t), tema === "escuro" ? "dark" : "light");
      // O tsx embrulha as funções em __name(); a função de medir roda no navegador, onde ele não existe.
      await contexto.addInitScript("window.__name = (f) => f");
      const page = await contexto.newPage();

      for (const tela of telas) {
        await page.goto(tela, { waitUntil: "networkidle" });
        const arquivo = `${tela.replace(/^\//, "").replace(/[/?&=]/g, "_") || "inicio"}-${largura}-${tema}.png`;
        await page.screenshot({ path: join(saida, arquivo), fullPage: true });
        resultados.push({ tela, largura, tema, print: arquivo, pontos: await medir(page) });
      }
      await contexto.close();
    }
  }
  await browser.close();

  writeFileSync(join(saida, "resultado.json"), JSON.stringify(resultados, null, 2));
  for (const r of resultados) {
    console.log(`\n${r.tela} · ${r.largura} px · ${r.tema} · ${join(saida, r.print)}`);
    if (r.pontos.length === 0) console.log("  nada medido");
    for (const p of r.pontos) console.log(`  - ${p.tipo}: ${p.detalhe}`);
  }
  console.log(`\nPrints e resultado.json em ${saida}`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
