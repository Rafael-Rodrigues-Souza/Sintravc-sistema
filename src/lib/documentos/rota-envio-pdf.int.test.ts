import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem, pdf, pdfComTexto } from "@/testes/arquivos/gerar";
import { documentoCompleto, documentoSalvo } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";
import { sessaoDe } from "@/testes/sessao";

import { tratarEnvioDoPdf } from "./rota-envio-pdf";

const URL_SITE = "http://localhost:3000";

function pedido(opcoes: { cookie?: string; arquivo?: File; contentLength?: string; documentoId?: string }) {
  const corpo = new FormData();
  if (opcoes.arquivo) corpo.set("arquivo", opcoes.arquivo);
  if (opcoes.documentoId) corpo.set("documentoId", opcoes.documentoId);
  const cabecalhos = new Headers({ origin: URL_SITE });
  if (opcoes.cookie) cabecalhos.set("cookie", opcoes.cookie);
  const request = new Request(`${URL_SITE}/api/documentos/pdf`, { method: "POST", headers: cabecalhos, body: corpo });
  if (!opcoes.contentLength) return request;
  const comTamanho = new Headers(request.headers);
  comTamanho.set("content-length", opcoes.contentLength);
  return new Request(request, { headers: comTamanho });
}

const arquivo = (bytes: Uint8Array, nome: string) => new File([bytes.slice()], nome, { type: "application/pdf" });

describe("POST /api/documentos/pdf (P3, RN12, E46)", () => {
  it("ADM envia o PDF: 201 com o arquivo e o texto pesquisável lido do PDF", async () => {
    const cookie = await sessaoDe("ADM");
    const { armazenamento } = armazenamentoEmMemoria();
    const bytes = await pdfComTexto(["Edital de convocação", "Assembleia geral"]);

    const resposta = await tratarEnvioDoPdf(pedido({ cookie, arquivo: arquivo(bytes, "edital-012.pdf") }), { urlSite: URL_SITE, armazenamento });

    expect(resposta.status).toBe(201);
    const corpo = (await resposta.json()) as { id: string; texto: string; temTexto: boolean };
    expect(corpo).toMatchObject({ nomeArquivo: "edital-012.pdf", paginas: 2, temTexto: true });
    expect(corpo.texto).toMatch(/Edital de convocação[\s\S]*Assembleia geral/);
    const [linha] = await banco().select().from(midia).where(eq(midia.id, corpo.id));
    expect(linha).toMatchObject({ tipo: "pdf", mime: "application/pdf" });
  });

  it("PDF escaneado (sem texto): 201, sem texto, e o envio segue", async () => {
    const cookie = await sessaoDe("ADM");
    const resposta = await tratarEnvioDoPdf(pedido({ cookie, arquivo: arquivo(await pdf(1), "escaneado.pdf") }), {
      urlSite: URL_SITE,
      armazenamento: armazenamentoEmMemoria().armazenamento,
    });
    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toMatchObject({ texto: "", temTexto: false });
  });

  it("outro formato, mesmo com nome .pdf, é recusado e nada vai para a Mídia (RN12)", async () => {
    const cookie = await sessaoDe("ADM");
    const { armazenamento, objetos } = armazenamentoEmMemoria();
    const resposta = await tratarEnvioDoPdf(pedido({ cookie, arquivo: arquivo(await imagem("png"), "falso.pdf") }), {
      urlSite: URL_SITE,
      armazenamento,
    });
    expect(resposta.status).toBe(422);
    expect(await resposta.json()).toEqual({ erro: "O arquivo oficial precisa ser um PDF. Envie o edital ou acordo em PDF." });
    expect(objetos.size).toBe(0);
  });

  it("a Comunicação não envia o arquivo oficial: 403 (RN08)", async () => {
    const cookie = await sessaoDe("COM");
    const resposta = await tratarEnvioDoPdf(pedido({ cookie, arquivo: arquivo(await pdf(1), "x.pdf") }), { urlSite: URL_SITE });
    expect(resposta.status).toBe(403);
    expect(await resposta.json()).toEqual({ erro: "Só o Administrador geral envia documentos oficiais." });
  });

  it("sem sessão: 401", async () => {
    const resposta = await tratarEnvioDoPdf(pedido({ arquivo: arquivo(await pdf(1), "x.pdf") }), { urlSite: URL_SITE });
    expect(resposta.status).toBe(401);
  });

  it("acima de 10 MB: 413, antes de ler o corpo", async () => {
    const cookie = await sessaoDe("ADM");
    const resposta = await tratarEnvioDoPdf(pedido({ cookie, arquivo: arquivo(await pdf(1), "x.pdf"), contentLength: String(11 * 1024 * 1024) }), {
      urlSite: URL_SITE,
    });
    expect(resposta.status).toBe(413);
  });

  it("documento que já tem PDF: a troca (substituir) passa para o ADM e é recusada para a COM", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    const doAdm = await tratarEnvioDoPdf(pedido({ cookie: await sessaoDe("ADM"), arquivo: undefined, documentoId: salvo.id }), { urlSite: URL_SITE });
    expect(doAdm.status).toBe(400); // passou pela permissão; só faltou o arquivo
    const daCom = await tratarEnvioDoPdf(pedido({ cookie: await sessaoDe("COM"), arquivo: arquivo(await pdf(1), "x.pdf"), documentoId: salvo.id }), {
      urlSite: URL_SITE,
    });
    expect(daCom.status).toBe(403);
  });

  it("ADM troca o PDF de um documento que já tem PDF: 201", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    const resposta = await tratarEnvioDoPdf(
      pedido({ cookie: await sessaoDe("ADM"), arquivo: arquivo(await pdfComTexto(["Assinado"]), "assinado.pdf"), documentoId: salvo.id }),
      { urlSite: URL_SITE, armazenamento: armazenamentoEmMemoria().armazenamento },
    );
    expect(resposta.status).toBe(201);
  });
});
