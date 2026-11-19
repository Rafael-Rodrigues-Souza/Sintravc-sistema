import { expect, test, type Locator, type Page } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import { entrarComoAdm, telaEstreita } from "./responsivo";

// Logo nova no painel e ícone da aba (issue #61). O e-mail fica no convite.spec.ts.

/** A imagem carregou (não é um quadrado quebrado) e vem da pasta da marca nova. */
async function logoCarregada(img: Locator) {
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /marca%2Fsintravc-escura|\/marca\/sintravc-escura/);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
}

/** O ícone do <link rel> responde 200 com uma imagem PNG. */
async function iconeResponde(page: Page, rel: string) {
  const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute("href");
  expect(href, `<link rel="${rel}">`).toBeTruthy();
  const resposta = await page.request.get(href!);
  expect(resposta.status(), `${rel} ${href}`).toBe(200);
  expect(resposta.headers()["content-type"]).toBe("image/png");
}

for (const tema of ["claro", "escuro"] as const) {
  test.describe(`marca no tema ${tema}`, { tag: "@responsivo" }, () => {
    test.use({ colorScheme: tema === "escuro" ? "dark" : "light" });

    test("tela de acesso e painel com a logo nova, ícone da aba e logo que leva ao início", async ({ page, hasTouch }) => {
      await page.goto("/painel/entrar");
      // Coluna da marca: marinha nos dois temas, com a versão branca.
      await logoCarregada(page.getByRole("img", { name: "SINTRAVC", exact: true }));
      await iconeResponde(page, "icon");
      await iconeResponde(page, "apple-touch-icon");

      await entrarComoAdm(page, "/painel/conteudos", { toque: hasTouch });
      // Abaixo do menu lateral, a logo fica no topo do celular; acima, no menu lateral (E49).
      const seletor = telaEstreita(page) ? "header" : "#menu-do-painel";
      const area = page.locator(seletor).first();
      const link = area.getByRole("link", { name: "SINTRAVC · Painel" });
      await logoCarregada(link.getByRole("img"));
      // Só a versão branca aparece: a clara (do site) não entra no painel.
      await expect(page.locator('img[src*="sintravc-clara"]')).toHaveCount(0);

      if (!telaEstreita(page)) {
        // No menu lateral, a logo fica centralizada, no mesmo eixo do “Criar conteúdo”.
        const meio = async (el: Locator) => {
          const caixa = (await el.boundingBox())!;
          return caixa.x + caixa.width / 2;
        };
        const criar = area.getByRole("button", { name: "Criar conteúdo" });
        expect(Math.abs((await meio(link)) - (await meio(criar))), "logo no eixo do “Criar conteúdo”").toBeLessThanOrEqual(1);
      }

      if (hasTouch) {
        const pequenos = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: seletor });
        expect(pequenos.filter((p) => p.alvo.includes("SINTRAVC")), "a logo tem área de toque mínima").toEqual([]);
        await apertar(link, true);
      } else {
        // Teclado: com o foco na logo, o Enter leva ao início do painel.
        await link.focus();
        await expect(link).toBeFocused();
        await page.keyboard.press("Enter");
      }
      await expect(page).toHaveURL(/\/painel$/);
    });
  });
}
