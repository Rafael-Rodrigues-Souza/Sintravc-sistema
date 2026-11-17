import { describe, expect, it } from "vitest";

import type { Armazenamento } from "@/lib/armazenamento";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem, office, pdf } from "@/testes/arquivos/gerar";
import { pessoaDaEquipe } from "@/testes/equipe";
import { sessaoDe } from "@/testes/sessao";

import { enviarMidia } from "./enviar";
import { tratarPdfDaMidia } from "./rota-pdf";

const URL_SITE = "http://localhost:3000";

const pedido = (cookie?: string) => new Request(`${URL_SITE}/painel/midia/x/pdf`, { headers: cookie ? { cookie } : {} });

async function naMidia(bytes: Uint8Array, nome: string, { armazenamento }: { armazenamento: Armazenamento } = armazenamentoEmMemoria()) {
  const com = await pessoaDaEquipe("COM");
  const id = (await enviarMidia({ bytes, nome }, { quem: com, armazenamento })).id;
  return { armazenamento, id };
}

describe("GET /painel/midia/[id]/pdf (E53)", () => {
  it("“Abrir PDF”: responde o PDF para abrir no navegador (inline), com o nome do arquivo", async () => {
    const bytes = await pdf(2);
    const { armazenamento, id } = await naMidia(bytes, "Convenção coletiva 2026.pdf");

    const resposta = await tratarPdfDaMidia(pedido(await sessaoDe("COM")), { id, modo: "abrir" }, { armazenamento });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toMatch(/^inline; filename="Convencao coletiva 2026.pdf"/);
    expect(resposta.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(bytes);
  });

  it("só abre: qualquer outro modo, ou nenhum, é recusado (400)", async () => {
    const { armazenamento, id } = await naMidia(await pdf(1), "ata.pdf");
    const cookie = await sessaoDe("COM");
    expect((await tratarPdfDaMidia(pedido(cookie), { id, modo: "baixar" }, { armazenamento })).status).toBe(400);
    expect((await tratarPdfDaMidia(pedido(cookie), { id, modo: null }, { armazenamento })).status).toBe(400);
  });

  it("sem sessão: 401; perfil sem acesso à Mídia: 403", async () => {
    const { armazenamento, id } = await naMidia(await pdf(1), "ata.pdf");
    expect((await tratarPdfDaMidia(pedido(), { id, modo: "abrir" }, { armazenamento })).status).toBe(401);
    expect((await tratarPdfDaMidia(pedido(await sessaoDe("ATD")), { id, modo: "abrir" }, { armazenamento })).status).toBe(403);
  });

  it("arquivo que não existe, id inválido ou que não é PDF: 404", async () => {
    const cookie = await sessaoDe("ADM");
    const foto = await naMidia(await imagem("png"), "logo.png");
    const { armazenamento } = foto;
    const planilha = await naMidia(office("xlsx"), "escala.xlsx", { armazenamento });
    expect((await tratarPdfDaMidia(pedido(cookie), { id: "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b", modo: "abrir" }, { armazenamento })).status).toBe(404);
    expect((await tratarPdfDaMidia(pedido(cookie), { id: "nao-e-um-id", modo: "abrir" }, { armazenamento })).status).toBe(404);
    expect((await tratarPdfDaMidia(pedido(cookie), { id: foto.id, modo: "abrir" }, { armazenamento })).status).toBe(404);
    expect((await tratarPdfDaMidia(pedido(cookie), { id: planilha.id, modo: "abrir" }, { armazenamento })).status).toBe(404);
  });
});
