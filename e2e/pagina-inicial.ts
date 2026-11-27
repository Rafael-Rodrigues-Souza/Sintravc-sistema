import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";
import sharp from "sharp";

import { apertar } from "./entrar";
import { consultar } from "./radio";

/**
 * Ajudantes dos e2e da Página inicial (E62). A Home é uma só no banco: cada teste volta ao estado da
 * migração (só o slide do programa, no rascunho e no publicado), para não mexer na Home que os
 * outros specs abrem.
 */
export async function limparHome() {
  await consultar((sql) => sql`delete from destaque_home returning id`);
  await consultar((sql) => sql`delete from midia_uso where dono_tipo = 'destaque' returning midia_id`);
  await consultar(
    (sql) => sql`
      insert into destaque_home (versao, posicao, item_tipo)
      values ('rascunho', 1, 'programa'), ('publicado', 1, 'programa')
      returning id`,
  );
  await consultar((sql) => sql`update pagina_inicial set revisao = revisao + 1, salvo_em = null, salvo_por = null returning id`);
  await consultar((sql) => sql`delete from episodio where titulo like 'Home e2e%' returning id`);
  // As fotos das Chamadas (as do banco e as enviadas pela tela): a Mídia fica como estava (o midia.spec começa vazio).
  await consultar((sql) => sql`delete from midia where nome_arquivo like 'home-e2e-%' or nome_arquivo like 'chamada-e2e-%' returning id`);
}

/**
 * Apaga a notícia publicada pelo teste e a capa dela na Mídia (testes limpam o que criam: o
 * midia.spec começa com a Mídia vazia).
 */
export async function apagarNoticiaComCapa(titulo: string) {
  const linhas = await consultar(
    (sql) => sql<{ id: string; capa: string | null }[]>`
      select c.id, n.capa_midia_id as capa from conteudo c join noticia n on n.conteudo_id = c.id where c.titulo = ${titulo}`,
  );
  for (const { id, capa } of linhas) {
    await consultar((sql) => sql`delete from conteudo where id = ${id} returning id`);
    if (capa) {
      await consultar((sql) => sql`delete from midia_uso where midia_id = ${capa} returning midia_id`);
      await consultar((sql) => sql`delete from midia where id = ${capa} returning id`);
    }
  }
}

/**
 * O carrossel publicado com um slide de cada tipo (E62, E63), direto no banco: a notícia dada (com
 * capa), o episódio dado, o programa e duas Chamadas, uma para o Filie-se e outra para Benefícios. A
 * foto das Chamadas é só uma linha da Mídia (o e2e confere o texto alternativo, não a imagem).
 */
export async function carrosselMisturado({ noticiaId, episodioId }: { noticiaId: string; episodioId: string }) {
  const [pessoa] = await consultar((sql) => sql<{ id: string }[]>`select id from pessoa_equipe where perfil = 'COM' order by criado_em limit 1`);
  const fotos = [];
  for (const n of [1, 2]) {
    const [foto] = await consultar(
      (sql) => sql<{ id: string }[]>`
        insert into midia (chave_r2, nome_arquivo, tipo, mime, largura, altura, bytes, alt, enviado_por)
        values (${`e2e/home-e2e-${randomUUID()}.jpg`}, ${`home-e2e-${n}.jpg`}, 'imagem', 'image/jpeg', 1600, 900, 1000, ${`Foto de teste ${n}`}, ${pessoa!.id})
        returning id`,
    );
    fotos.push(foto!.id);
  }
  const chamadas = [
    { id: randomUUID(), foto: fotos[0]!, frase: "Seu sindicato é feito por quem está ao volante.", apoio: "Faça parte.", destino: "filie_se" },
    { id: randomUUID(), foto: fotos[1]!, frase: "Conheça o que o associado tem direito.", apoio: "Veja na página Benefícios.", destino: "beneficios" },
  ];
  await consultar((sql) => sql`delete from destaque_home where versao = 'publicado' returning id`);
  await consultar(
    (sql) => sql`
      insert into destaque_home (versao, posicao, item_tipo, item_id) values
        ('publicado', 1, 'noticia', ${noticiaId}), ('publicado', 2, 'episodio', ${episodioId}), ('publicado', 3, 'programa', null)
      returning id`,
  );
  for (const [i, c] of chamadas.entries()) {
    await consultar(
      (sql) => sql`
        insert into destaque_home (versao, posicao, item_tipo, item_id, frase_chamada, foto_midia_id, foto_alt, texto_apoio, destino)
        values ('publicado', ${4 + i}, 'chamada', ${c.id}, ${c.frase}, ${c.foto}, ${`Foto de teste ${i + 1}`}, ${c.apoio}, ${c.destino})
        returning id`,
    );
  }
  return chamadas;
}

