import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { RESPONSIVO } from "../playwright.config";
import type { PessoaDeTeste } from "../src/lib/acesso/pessoas-de-teste";
import { IDS_SIMULADOS } from "../src/lib/youtube/youtube";
import { alvosDeToquePequenos } from "./alvo-de-toque";
import { apertar } from "./entrar";
import { adicionarEpisodioPelaTela, campoDaqui, colarLink, consultar, idNovo, limparRadio, modal } from "./radio";
import { entrarComo, semAnimacao, semRolagemLateral, telaEstreita } from "./responsivo";

// Rádio Chofer no painel (US25, CA-US25.1, CA-US25.2, E61) pela tela, como a Comunicação faria: cola
// o link, ajusta, publica ou agenda, marca o último programa, tira do site e configura o programa
// ao vivo. O banco só é lido para conferir o resultado e, antes de cada teste, para começar do zero.

const pessoas = JSON.parse(readFileSync("e2e/.dados/pessoas.json", "utf8")) as Record<"adm" | "com" | "atd", PessoaDeTeste>;

test.beforeEach(limparRadio);
test.afterAll(limparRadio);

async function episodioPeloYoutube(youtubeId: string) {
  const [linha] = await consultar((sql) => sql<
    { id: string; numero: number; titulo: string; estado: string; duracao_seg: number | null; ultimo_programa: boolean; transcricao: string | null }[]
  >`select id, numero, titulo, estado, duracao_seg, ultimo_programa, transcricao from episodio where youtube_id = ${youtubeId}`);
  return linha!;
}

async function acoesNaAtividade(id: string) {
  const linhas = await consultar((sql) => sql<{ acao: string }[]>`select acao from atividade where alvo_id = ${id} order by id`);
  return linhas.map((l) => l.acao);
}

const linha = (page: Page, texto: string) => page.getByTestId("linha-episodio").filter({ hasText: texto });

test("CA-US25.1 · colar o link preenche título, capa e duração; ajustar e publicar", async ({ page }) => {
  const youtubeId = idNovo();
  await entrarComo(page, pessoas.com, "/painel/radio");
  await page.getByRole("button", { name: "Adicionar episódio" }).first().click();
  const m = modal(page);
  // O número vem preenchido com o maior + 1.
  await expect(m.getByLabel("Nº *")).toHaveValue("1");

  await colarLink(page, `https://www.youtube.com/watch?v=${youtubeId}`);
  const achado = m.getByTestId("video-encontrado");
  await expect(achado).toContainText("Vídeo encontrado");
  await expect(achado).toContainText(`“Rádio Chofer — vídeo ${youtubeId}” · 28:10 · canal SINTRAVC`);
  // A capa vem pela rota do painel, nunca do i.ytimg.com no navegador.
  await expect(achado.locator("img")).toHaveAttribute("src", `/painel/radio/capa/${youtubeId}`);
  await expect(m.getByLabel("Título no site *")).toHaveValue(`Rádio Chofer — vídeo ${youtubeId}`);
  await expect(m.getByLabel("Duração")).toHaveValue("28:10");
  await expect(m.getByText("Veio do YouTube (28 minutos e 10 segundos). Pode ajustar.")).toBeVisible();

  // Tudo pode ser ajustado antes de salvar.
  await m.getByLabel("Título no site *").fill("Saúde mental no volante");
  await m.getByLabel("Duração").fill("28:15");
  await m.getByLabel("Resumo").fill("Psicóloga explica como lidar com o estresse do trânsito.");
  await m.getByLabel("Exibição *").fill(campoDaqui(-60));
  await m.getByRole("button", { name: "Publicar episódio", exact: true }).click();
  await expect(m).toBeHidden();
  await expect(page.getByText("Episódio publicado: já está no site")).toBeVisible();

  const novo = linha(page, "Saúde mental no volante");
  await expect(novo).toContainText("Ep. 1");
  await expect(novo).toContainText("Publicado");
  // A duração aparece como no Figma e, para o leitor de tela, por extenso.
  await expect(novo.getByText("28:15", { exact: true })).toBeVisible();
  await expect(novo).toContainText("28 minutos e 15 segundos · YouTube");
  const ep = await episodioPeloYoutube(youtubeId);
  expect(ep).toMatchObject({ titulo: "Saúde mental no volante", estado: "publicado", duracao_seg: 1695 });
  expect(await acoesNaAtividade(ep.id)).toEqual(["episodio.criar", "episodio.publicar"]);
});

