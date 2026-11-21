import { describe, expect, it } from "vitest";

import { arquivarConteudos, ocultarConteudos } from "@/lib/conteudos/ciclo-de-vida";
import type { DadosDocumento, TipoDocumento } from "@/lib/documentos/dados";
import { agendarDocumento } from "@/lib/documentos/agendar";
import { publicarDocumento } from "@/lib/documentos/publicar";
import { salvarRascunhoDocumento } from "@/lib/documentos/salvar";
import type { QuemDaEquipe } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { documentoCompleto, documentoSalvo, edicaoDoDocumento } from "@/testes/documentos";
import { pessoaDaEquipe } from "@/testes/equipe";

import { documentoPeloSlug, documentosNoAr, idsDaBusca } from "./consultas";
import { montarLista } from "./pagina";

/**
 * Leituras públicas dos documentos (RF04, CA-US03.1, P3, E60). O banco é o mesmo para o arquivo
 * inteiro: cada teste procura pelos próprios documentos (uma marca no título ou no número).
 */

function marca() {
  return `m${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

async function publicado(quem: QuemDaEquipe, tipo: TipoDocumento, mudancas: Partial<DadosDocumento> = {}) {
  const dados = await documentoCompleto(tipo, quem, mudancas);
  const salvo = await documentoSalvo(quem, tipo, dados);
  const r = await publicarDocumento({ id: salvo.id, revisaoBase: salvo.revisao, confirmoOficial: true }, { quem });
  if (r.tipo !== "publicado") throw new Error("esperava publicado");
  return { id: salvo.id, slug: r.slug, revisao: r.revisaoPublicada, dados };
}

const ids = async (tipo: TipoDocumento, m: string) => [...(await idsDaBusca(tipo, m))];

describe("documentos no ar (RF04, E60)", () => {
  it("só o publicado aparece: rascunho, agendado, oculto e arquivado ficam de fora", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const m = marca();
    const noAr = await publicado(adm, "edital", { titulo: `No ar ${m}` });
    await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm, { titulo: `Rascunho ${m}` }));
    const agendado = await documentoSalvo(adm, "edital", await documentoCompleto("edital", adm, { titulo: `Agendado ${m}` }));
    await agendarDocumento(
      { id: agendado.id, revisaoBase: agendado.revisao, confirmoOficial: true, para: new Date(Date.now() + 86_400_000) },
      { quem: adm, fila: filaEmMemoria().fila },
    );
    const oculto = await publicado(adm, "edital", { titulo: `Oculto ${m}` });
    await ocultarConteudos({ ids: [oculto.id], motivo: "Teste" }, { quem: adm });
    const arquivado = await publicado(adm, "edital", { titulo: `Arquivado ${m}` });
    await arquivarConteudos({ ids: [arquivado.id] }, { quem: adm });

    expect(await ids("edital", m)).toEqual([noAr.id]);
    const daMarca = (await documentosNoAr("edital")).filter((d) => d.dados.titulo.includes(m));
    expect(daMarca.map((d) => d.id)).toEqual([noAr.id]);
    expect(await documentoPeloSlug("edital", oculto.slug)).toBeNull();
    expect(await documentoPeloSlug("edital", arquivado.slug)).toBeNull();
  });

  it("mostra a versão no ar, não a cópia de trabalho alterada", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const m = marca();
    const doc = await publicado(adm, "edital", { titulo: `Original ${m}` });
    await salvarRascunhoDocumento(
      { id: doc.id, tipo: "edital", revisaoBase: doc.revisao, dados: { ...doc.dados, titulo: `Alterado ${m}` } },
      edicaoDoDocumento(adm),
    );

    const aberto = await documentoPeloSlug("edital", doc.slug);
    expect(aberto?.dados.titulo).toBe(`Original ${m}`);
    expect(await ids("edital", `Alterado ${m}`)).toEqual([]);
    expect(aberto?.dados.textoPesquisavel).toBe("");
    expect(aberto?.pdfBytes).toBeGreaterThan(0);
  });

  it("busca “012” acha o edital nº 012/2026 (CA-US03.1)", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const m = marca();
    const alvo = await publicado(adm, "edital", { numero: `Edital nº 012/2026 ${m}` });
    await publicado(adm, "edital", { numero: `Edital nº 013/2026 ${m}` });

    const encontrados = await idsDaBusca("edital", "012");
    expect(encontrados.has(alvo.id)).toBe(true);
    expect(await ids("edital", `012/2026 ${m}`)).toEqual([alvo.id]);
  });

  it("a busca também procura no texto do PDF (P3), sem acento e sem maiúsculas", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const m = marca();
    const alvo = await publicado(adm, "edital", { textoPesquisavel: `Pauta: reajuste da categoria e eleição da comissão ${m}` });

    expect(await ids("edital", `ELEICAO DA COMISSAO ${m}`)).toEqual([alvo.id]);
  });

  it("a busca e o slug não misturam as abas", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const m = marca();
    const acordo = await publicado(adm, "acordo", { titulo: `Convenção ${m}` });

    expect(await ids("edital", m)).toEqual([]);
    expect(await ids("acordo", m)).toEqual([acordo.id]);
    expect(await documentoPeloSlug("edital", acordo.slug)).toBeNull();
    expect((await documentoPeloSlug("acordo", acordo.slug))?.id).toBe(acordo.id);
  });

  it("filtra por tipo e ano: no acordo, o ano é o do início da vigência", async () => {
    const adm = await pessoaDaEquipe("ADM");
    const m = marca();
    const act = await publicado(adm, "acordo", { titulo: `ACT ${m}`, subtipo: "act", vigenciaInicio: "2025-05-01", vigenciaFim: "2026-04-30" });
    const cct = await publicado(adm, "acordo", { titulo: `CCT ${m}`, subtipo: "cct", vigenciaInicio: "2026-05-01", vigenciaFim: "2027-04-30" });
    const busca = await idsDaBusca("acordo", m);
    const docs = await documentosNoAr("acordo");
    const lista = (f: { subtipo?: "act" | "cct"; ano?: number }) =>
      montarLista(docs, { busca: m, subtipo: f.subtipo ?? null, ano: f.ano ?? null, mais: 1 }, busca, new Date(), 7).itens.map((i) => i.id);

    expect(lista({})).toEqual([cct.id, act.id]);
    expect(lista({ subtipo: "act" })).toEqual([act.id]);
    expect(lista({ ano: 2026 })).toEqual([cct.id]);
    expect(lista({ ano: 2025, subtipo: "cct" })).toEqual([]);
  });

  it("slug com caracteres fora do padrão não chega ao banco", async () => {
    expect(await documentoPeloSlug("edital", "../x")).toBeNull();
    expect(await documentoPeloSlug("edital", "nao-existe-mesmo")).toBeNull();
  });
});
