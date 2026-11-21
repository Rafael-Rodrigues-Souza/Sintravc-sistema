import { expect, type Page } from "@playwright/test";

import { pdfComTexto } from "./responsivo";

/** O dia daqui a N dias no calendário da Bahia ("AAAA-MM-DD"), como o campo de data espera. */
export function diaNaBahiaDaquiA(dias: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(new Date(Date.now() + dias * 86_400_000));
}

type Documento = {
  tipo: "edital" | "acordo";
  titulo: string;
  numero: string;
  /** O rótulo do seletor “Tipo de edital” ou “Tipo de acordo”, ex.: "Convocação". */
  subtipo: string;
  categoria: string;
  resumo: string;
  pdf: { nome: string; linhas: string[] };
  /** Prazo do edital: o dia ("AAAA-MM-DD") e a hora ("19:00"). */
  prazo?: { dia: string; hora: string };
  /** Vigência do acordo: início e fim ("AAAA-MM-DD"). */
  vigencia?: { inicio: string; fim: string };
  abrangencia?: string;
  partes?: string;
};

/**
 * Cria e publica um edital ou um acordo pelo editor do painel, como o ADM faria (os mesmos passos de
 * publicar-documento.spec.ts): preenche, envia o PDF pelo botão e publica marcando a confirmação
 * oficial. A sessão do ADM já precisa estar aberta. Devolve o id do documento.
 */
export async function publicarDocumentoPelaTela(page: Page, d: Documento): Promise<string> {
  const salvo = () => expect(page.getByTestId("status-do-salvamento")).toContainText("Salvo automaticamente às");
  await page.goto(`/painel/conteudos/documento/nova?tipo=${d.tipo}`);
  await page.getByLabel("Título oficial").fill(d.titulo);
  await page.getByLabel("Número ou identificação").fill(d.numero);
  await page.getByLabel(d.tipo === "edital" ? "Tipo de edital" : "Tipo de acordo").selectOption({ label: d.subtipo });
  await page.getByLabel("Data do documento").fill(diaNaBahiaDaquiA(-1));
  if (d.prazo) {
    await page.getByLabel("Data do evento ou prazo").fill(d.prazo.dia);
    await page.getByLabel("Hora do evento ou prazo").fill(d.prazo.hora);
  }
  if (d.vigencia) {
    await page.getByLabel("Início da vigência").fill(d.vigencia.inicio);
    await page.getByLabel("Fim da vigência").fill(d.vigencia.fim);
  }
  if (d.abrangencia) await page.getByLabel("Abrangência", { exact: true }).fill(d.abrangencia);
  if (d.partes) await page.getByLabel("Partes signatárias", { exact: true }).fill(d.partes);
  await page.getByLabel("Resumo").fill(d.resumo);
  await page.getByLabel("Categoria").selectOption({ label: d.categoria });
  await salvo();
  await expect(page).toHaveURL(/\/painel\/conteudos\/documento\/[0-9a-f-]+$/);
  const id = new URL(page.url()).pathname.split("/").at(-1)!;

  const [seletor] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /Enviar PDF|Substituir/ }).click()]);
  await seletor.setFiles({ name: d.pdf.nome, mimeType: "application/pdf", buffer: await pdfComTexto(d.pdf.linhas) });
  await expect(page.getByText(d.pdf.nome)).toBeVisible();
  await salvo();

  await page.getByRole("button", { name: "Publicar…" }).click();
  const modal = page.getByRole("alertdialog", { name: "Publicar documento oficial?" });
  await modal.getByLabel("Confirmo que o PDF é a versão oficial e assinada").check();
  await modal.getByRole("button", { name: "Publicar documento" }).click();
  await expect(page.getByText("Documento publicado.")).toBeVisible();
  return id;
}
