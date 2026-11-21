import { describe, expect, it } from "vitest";

import { arquivarConteudos, ocultarConteudos } from "@/lib/conteudos/ciclo-de-vida";
import type { TipoDocumento } from "@/lib/documentos/dados";
import { publicarDocumento } from "@/lib/documentos/publicar";
import { salvarRascunhoDocumento } from "@/lib/documentos/salvar";
import { enviarMidia } from "@/lib/midia/enviar";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { pdf } from "@/testes/arquivos/gerar";
import { documentoCompleto, documentoSalvo, edicaoDoDocumento } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";

import { tratarPdfPublico } from "./rota-pdf";

/** Um documento publicado, com o PDF guardado no armazenamento em memória que a rota vai ler. */
async function publicadoComPdf(tipo: TipoDocumento = "edital", nome = "Edital de convocação nº 012.pdf") {
  const adm = await pessoaDaEquipe("ADM");
  const { armazenamento } = armazenamentoEmMemoria();
  const bytes = await pdf(1);
  const pdfMidiaId = (await enviarMidia({ bytes, nome }, { quem: adm, armazenamento })).id;
  const dados = await documentoCompleto(tipo, adm, { pdfMidiaId });
  const salvo = await documentoSalvo(adm, tipo, dados);
  const r = await publicarDocumento({ id: salvo.id, revisaoBase: salvo.revisao, confirmoOficial: true }, { quem: adm });
  if (r.tipo !== "publicado") throw new Error("esperava publicado");
  return { adm, armazenamento, id: salvo.id, slug: r.slug, revisao: r.revisaoPublicada, bytes, dados };
}

describe("GET /documentos/[aba]/[slug]/pdf (CA-US03.2, E60)", () => {
  it("“Abrir documento”: abre o PDF no navegador, com o nome original com acento e sem cache compartilhado", async () => {
    const { armazenamento, slug, bytes } = await publicadoComPdf();

    const resposta = await tratarPdfPublico({ aba: "editais", slug, modo: "abrir" }, { armazenamento });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toBe(
      `inline; filename="Edital de convocacao n_ 012.pdf"; filename*=UTF-8''Edital%20de%20convoca%C3%A7%C3%A3o%20n%C2%BA%20012.pdf`,
    );
    expect(resposta.headers.get("cache-control")).toBe("private, no-cache");
    expect(resposta.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(bytes);
  });

  it("“Baixar PDF”: baixa o arquivo oficial (attachment)", async () => {
    const { armazenamento, slug } = await publicadoComPdf("acordo", "Convenção 2026.pdf");
    const resposta = await tratarPdfPublico({ aba: "acordos-coletivos", slug, modo: "baixar" }, { armazenamento });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-disposition")).toMatch(/^attachment; filename="Convencao 2026.pdf"; filename\*=UTF-8''Conven%C3%A7%C3%A3o%202026.pdf$/);
  });

  it("ocultar ou arquivar tira o PDF do ar na hora: a próxima chamada já dá 404", async () => {
    const oculto = await publicadoComPdf();
    const arquivado = await publicadoComPdf();
    expect((await tratarPdfPublico({ aba: "editais", slug: oculto.slug, modo: "abrir" }, oculto)).status).toBe(200);

    await ocultarConteudos({ ids: [oculto.id], motivo: "Teste" }, { quem: oculto.adm });
    await arquivarConteudos({ ids: [arquivado.id] }, { quem: arquivado.adm });

    expect((await tratarPdfPublico({ aba: "editais", slug: oculto.slug, modo: "abrir" }, oculto)).status).toBe(404);
    expect((await tratarPdfPublico({ aba: "editais", slug: arquivado.slug, modo: "baixar" }, arquivado)).status).toBe(404);
  });

  it("serve o PDF da versão no ar: o trocado na cópia de trabalho só depois de publicar", async () => {
    const { adm, armazenamento, id, slug, revisao, bytes, dados } = await publicadoComPdf();
    const novosBytes = await pdf(3);
    const novo = (await enviarMidia({ bytes: novosBytes, nome: "assinado.pdf" }, { quem: adm, armazenamento })).id;
    const salvo = await salvarRascunhoDocumento({ id, tipo: "edital", revisaoBase: revisao, dados: { ...dados, pdfMidiaId: novo } }, edicaoDoDocumento(adm));
    if (salvo.tipo !== "salvo") throw new Error("esperava salvo");

    const antes = await tratarPdfPublico({ aba: "editais", slug, modo: "abrir" }, { armazenamento });
    expect(new Uint8Array(await antes.arrayBuffer())).toEqual(bytes);

    await publicarDocumento({ id, revisaoBase: salvo.revisao, confirmoOficial: true }, { quem: adm });
    const depois = await tratarPdfPublico({ aba: "editais", slug, modo: "abrir" }, { armazenamento });
    expect(new Uint8Array(await depois.arrayBuffer())).toEqual(novosBytes);
  });

  it("slug de outra aba, inexistente ou fora do padrão: 404", async () => {
    const { armazenamento, slug } = await publicadoComPdf();
    expect((await tratarPdfPublico({ aba: "acordos-coletivos", slug, modo: "abrir" }, { armazenamento })).status).toBe(404);
    expect((await tratarPdfPublico({ aba: "editais", slug: "nao-existe", modo: "abrir" }, { armazenamento })).status).toBe(404);
    expect((await tratarPdfPublico({ aba: "editais", slug: "../segredo", modo: "abrir" }, { armazenamento })).status).toBe(404);
    expect((await tratarPdfPublico({ aba: "outra", slug, modo: "abrir" }, { armazenamento })).status).toBe(404);
  });
});
