import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, midia, pessoaEquipe } from "@/lib/db/schema";
import { SemPermissao, type Perfil, type Quem } from "@/lib/permissoes";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { heicDeExemplo, imagem, office, pdf } from "@/testes/arquivos/gerar";

import { enviarMidia } from "./enviar";
import { ErroMidia } from "./erros";

let contador = 0;

/** Pessoa da equipe só para a chave estrangeira `enviado_por` (sem login). */
async function pessoa(perfil: Perfil = "COM"): Promise<Quem & { tipo: "equipe" }> {
  contador += 1;
  const [linha] = await banco()
    .insert(pessoaEquipe)
    .values({ nome: `Mídia ${contador}`, email: `midia${contador}-${Date.now()}@sintravc.local`, perfil, situacao: "ativa" })
    .returning({ id: pessoaEquipe.id });
  return { tipo: "equipe", id: linha!.id, perfil };
}

async function contar() {
  const [[m], [a]] = await Promise.all([
    banco().select({ n: count() }).from(midia),
    banco().select({ n: count() }).from(atividade),
  ]);
  return { midias: m!.n, atividades: a!.n };
}

describe("enviarMidia (RF48, RN15)", () => {
  it("CA-US27.1: o HEIC vira JPG na Mídia, com a Atividade na mesma transação", async () => {
    const quem = await pessoa("COM");
    const { armazenamento, objetos } = armazenamentoEmMemoria();

    const { id } = await enviarMidia({ bytes: heicDeExemplo(), nome: "foto-assembleia.heic" }, { quem, armazenamento });

    const [linha] = await banco().select().from(midia).where(eq(midia.id, id));
    expect(linha).toMatchObject({
      nomeArquivo: "foto-assembleia.jpg",
      tipo: "imagem",
      mime: "image/jpeg",
      largura: 1280,
      altura: 854,
      enviadoPor: quem.id,
      alt: null,
      legenda: null,
    });
    expect(linha!.chaveR2).toMatch(new RegExp(`^midia/\\d{4}/\\d{2}/${id}\\.jpg$`));

    // O tipo gravado no S3 vem dos bytes; imagem abre no site (sem attachment).
    const objeto = objetos.get(linha!.chaveR2);
    expect(objeto).toMatchObject({ tipo: "image/jpeg" });
    expect(objeto!.disposicao).toBeUndefined();
    expect((objeto!.conteudo as Uint8Array).byteLength).toBe(linha!.bytes);

    const registros = await banco().select().from(atividade).where(eq(atividade.alvoId, id)).orderBy(atividade.id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      atorTipo: "pessoa",
      atorId: quem.id,
      acao: "midia.enviar",
      area: "midia",
      alvoTipo: "midia",
      alvoRotulo: "foto-assembleia.jpg",
      detalhe: expect.objectContaining({ tipo: "imagem", mime: "image/jpeg", convertidoDe: "heic" }),
    });
  });

  it("PDF e DOCX vão para o S3 com o tipo detectado e como download (attachment com o nome)", async () => {
    const quem = await pessoa("ADM");
    const { armazenamento, objetos } = armazenamentoEmMemoria();

    const { id: idPdf } = await enviarMidia({ bytes: await pdf(6), nome: "edital-012-2026.pdf" }, { quem, armazenamento });
    const { id: idDocx } = await enviarMidia({ bytes: office("docx"), nome: "Ata de reunião.docx" }, { quem, armazenamento });

    const [linhaPdf] = await banco().select().from(midia).where(eq(midia.id, idPdf));
    expect(linhaPdf).toMatchObject({ tipo: "pdf", paginas: 6, mime: "application/pdf" });
    expect(objetos.get(linhaPdf!.chaveR2)).toMatchObject({
      tipo: "application/pdf",
      disposicao: { tipo: "attachment", nome: "edital-012-2026.pdf" },
    });

    const [linhaDocx] = await banco().select().from(midia).where(eq(midia.id, idDocx));
    expect(linhaDocx).toMatchObject({ tipo: "documento", nomeArquivo: "Ata de reunião.docx" });
    expect(objetos.get(linhaDocx!.chaveR2)).toMatchObject({
      tipo: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      disposicao: { tipo: "attachment", nome: "Ata de reunião.docx" },
    });
  });

  it("formato recusado: nada vai para o S3 nem para o banco", async () => {
    const quem = await pessoa();
    const { armazenamento, objetos } = armazenamentoEmMemoria();
    const antes = await contar();

    await expect(
      enviarMidia({ bytes: await imagem("gif"), nome: "convite-assembleia.gif" }, { quem, armazenamento }),
    ).rejects.toMatchObject({ codigo: "formato" });

    expect(objetos.size).toBe(0);
    expect(await contar()).toEqual(antes);
  });

  it("S3 fora do ar: nada é gravado no banco nem na Atividade", async () => {
    const quem = await pessoa();
    const { armazenamento } = armazenamentoEmMemoria({ falharAoEnviar: true });
    const antes = await contar();

    await expect(enviarMidia({ bytes: await imagem("png"), nome: "a.png" }, { quem, armazenamento })).rejects.toThrow(
      "S3 fora do ar",
    );
    expect(await contar()).toEqual(antes);
  });

  it("o perfil Atendimento não envia (spec §4)", async () => {
    const quem = await pessoa("ATD");
    const { armazenamento, objetos } = armazenamentoEmMemoria();

    await expect(enviarMidia({ bytes: await imagem("png"), nome: "a.png" }, { quem, armazenamento })).rejects.toBeInstanceOf(
      SemPermissao,
    );
    expect(objetos.size).toBe(0);
  });

  it("o limite de tamanho vem do Parametro (10 MB)", async () => {
    const quem = await pessoa();
    const { armazenamento } = armazenamentoEmMemoria();
    const grande = new Uint8Array(10 * 1024 * 1024 + 1);

    const erro = await enviarMidia({ bytes: grande, nome: "grande.pdf" }, { quem, armazenamento }).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroMidia);
    expect(erro).toMatchObject({ codigo: "tamanho", message: expect.stringContaining("10 MB") });
  });
});
