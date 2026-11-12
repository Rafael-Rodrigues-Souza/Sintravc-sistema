import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { conteudoVersao } from "@/lib/db/schema";
import { ErroFaltamCampos } from "@/lib/conteudos/publicar";
import { usosDasMidias } from "@/lib/midia/usos";
import { SemPermissao } from "@/lib/permissoes";
import { documentoCompleto, documentoSalvo, edicaoDoDocumento, pdfEnviado } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe } from "@/testes/noticias";

import { carregarDocumento } from "./carregar";
import { documentoVazio } from "./dados";
import { publicarDocumento } from "./publicar";
import { salvarRascunhoDocumento } from "./salvar";

async function erroDe(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("não deu erro");
}

describe("publicarDocumento (CA-US23.1, RN12, E46)", () => {
  it("sem a confirmação de versão oficial, nada vai ao ar", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));

    const erro = await erroDe(publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: false }, { quem: adm }));

    expect(erro).toMatchObject({ campo: "confirmoOficial", message: "Confirme que o PDF é a versão oficial e assinada." });
    expect(await carregarDocumento(salvo.id, { quem: adm })).toMatchObject({ estado: "rascunho", versao: 0 });
  });

  it("com faltas, não publica e aponta os campos", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "acordo", documentoVazio("acordo"));
    const erro = await erroDe(publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm }));
    expect(erro).toBeInstanceOf(ErroFaltamCampos);
    expect((erro as ErroFaltamCampos).campos).toContain("partesSignatarias");
  });

  it("confirmado: vai ao ar como versão 1, com endereço, quem confirmou e o registro na Atividade", async () => {
    const adm = await pessoaDaEquipe("ADM", "Mariana Souza");
    const dados = await documentoCompleto("edital", adm, { titulo: "Edital de convocação · Assembleia geral" });
    const salvo = await documentoSalvo(adm, "edital", dados);

    const r = await publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });

    expect(r).toMatchObject({ tipo: "publicado", versao: 1, slug: "edital-de-convocacao-assembleia-geral" });
    expect(await carregarDocumento(salvo.id, { quem: adm })).toMatchObject({
      estado: "publicado",
      versao: 1,
      jaPublicado: true,
      confirmadoOficialPorNome: "Mariana Souza",
    });
    const [versao] = await banco().select().from(conteudoVersao).where(eq(conteudoVersao.conteudoId, salvo.id));
    expect(versao!.snapshot).toEqual({ formato: 1, tipo: "edital", dados });
    const atividades = await atividadesDe(salvo.id);
    expect(atividades.at(-1)).toMatchObject({
      acao: "documento.publicar",
      detalhe: { versao: 1, pdf_midia_id: dados.pdfMidiaId, confirmou_versao_oficial: true },
    });
  });

  it("a Comunicação não publica (RN08)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const com = await pessoaDaEquipe("COM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    expect(await erroDe(publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: com }))).toBeInstanceOf(SemPermissao);
  });

  it("revisão velha: volta o conflito e nada vai ao ar", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    const r = await publicarDocumento({ id: salvo.id, revisaoBase: 0, confirmoOficial: true }, { quem: adm });
    expect(r).toMatchObject({ tipo: "conflito", servidor: { revisao: 1 } });
  });

  it("substituir o PDF de um documento publicado: nova versão, com a confirmação de novo e o registro de substituição", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const dados = await documentoCompleto("edital", adm);
    const salvo = await documentoSalvo(adm, "edital", dados);
    await publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
    const assinado = await pdfEnviado(adm, "assinado.pdf");
    await salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...dados, pdfMidiaId: assinado } }, edicaoDoDocumento(adm));

    // Até publicar as alterações, o PDF antigo continua no ar e em uso.
    expect((await usosDasMidias([dados.pdfMidiaId!])).get(dados.pdfMidiaId!)).toHaveLength(1);
    expect(await erroDe(publicarDocumento({ id: salvo.id, revisaoBase: 2, confirmoOficial: false }, { quem: adm }))).toMatchObject({
      campo: "confirmoOficial",
    });

    const r = await publicarDocumento({ id: salvo.id, revisaoBase: 2, confirmoOficial: true }, { quem: adm });

    expect(r).toMatchObject({ tipo: "publicado", versao: 2 });
    expect((await usosDasMidias([dados.pdfMidiaId!])).get(dados.pdfMidiaId!) ?? []).toEqual([]);
    expect((await atividadesDe(salvo.id)).at(-1)).toMatchObject({
      acao: "documento.substituir_pdf",
      detalhe: { versao: 2, pdf_midia_id: assinado, pdf_anterior_id: dados.pdfMidiaId },
    });
  });

  it("publicar alterações sem trocar o PDF registra “publicar_alteracoes”", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const dados = await documentoCompleto("acordo", adm);
    const salvo = await documentoSalvo(adm, "acordo", dados);
    await publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
    await salvarRascunhoDocumento({ id: salvo.id, tipo: "acordo", revisaoBase: 1, dados: { ...dados, resumo: "Novo resumo." } }, edicaoDoDocumento(adm));
    await publicarDocumento({ id: salvo.id, revisaoBase: 2, confirmoOficial: true }, { quem: adm });
    expect((await atividadesDe(salvo.id)).at(-1)).toMatchObject({ acao: "documento.publicar_alteracoes", detalhe: { versao: 2 } });
  });
});