/** Um episódio no ar, direto no banco (o fluxo do episódio tem os próprios e2e, #17). */
export async function episodioNoAr(titulo: string) {
  const [criador] = await consultar((sql) => sql<{ id: string }[]>`select id from pessoa_equipe where perfil = 'COM' order by criado_em limit 1`);
  const [linha] = await consultar(
    (sql) => sql<{ id: string }[]>`
      insert into episodio (numero, youtube_id, titulo, estado, ja_publicado, exibicao_em, publicado_em, criado_por, atualizado_por)
      values (
        (select coalesce(max(numero), 0) + 1 from episodio), ${randomUUID().replace(/-/g, "").slice(0, 11)}, ${titulo},
        'publicado', true, now() - interval '1 day', now() - interval '1 day', ${criador!.id}, ${criador!.id})
      returning id`,
  );
  return linha!.id;
}

export const itensDoCarrossel = (page: Page) => page.getByTestId("item-carrossel");

/** Os títulos do carrossel no painel, na ordem. */
export async function ordemNoPainel(page: Page) {
  return (await itensDoCarrossel(page).locator("p.texto-titulo-card-pequeno").allTextContents()).map((t) => t.trim());
}

/** Os títulos dos slides da Home (site ou prévia), na ordem. */
export async function ordemNaHome(page: Page) {
  // O texto de verdade (o CSS põe o título em maiúsculas).
  return (await page.getByTestId("slide-home").getByRole("heading", { level: 2, includeHidden: true }).allTextContents()).map((t) => t.trim());
}

/**
 * “Adicionar destaque” › Chamada pela tela (E63): envia uma imagem de teste pelo seletor da Mídia,
 * descreve a foto e escreve a frase e o texto de apoio. O destino padrão é Filie-se.
 */
export async function adicionarChamadaPelaTela(
  page: Page,
  { frase, apoio, alt, destino }: { frase: string; apoio: string; alt: string; destino?: "Benefícios" },
  { toque = false } = {},
) {
  await apertar(page.getByRole("button", { name: "Adicionar destaque" }), toque);
  const janela = page.getByRole("dialog", { name: "Adicionar destaque" });
  await apertar(janela.getByText("Chamada", { exact: true }), toque);
  await apertar(janela.getByRole("button", { name: "Escolher foto" }), toque);
  const seletor = page.getByRole("dialog", { name: "Foto da Chamada" });
  const foto = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#e8b53a" } }).png().toBuffer();
  const nome = `chamada-e2e-${Date.now()}.png`;
  await seletor.getByTestId("entrada-arquivos").setInputFiles({ name: nome, mimeType: "image/png", buffer: foto });
  await expect(seletor.getByRole("button", { name: nome, pressed: true })).toBeVisible();
  await apertar(seletor.getByRole("button", { name: "Usar este arquivo" }), toque);
  await expect(seletor).toBeHidden();
  await janela.getByLabel("Texto alternativo da foto").fill(alt);
  await janela.getByLabel("Frase", { exact: true }).fill(frase);
  await janela.getByLabel("Texto de apoio").fill(apoio);
  if (destino) await apertar(janela.getByText(destino, { exact: true }), toque);
  await apertar(janela.getByRole("button", { name: "Pôr no carrossel" }), toque);
  await expect(janela).toBeHidden();
}

export async function esperarSalvo(page: Page) {
  await expect(page.getByTestId("status-do-salvamento")).toContainText(/Salvo automaticamente às|Salvo às/);
}

/**
 * “Adicionar destaque” pela tela: o tipo, a busca e a escolha na lista. As datas são opcionais
 * (valor do campo datetime-local, no horário da Bahia).
 */
export async function adicionarDestaquePelaTela(
  page: Page,
  {
    tipo,
    titulo,
    entraEm,
    saiEm,
    frase,
  }: { tipo: "Notícia" | "Episódio" | "Programa Rádio Chofer"; titulo?: string; entraEm?: string; saiEm?: string; frase?: string },
  { toque = false } = {},
) {
  await apertar(page.getByRole("button", { name: "Adicionar destaque" }), toque);
  const janela = page.getByRole("dialog", { name: "Adicionar destaque" });
  await expect(janela).toBeVisible();
  // E63: episódio e programa ficam na aba “Rádio Chofer” (sempre o último programa ou um episódio).
  await apertar(janela.getByText(tipo === "Notícia" ? "Notícia" : "Rádio Chofer", { exact: true }), toque);
  if (tipo === "Programa Rádio Chofer") {
    await apertar(janela.getByText("Sempre o último programa", { exact: true }), toque);
    await expect(janela.getByRole("radio", { name: /Sempre o último programa/ })).toBeChecked();
  }
  if (titulo) {
    await janela.getByLabel(tipo === "Episódio" ? "Buscar episódio" : "Buscar notícia").fill(titulo);
    await apertar(janela.getByRole("radio", { name: new RegExp(titulo) }).locator(".."), toque);
  }
  if (frase) await janela.getByLabel("Frase de chamada (opcional)").fill(frase);
  if (entraEm) await janela.getByLabel("Entra em").fill(entraEm);
  if (saiEm) await janela.getByLabel("Sai em").fill(saiEm);
  await apertar(janela.getByRole("button", { name: "Pôr no carrossel" }), toque);
  await expect(janela).toBeHidden();
}
