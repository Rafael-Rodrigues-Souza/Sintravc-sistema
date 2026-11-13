import type { Locator, Page } from "@playwright/test";

import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { codigoTotp } from "../src/lib/acesso/totp";

export type Credenciais = Pick<PessoaDeTeste, "email" | "senha" | "segredoTotp">;

/** Toca no celular e no tablet; clica com o mouse no notebook e no desktop. */
export async function apertar(alvo: Locator, toque: boolean) {
  if (toque) await alvo.tap();
  else await alvo.click();
}

/**
 * Entra no painel pela tela de entrar, que já precisa estar aberta: e-mail, senha, “Continuar”,
 * código das duas etapas e “Confirmar e entrar”. Termina quando a página sai de /painel/entrar.
 * Usado pelos e2e e pela skill conferir-responsivo.
 */
export async function entrarNoPainel(page: Page, pessoa: Credenciais, { toque = false } = {}) {
  await page.getByLabel("E-mail de trabalho").fill(pessoa.email);
  await page.getByLabel("Senha").fill(pessoa.senha);
  // Espera a resposta da server action antes de seguir (o React limpa o formulário ao terminar).
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    apertar(page.getByRole("button", { name: "Continuar" }), toque),
  ]);
  await page.getByLabel("Número 1 de 6").fill(await codigoTotp(pessoa.segredoTotp));
  await apertar(page.getByRole("button", { name: "Confirmar e entrar" }), toque);
  await page.waitForURL((url) => !url.pathname.startsWith("/painel/entrar"));
}
