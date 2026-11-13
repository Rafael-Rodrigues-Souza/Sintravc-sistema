import { describe, expect, it } from "vitest";

import { arquivarConteudos } from "@/lib/conteudos/ciclo-de-vida";
import { ErroConteudo } from "@/lib/conteudos/erros";
import { enviarMidia } from "@/lib/midia/enviar";
import { usosDasMidias } from "@/lib/midia/usos";
import { SemPermissao } from "@/lib/permissoes";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { imagem } from "@/testes/arquivos/gerar";
import { documentoCompleto, documentoSalvo, edicaoDoDocumento, numeroNovo, pdfEnviado } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe, idDaCategoria } from "@/testes/noticias";

import { carregarDocumento } from "./carregar";
import { documentoVazio } from "./dados";
import { salvarRascunhoDocumento } from "./salvar";

async function erroDe(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("não deu erro");
}

describe("salvarRascunhoDocumento: criar (RF41, E46)", () => {
  it("o ADM cria o edital como rascunho no primeiro salvamento, e ele volta igual ao abrir", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const dados = await documentoCompleto("edital", adm, { eventoData: "2026-10-30", eventoHora: "19:00" });

    const salvo = await documentoSalvo(adm, "edital", dados);

    expect(salvo).toMatchObject({ tipo: "salvo", revisao: 1 });
    const aberto = await carregarDocumento(salvo.id, { quem: adm });
    expect(aberto).toMatchObject({ tipo: "edital", estado: "rascunho", revisao: 1, autorId: adm.id, dados });
    expect(aberto!.pdf).toMatchObject({ nomeArquivo: "edital.pdf", paginas: 2 });
    expect((await atividadesDe(salvo.id)).map((a) => a.acao)).toEqual(["documento.criar"]);
  });

  it("rascunho vazio pode ser salvo (os obrigatórios são cobrados ao publicar)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "acordo", documentoVazio("acordo"));
    expect((await carregarDocumento(salvo.id, { quem: adm }))!.dados).toEqual(documentoVazio("acordo"));
  });

  it("a Comunicação não cria nem edita, mas abre para ver (RN07, CA-US23.2)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const com = await pessoaDaEquipe("COM");
    const salvo = await documentoSalvo(adm, "edital", documentoVazio("edital"));

    expect(await erroDe(salvarRascunhoDocumento({ tipo: "edital", dados: documentoVazio("edital") }, edicaoDoDocumento(com)))).toBeInstanceOf(
      SemPermissao,
    );
    expect(
      await erroDe(
        salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 1, dados: documentoVazio("edital") }, edicaoDoDocumento(com)),
      ),
    ).toBeInstanceOf(SemPermissao);
    expect(await carregarDocumento(salvo.id, { quem: com })).toMatchObject({ id: salvo.id });
  });

  it("a edição fica na Atividade uma vez por sessão do editor", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", documentoVazio("edital"));
    const sessao = edicaoDoDocumento(adm);
    await salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...documentoVazio("edital"), titulo: "A" } }, sessao);
    await salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 2, dados: { ...documentoVazio("edital"), titulo: "AB" } }, sessao);
    expect((await atividadesDe(salvo.id)).map((a) => a.acao)).toEqual(["documento.criar", "documento.editar"]);
  });
});

describe("salvarRascunhoDocumento: regras (E46)", () => {
  it("o número é único por tipo, sem diferenciar maiúsculas e espaços; o mesmo número serve em outro tipo", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const numero = numeroNovo();
    await documentoSalvo(adm, "edital", { ...documentoVazio("edital"), numero });

    const erro = await erroDe(
      salvarRascunhoDocumento({ tipo: "edital", dados: { ...documentoVazio("edital"), numero: `  ${numero.toUpperCase()} ` } }, edicaoDoDocumento(adm)),
    );
    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({ campo: "numero", message: `Já existe um edital com o número “${numero}”.` });

    await expect(documentoSalvo(adm, "acordo", { ...documentoVazio("acordo"), numero })).resolves.toMatchObject({ tipo: "salvo" });
  });

  it("o próprio documento pode ser salvo de novo com o mesmo número", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const dados = { ...documentoVazio("edital"), numero: numeroNovo() };
    const salvo = await documentoSalvo(adm, "edital", dados);
    await expect(
      salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...dados, titulo: "Novo título" } }, edicaoDoDocumento(adm)),
    ).resolves.toMatchObject({ tipo: "salvo", revisao: 2 });
  });

  it("a categoria precisa ser de Documentos", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const erro = await erroDe(
      salvarRascunhoDocumento({ tipo: "edital", dados: { ...documentoVazio("edital"), categoriaId: await idDaCategoria("Jurídico") } }, edicaoDoDocumento(adm)),
    );
    expect(erro).toMatchObject({ campo: "categoriaId", message: "Escolha uma categoria de Documentos." });
  });

  it("o arquivo oficial precisa ser um PDF da Mídia (RN12)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const foto = (await enviarMidia({ bytes: await imagem("png"), nome: "foto.png" }, { quem: adm, armazenamento: armazenamentoEmMemoria().armazenamento })).id;
    const erro = await erroDe(
      salvarRascunhoDocumento({ tipo: "edital", dados: { ...documentoVazio("edital"), pdfMidiaId: foto } }, edicaoDoDocumento(adm)),
    );
    expect(erro).toMatchObject({ campo: "pdfMidiaId", message: "O arquivo oficial precisa ser um PDF." });
  });

  it("o PDF passa a contar como uso na Mídia (RN16) e sai quando é trocado no rascunho", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const primeiro = await pdfEnviado(adm);
    const segundo = await pdfEnviado(adm, "assinado.pdf");
    const salvo = await documentoSalvo(adm, "edital", { ...documentoVazio("edital"), titulo: "Edital X", pdfMidiaId: primeiro });
    expect((await usosDasMidias([primeiro])).get(primeiro)).toEqual([
      { donoTipo: "documento", donoId: salvo.id, rotulo: "Edital X", href: `/painel/conteudos/documento/${salvo.id}` },
    ]);

    await salvarRascunhoDocumento(
      { id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...documentoVazio("edital"), titulo: "Edital X", pdfMidiaId: segundo } },
      edicaoDoDocumento(adm),
    );
    expect((await usosDasMidias([primeiro])).get(primeiro) ?? []).toEqual([]);
    expect((await usosDasMidias([segundo])).get(segundo)).toHaveLength(1);
  });

  it("revisão velha: nada é gravado e volta o conflito com a versão do servidor (E02, N4)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", { ...documentoVazio("edital"), titulo: "Servidor" });
    await salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...documentoVazio("edital"), titulo: "Outra aba" } }, edicaoDoDocumento(adm));

    const r = await salvarRascunhoDocumento(
      { id: salvo.id, tipo: "edital", revisaoBase: 1, dados: { ...documentoVazio("edital"), titulo: "Navegador" } },
      edicaoDoDocumento(adm),
    );
    expect(r).toMatchObject({ tipo: "conflito", servidor: { revisao: 2, dados: { titulo: "Outra aba" } } });
  });

  it("documento arquivado não se edita (RN10)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const salvo = await documentoSalvo(adm, "edital", documentoVazio("edital"));
    await arquivarConteudos({ ids: [salvo.id] }, { quem: adm });
    const erro = await erroDe(
      salvarRascunhoDocumento({ id: salvo.id, tipo: "edital", revisaoBase: 1, dados: documentoVazio("edital") }, edicaoDoDocumento(adm)),
    );
    expect(erro).toMatchObject({ message: "Este edital está arquivado. Restaure como rascunho para editar." });
  });
});
