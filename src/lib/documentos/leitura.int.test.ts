import { describe, expect, it } from "vitest";

import { documentoCompleto, documentoSalvo, edicaoDoDocumento, pdfEnviado } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";

import { versaoPublicadaDoDocumento } from "./carregar";
import { publicarDocumento } from "./publicar";
import { salvarRascunhoDocumento } from "./salvar";

describe("versaoPublicadaDoDocumento: o que a Comunicação vê (RF42, RN12, E46)", () => {
  it("mostra os dados e o PDF que foram ao ar, não a cópia de trabalho", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const com = await pessoaDaEquipe("COM");
    const dados = await documentoCompleto("edital", adm, { resumo: "Resumo publicado." });
    const salvo = await documentoSalvo(adm, "edital", dados);
    await publicarDocumento({ id: salvo.id, revisaoBase: 1, confirmoOficial: true }, { quem: adm });
    await salvarRascunhoDocumento(
      { id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...dados, resumo: "Rascunho.", pdfMidiaId: await pdfEnviado(adm, "novo.pdf") } },
      edicaoDoDocumento(adm),
    );

    const publicada = await versaoPublicadaDoDocumento(salvo.id, { quem: com });

    expect(publicada?.dados.resumo).toBe("Resumo publicado.");
    expect(publicada?.pdf).toMatchObject({ id: dados.pdfMidiaId, nomeArquivo: "edital.pdf" });
  });

  it("nunca publicado: não há versão para mostrar", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm));
    expect(await versaoPublicadaDoDocumento(salvo.id, { quem: await pessoaDaEquipe("COM") })).toBeNull();
  });
});