test("CA-US25.2 · link que não é do YouTube e vídeo privado mostram a mensagem, sem salvar", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  await page.getByRole("button", { name: "Adicionar episódio" }).first().click();
  const m = modal(page);

  await colarLink(page, "https://vimeo.com/123456789");
  await expect(m.getByText("Este link não é de um vídeo do YouTube.", { exact: false })).toBeVisible();
  await expect(m.getByLabel("Link do vídeo no YouTube *")).toHaveAttribute("aria-invalid", "true");
  await expect(m.getByTestId("video-encontrado")).toHaveCount(0);

  // Tentar adicionar assim também não vai.
  await m.getByLabel("Título no site *").fill("Um título");
  await m.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(m.getByText("Este link não é de um vídeo do YouTube.", { exact: false })).toBeVisible();
  await expect(m.getByLabel("Link do vídeo no YouTube *")).toBeFocused();

  await colarLink(page, `https://youtu.be/${IDS_SIMULADOS.naoEncontrado}`);
  await expect(m.getByText(/Não encontramos esse vídeo/)).toBeVisible();
  expect(await consultar((sql) => sql`select id from episodio`)).toHaveLength(0);
});

test("sem a chave do YouTube (D4), a duração é digitada à mão; o YouTube fora do ar deixa preencher tudo", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  await page.getByRole("button", { name: "Adicionar episódio" }).first().click();
  const m = modal(page);
  await colarLink(page, `https://youtu.be/${IDS_SIMULADOS.semDuracao}`);
  await expect(m.getByTestId("video-encontrado")).toContainText("Vídeo encontrado");
  await expect(m.getByLabel("Duração")).toHaveValue("");
  await m.getByLabel("Duração").fill("31");
  await m.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(m.getByText("Digite a duração como 28:10 ou 1:02:30.")).toBeVisible();
  await m.getByLabel("Duração").fill("31:02");
  await m.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(m).toBeHidden();
  expect(await episodioPeloYoutube(IDS_SIMULADOS.semDuracao)).toMatchObject({ estado: "rascunho", duracao_seg: 1862 });
  await expect(page.getByTestId("linha-episodio").first()).toContainText("Rascunho");

  await page.getByRole("button", { name: "Adicionar episódio" }).first().click();
  await colarLink(page, `https://youtu.be/${IDS_SIMULADOS.foraDoAr}`);
  await expect(m.getByTestId("video-encontrado")).toContainText("Não conseguimos falar com o YouTube agora");
  await expect(m.getByLabel("Título no site *")).toHaveValue("");
});

test("agendar: fica Agendado, fora do site; a transcrição fica guardada", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  const youtubeId = await adicionarEpisodioPelaTela(page, {
    titulo: "Jornada, escala e a saúde de quem dirige",
    exibicaoEmMinutos: 3 * 24 * 60,
    transcricao: "Bom dia, rodoviários!\nHoje o assunto é a jornada.",
  });
  await expect(page.getByText(/^Episódio agendado para \d{2}\/\d{2}\/\d{4} às \d{2}h\d{2}$/)).toBeVisible();
  await expect(linha(page, "Jornada, escala")).toContainText("Agendado");
  const ep = await episodioPeloYoutube(youtubeId);
  expect(ep).toMatchObject({ estado: "agendado", transcricao: "Bom dia, rodoviários!\nHoje o assunto é a jornada." });
  expect(await acoesNaAtividade(ep.id)).toEqual(["episodio.criar", "episodio.agendar"]);
});

