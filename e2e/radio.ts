import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

import { ambienteE2E } from "../playwright.config";
import { bahiaEmCampos } from "../src/lib/datas";
import { apertar } from "./entrar";

/**
 * Ajudantes dos e2e do Rádio Chofer (E61). O YouTube é o simulado (YOUTUBE_SIMULADO=1): qualquer id
 * acha um vídeo “Rádio Chofer — vídeo <id>” de 28:10; os ids de IDS_SIMULADOS simulam os erros.
 */

export async function consultar<T extends object>(consulta: (sql: postgres.Sql) => Promise<T[]>) {
  const sql = postgres(ambienteE2E.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    return await consulta(sql);
  } finally {
    await sql.end();
  }
}

/** Um id de vídeo novo (11 caracteres), para cada teste não esbarrar no vídeo de outro. */
export const idNovo = () => randomUUID().replace(/-/g, "").slice(0, 11);

/** Cada teste começa sem episódios (o site mostra tudo o que está no ar) e com o programa do seed. */
export async function limparRadio() {
  await consultar((sql) => sql`delete from midia_uso where dono_tipo = 'episodio' returning midia_id`);
  await consultar((sql) => sql`delete from episodio returning id`);
  await consultar((sql) => sql`
    update config_site set dados = jsonb_set(dados, '{programa}', jsonb_build_object(
      'ativo', true, 'canal', dados -> 'redes' -> 'youtube', 'dias', '[1,2,3,4,5]'::jsonb, 'inicio', '13:00', 'fim', '14:00'))
    where id = 'site' returning id`);
}

/** "AAAA-MM-DDTHH:MM" (campo datetime-local), daqui a `minutos`, no horário da Bahia. */
export function campoDaqui(minutos: number) {
  const { data, hora } = bahiaEmCampos(new Date(Date.now() + minutos * 60_000));
  return `${data}T${hora}`;
}

export const modal = (page: Page) => page.getByRole("dialog");

/** Cola o link no campo do modal, como a pessoa faria (o colar dispara a busca). */
export async function colarLink(page: Page, link: string) {
  const campo = modal(page).getByLabel("Link do vídeo no YouTube *");
  await campo.click();
  await page.evaluate((texto) => {
    const alvo = document.activeElement as HTMLInputElement;
    const dados = new DataTransfer();
    dados.setData("text/plain", texto);
    // O navegador do teste não cola sozinho: o evento de colar e o valor, como no colar de verdade.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(alvo, texto);
    alvo.dispatchEvent(new Event("input", { bubbles: true }));
    alvo.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dados, bubbles: true }));
  }, link);
}

/**
 * Adiciona um episódio pela tela: abre o modal, cola o link, ajusta o que for pedido e aperta o botão
 * principal (Publicar ou Agendar). `exibicaoEmMinutos` negativo publica na hora.
 */
export async function adicionarEpisodioPelaTela(
  page: Page,
  dados: {
    youtubeId?: string;
    titulo?: string;
    numero?: string;
    resumo?: string;
    exibicaoEmMinutos?: number;
    ultimo?: boolean;
    transcricao?: string;
    tema?: string;
  } = {},
  { toque = false, estreita = false } = {},
) {
  const youtubeId = dados.youtubeId ?? idNovo();
  await apertar(page.getByRole("button", { name: "Adicionar episódio" }).first(), toque);
  const m = modal(page);
  await expect(m.getByRole("heading", { name: "Adicionar episódio" })).toBeVisible();
  await colarLink(page, `https://youtu.be/${youtubeId}`);
  await expect(m.getByTestId("video-encontrado")).toContainText("Vídeo encontrado");
  if (dados.numero) await m.getByLabel("Nº *").fill(dados.numero);
  if (dados.titulo) await m.getByLabel("Título no site *").fill(dados.titulo);
  if (dados.resumo) await m.getByLabel("Resumo").fill(dados.resumo);
  if (dados.tema) await m.getByLabel("Tema").selectOption({ label: dados.tema });
  await m.getByLabel("Exibição *").fill(campoDaqui(dados.exibicaoEmMinutos ?? -60));
  if (dados.transcricao) await m.getByLabel("Transcrição (opcional)").fill(dados.transcricao);
  if (dados.ultimo) await apertar(m.getByRole("switch", { name: "Marcar como “Último programa”" }), toque);
  const agendar = (dados.exibicaoEmMinutos ?? -60) > 0;
  const rotulo = agendar ? (estreita ? "Agendar" : "Agendar episódio") : estreita ? "Publicar" : "Publicar episódio";
  await apertar(m.getByRole("button", { name: rotulo, exact: true }), toque);
  await expect(m).toBeHidden();
  return youtubeId;
}
