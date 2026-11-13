import { describe, expect, it } from "vitest";

import { enviarMidia } from "@/lib/midia/enviar";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { pdf } from "@/testes/arquivos/gerar";
import { documentoCompleto, documentoSalvo, edicaoDoDocumento } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";
import { sessaoDe } from "@/testes/sessao";

import { publicarDocumento } from "./publicar";
import { tratarPdfDoDocumento } from "./rota-pdf";
import { salvarRascunhoDocumento } from "./salvar";

const URL_SITE = "http://localhost:3000";

const pedido = (cookie?: string) => new Request(`${URL_SITE}/painel/documentos/x/pdf`, { headers: cookie ? { cookie } : {} });

/** Um edital com o PDF guardado no armazenamento em memória que a rota vai ler. */
async function editalComPdf(nome = "Edital nº 012-2026.pdf", { publicado = false } = {}) {
  const adm = await pessoaDaEquipe("ADM");
  const { armazenamento } = armazenamentoEmMemoria();
  const bytes = await pdf(1);
  const pdfMidiaId = (await enviarMidia({ bytes, nome }, { quem: adm, armazenamento })).id;
  const dados = await documentoCompleto("edital", adm, { pdfMidiaId });
  const salvo = await documentoSalvo(adm, "edital", dados);
  if (publicado) await publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
  return { adm, armazenamento, id: salvo.id, bytes, dados };
}

describe("GET /painel/documentos/[id]/pdf (RF42, E46)", () => {
  it("“Visualizar”: abre o PDF no navegador (inline), também para a Comunicação", async () => {
    const { armazenamento, id, bytes } = await editalComPdf(undefined, { publicado: true });
    const cookie = await sessaoDe("COM");

    const resposta = await tratarPdfDoDocumento(pedido(cookie), { id, modo: "abrir" }, { armazenamento });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toMatch(/^inline; filename="Edital n_ 012-2026.pdf"/);
    expect(resposta.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(bytes);
  });

  it("“Baixar PDF”: baixa o arquivo com o nome original (attachment)", async () => {
    const { armazenamento, id } = await editalComPdf(undefined, { publicado: true });
    const resposta = await tratarPdfDoDocumento(pedido(await sessaoDe("COM")), { id, modo: "baixar" }, { armazenamento });
    expect(resposta.headers.get("content-disposition")).toMatch(/^attachment; filename=/);
  });

  it("sem sessão: 401; perfil sem acesso a documentos: 403", async () => {
    const { armazenamento, id } = await editalComPdf();
    expect((await tratarPdfDoDocumento(pedido(), { id, modo: "abrir" }, { armazenamento })).status).toBe(401);
    expect((await tratarPdfDoDocumento(pedido(await sessaoDe("ATD")), { id, modo: "abrir" }, { armazenamento })).status).toBe(403);
  });

  it("com ?versao=N, serve o PDF daquela versão (só o ADM vê versões)", async () => {
    const { adm, armazenamento, id, dados } = await editalComPdf();
    await publicarDocumento({ id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
    const novo = (await enviarMidia({ bytes: await pdf(3), nome: "assinado.pdf" }, { quem: adm, armazenamento })).id;
    await salvarRascunhoDocumento({ id, tipo: "edital", revisaoBase: 1, dados: { ...dados, pdfMidiaId: novo } }, edicaoDoDocumento(adm));

    const daVersao = await tratarPdfDoDocumento(pedido(await sessaoDe("ADM")), { id, modo: "abrir", versao: 1 }, { armazenamento });
    expect(daVersao.headers.get("content-disposition")).toMatch(/Edital n_ 012-2026/);
    const atual = await tratarPdfDoDocumento(pedido(await sessaoDe("ADM")), { id, modo: "abrir" }, { armazenamento });
    expect(atual.headers.get("content-disposition")).toMatch(/assinado\.pdf/);
    expect((await tratarPdfDoDocumento(pedido(await sessaoDe("COM")), { id, modo: "abrir", versao: 1 }, { armazenamento })).status).toBe(403);
  });

  it("documento que não existe ou sem PDF: 404", async () => {
    const { armazenamento } = armazenamentoEmMemoria();
    const cookie = await sessaoDe("ADM");
    const resposta = await tratarPdfDoDocumento(pedido(cookie), { id: "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b", modo: "abrir" }, { armazenamento });
    expect(resposta.status).toBe(404);
    expect((await tratarPdfDoDocumento(pedido(cookie), { id: "nao-e-um-id", modo: "abrir" }, { armazenamento })).status).toBe(404);
  });
});

describe("PDF ainda não publicado como oficial: só o ADM vê (RN12, E46)", () => {
  it("o ADM troca o PDF sem publicar: a COM continua baixando o PDF publicado; o ADM vê o novo", async () => {
    const { adm, armazenamento, id, dados } = await editalComPdf("Edital oficial.pdf");
    await publicarDocumento({ id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
    const novo = (await enviarMidia({ bytes: await pdf(3), nome: "rascunho-nao-assinado.pdf" }, { quem: adm, armazenamento })).id;
    await salvarRascunhoDocumento({ id, tipo: "edital", revisaoBase: 1, dados: { ...dados, pdfMidiaId: novo } }, edicaoDoDocumento(adm));

    const daCom = await tratarPdfDoDocumento(pedido(await sessaoDe("COM")), { id, modo: "baixar" }, { armazenamento });
    expect(daCom.status).toBe(200);
    expect(daCom.headers.get("content-disposition")).toMatch(/Edital oficial\.pdf/);

    const doAdm = await tratarPdfDoDocumento(pedido(await sessaoDe("ADM")), { id, modo: "baixar" }, { armazenamento });
    expect(doAdm.headers.get("content-disposition")).toMatch(/rascunho-nao-assinado\.pdf/);
  });

  it("documento que nunca foi publicado: a COM não recebe o PDF (404)", async () => {
    const { armazenamento, id } = await editalComPdf();
    expect((await tratarPdfDoDocumento(pedido(await sessaoDe("COM")), { id, modo: "abrir" }, { armazenamento })).status).toBe(404);
  });
});