test("último programa: marcar outro substitui o anterior, pelo modal e pelo menu ⋯", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  await adicionarEpisodioPelaTela(page, { titulo: "Episódio A", numero: "41", ultimo: true });
  await expect(linha(page, "Episódio A")).toContainText("Último programa");

  // O modal avisa qual será substituído.
  await page.getByRole("button", { name: "Adicionar episódio" }).first().click();
  await expect(modal(page).getByText("Substitui o Ep. 41 na Home e no topo da página Rádio Chofer.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal(page)).toBeHidden();

  await adicionarEpisodioPelaTela(page, { titulo: "Episódio B", numero: "42" });
  await linha(page, "Episódio B").getByRole("button", { name: "Ações do Ep. 42" }).click();
  await page.getByRole("menuitem", { name: "Marcar como último programa" }).click();
  await expect(page.getByText("Ep. 42 agora é o último programa")).toBeVisible();
  await expect(linha(page, "Episódio B")).toContainText("Último programa");
  await expect(linha(page, "Episódio A")).not.toContainText("Último programa");
  const marcados = await consultar((sql) => sql<{ numero: number }[]>`select numero from episodio where ultimo_programa order by numero`);
  expect(marcados.map((m) => m.numero)).toEqual([42]);
});

test("tirar do site pede confirmação e volta a rascunho; excluir só aparece no rascunho que nunca foi ao ar", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  const youtubeId = await adicionarEpisodioPelaTela(page, { titulo: "Para tirar do site", numero: "7" });

  await linha(page, "Para tirar do site").getByRole("button", { name: "Ações do Ep. 7" }).click();
  await expect(page.getByRole("menuitem", { name: "Excluir" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Tirar do site" }).click();
  const confirmacao = page.getByRole("alertdialog", { name: "Tirar o Ep. 7 do site?" });
  await expect(confirmacao).toContainText("volta para os rascunhos");
  await confirmacao.getByRole("button", { name: "Tirar do site" }).click();
  await expect(page.getByText("Ep. 7 saiu do site e voltou para os rascunhos")).toBeVisible();
  await expect(linha(page, "Para tirar do site")).toContainText("Rascunho");
  const ep = await episodioPeloYoutube(youtubeId);
  expect(ep.estado).toBe("rascunho");
  expect((await acoesNaAtividade(ep.id)).at(-1)).toBe("episodio.tirar_do_site");

  // Já foi ao ar: continua sem “Excluir”.
  await linha(page, "Para tirar do site").getByRole("button", { name: "Ações do Ep. 7" }).click();
  await expect(page.getByRole("menuitem", { name: "Excluir" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Um rascunho novo pode ser excluído, com confirmação.
  await page.getByRole("button", { name: "Adicionar episódio" }).first().click();
  const rascunho = idNovo();
  await colarLink(page, `https://youtu.be/${rascunho}`);
  await expect(modal(page).getByTestId("video-encontrado")).toBeVisible();
  await modal(page).getByLabel("Nº *").fill("8");
  await modal(page).getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(modal(page)).toBeHidden();
  await page.getByRole("button", { name: "Ações do Ep. 8" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("alertdialog", { name: "Excluir rascunho?" }).getByRole("button", { name: "Excluir rascunho" }).click();
  await expect(page.getByText("Rascunho excluído")).toBeVisible();
  expect(await consultar((sql) => sql`select id from episodio where youtube_id = ${rascunho}`)).toHaveLength(0);
});

test("editar um episódio no ar: abre com os dados e as mudanças valem na hora", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  const youtubeId = await adicionarEpisodioPelaTela(page, { titulo: "Título antigo", numero: "12" });
  await page.getByRole("button", { name: "Ações do Ep. 12" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  const m = modal(page);
  await expect(m.getByRole("heading", { name: "Editar episódio" })).toBeVisible();
  await expect(m.getByLabel("Link do vídeo no YouTube *")).toHaveValue(`https://www.youtube.com/watch?v=${youtubeId}`);
  await expect(m.getByLabel("Título no site *")).toHaveValue("Título antigo");
  await expect(m.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await m.getByLabel("Título no site *").fill("Título novo");
  await m.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Episódio atualizado no site")).toBeVisible();
  await expect(linha(page, "Título novo")).toContainText("Publicado");
});

test("programa ao vivo: o interruptor grava na hora e o diálogo muda canal, dias e horário", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel/radio");
  const cartao = page.getByRole("region", { name: "Programa ao vivo" });
  await expect(cartao.getByRole("button", { name: /Dias e horário Segunda a sexta · 13h/ })).toBeVisible();

  const interruptor = cartao.getByRole("switch", { name: "Programa ao vivo" });
  await expect(interruptor).toHaveAttribute("aria-checked", "true");
  await interruptor.click();
  await expect(page.getByText("Programa ao vivo desligado: o horário saiu do site")).toBeVisible();
  await expect(interruptor).toHaveAttribute("aria-checked", "false");
  const [programa] = await consultar((sql) => sql<{ ativo: boolean }[]>`select (dados -> 'programa' ->> 'ativo')::boolean as ativo from config_site`);
  expect(programa?.ativo).toBe(false);

  await cartao.getByRole("button", { name: /Dias e horário/ }).click();
  const d = modal(page);
  await expect(d.getByRole("heading", { name: "Programa ao vivo" })).toBeVisible();
  await d.getByLabel("Canal no YouTube").fill("youtube.com/@sintravc");
  await d.getByRole("checkbox", { name: "sábado" }).click();
  await expect(d.getByText("No site: “Segunda a sábado · 13h”.")).toBeVisible();
  await d.getByLabel("Começa às").fill("12:30");
  await d.getByLabel("Termina às").fill("12:00");
  await d.getByRole("button", { name: "Salvar" }).click();
  await expect(d.getByText("O fim tem de ser depois do início.")).toBeVisible();
  await d.getByLabel("Termina às").fill("14:00");
  await d.getByRole("button", { name: "Salvar" }).click();
  await expect(d).toBeHidden();
  await expect(page.getByText("Programa ao vivo salvo")).toBeVisible();
  await expect(cartao.getByRole("button", { name: /Dias e horário Segunda a sábado · 12h30/ })).toBeVisible();
  await expect(cartao.getByRole("button", { name: /Canal no YouTube youtube\.com\/@sintravc/ })).toBeVisible();

  const [registro] = await consultar((sql) => sql<{ acao: string }[]>`
    select acao from atividade where acao = 'radio.programa_editar' order by id desc limit 1`);
  expect(registro?.acao).toBe("radio.programa_editar");
});

test("o Atendimento não abre o Rádio Chofer (403)", async ({ page }) => {
  await entrarComo(page, pessoas.atd, "/painel");
  const resposta = await page.goto("/painel/radio");
  expect(resposta?.status()).toBe(403);
});

test("“Criar conteúdo › Episódio da Rádio Chofer” abre o modal vazio", async ({ page }) => {
  await entrarComo(page, pessoas.com, "/painel");
  await page.getByRole("button", { name: "Criar conteúdo" }).first().click();
  await page.getByRole("menuitem", { name: /Episódio da Rádio Chofer/ }).click();
  await expect(modal(page).getByRole("heading", { name: "Adicionar episódio" })).toBeVisible();
  await expect(page).toHaveURL(/\/painel\/radio$/);
});

test.describe("Rádio Chofer no celular", { tag: "@responsivo" }, () => {
  test("adicionar pela folha de baixo, cartões na lista e o programa ao vivo sem rolagem lateral", async ({ page, hasTouch }) => {
    await entrarComo(page, pessoas.com, "/painel/radio", { toque: hasTouch });
    const estreita = telaEstreita(page);
    await adicionarEpisodioPelaTela(page, { titulo: "Episódio pelo celular", numero: "3" }, { toque: hasTouch, estreita });

    if (estreita) {
      await expect(page.getByTestId("cartao-episodio").filter({ hasText: "Episódio pelo celular" })).toBeVisible();
      await expect(page.getByTestId("linha-episodio").first()).toBeHidden();
    } else {
      await expect(page.getByTestId("linha-episodio").filter({ hasText: "Episódio pelo celular" })).toBeVisible();
    }
    await semRolagemLateral(page);
    if (hasTouch) {
      await semAnimacao(page);
      const pequenos = await page.evaluate(alvosDeToquePequenos, RESPONSIVO.alvoDeToque);
      expect(pequenos.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }

    // O modal também cabe, sem rolagem lateral, com os alvos de toque.
    await apertar(page.getByRole("button", { name: "Adicionar episódio" }).first(), hasTouch);
    await expect(modal(page).getByRole("heading", { name: "Adicionar episódio" })).toBeVisible();
    await colarLink(page, `https://youtu.be/${idNovo()}`);
    await expect(modal(page).getByTestId("video-encontrado")).toBeVisible();
    await semRolagemLateral(page);
    if (hasTouch) {
      await semAnimacao(page);
      const noModal = await page.evaluate(alvosDeToquePequenos, { minimo: RESPONSIVO.alvoDeToque, dentro: '[role="dialog"]' });
      expect(noModal.map((p) => `${p.alvo} · ${p.tamanho}`)).toEqual([]);
    }
  });
});
