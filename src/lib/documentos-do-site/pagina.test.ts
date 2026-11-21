import { describe, expect, it } from "vitest";

import { documentoVazio, type DadosDocumento, type TipoDocumento } from "@/lib/documentos/dados";

import { acordoVigente, anosDisponiveis, contadoresDeEditais, contagemPorSubtipo, destaqueDeEditais, gruposPorMes, montarLista, type DocumentoNoAr } from "./pagina";

const naBahia = (dia: string, hora = "10:00") => new Date(`${dia}T${hora}:00-03:00`);
const AGORA = naBahia("2026-11-21");

let n = 0;
function doc(tipo: TipoDocumento, publicadoEm: string, dados: Partial<DadosDocumento> = {}): DocumentoNoAr {
  n += 1;
  return {
    id: `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`,
    tipo,
    slug: `doc-${n}`,
    publicadoEm: naBahia(publicadoEm),
    dados: { ...documentoVazio(tipo), titulo: `Documento ${n}`, subtipo: tipo === "edital" ? "convocacao" : "act", pdfMidiaId: "x", ...dados },
    pdfBytes: 1024,
  };
}

const vazio = { busca: "", subtipo: null, ano: null, mais: 1 };

describe("destaque de Editais (E60)", () => {
  it("é o prazo em aberto mais perto de vencer, com a contagem", () => {
    const longe = doc("edital", "2026-11-01", { eventoData: "2026-12-10", eventoHora: "19:00" });
    const perto = doc("edital", "2026-10-01", { eventoData: "2026-11-23", eventoHora: "19:00" });
    const vencido = doc("edital", "2026-11-20", { eventoData: "2026-11-20", eventoHora: "19:00" });
    expect(destaqueDeEditais([longe, perto, vencido], AGORA)?.id).toBe(perto.id);
  });

  it("sem prazo em aberto, o mais recente; sem edital, nenhum", () => {
    const antigo = doc("edital", "2026-09-01");
    const recente = doc("edital", "2026-11-10");
    expect(destaqueDeEditais([antigo, recente], AGORA)?.id).toBe(recente.id);
    expect(destaqueDeEditais([], AGORA)).toBeNull();
  });
});

describe("contadores de Editais", () => {
  it("publicações no ano, prazos em aberto (pela regra do selo) e a última publicação", () => {
    const docs = [
      doc("edital", "2026-10-15", { eventoData: "2026-11-21", eventoHora: "18:00" }),
      doc("edital", "2026-03-02", { eventoData: "2026-11-21", eventoHora: "09:00" }), // venceu hoje cedo
      doc("edital", "2025-12-30"),
    ];
    expect(contadoresDeEditais(docs, AGORA)).toEqual({ ano: 2026, publicacoesNoAno: 2, prazosEmAberto: 1, ultimaAtualizacao: "15/10" });
  });
});

describe("lista", () => {
  it("Editais agrupados pelo mês da publicação, do mais novo ao mais antigo", () => {
    const out1 = doc("edital", "2026-10-20");
    const set = doc("edital", "2026-09-05");
    const out2 = doc("edital", "2026-10-08");
    const grupos = gruposPorMes(montarLista([set, out1, out2], vazio, null, AGORA, 7).itens);
    expect(grupos.map((g) => [g.rotulo, g.itens.map((i) => i.id)])).toEqual([
      ["Outubro de 2026", [out1.id, out2.id]],
      ["Setembro de 2026", [set.id]],
    ]);
  });

  it("“Novo”, a contagem e os endereços do documento e do PDF", () => {
    const d = doc("edital", "2026-11-18", { eventoData: "2026-11-23", eventoHora: "19:00" });
    const [item] = montarLista([d], vazio, null, AGORA, 7).itens;
    expect(item).toMatchObject({
      href: `/documentos/editais/${d.slug}`,
      novo: true,
      contagem: "Faltam 2 dias",
      cartao: { selo: { tom: "prazo" }, hrefAbrir: `/documentos/editais/${d.slug}/pdf?modo=abrir`, hrefBaixar: `/documentos/editais/${d.slug}/pdf?modo=baixar` },
    });
  });

  it("mostra 10 por vez e diz se há mais", () => {
    const docs = Array.from({ length: 12 }, (_, i) => doc("edital", `2026-10-${String(i + 1).padStart(2, "0")}`));
    expect(montarLista(docs, vazio, null, AGORA, 7)).toMatchObject({ total: 12, temMais: true });
    expect(montarLista(docs, vazio, null, AGORA, 7).itens).toHaveLength(10);
    expect(montarLista(docs, { ...vazio, mais: 2 }, null, AGORA, 7)).toMatchObject({ total: 12, temMais: false });
  });

  it("Acordos pelo início da vigência; anos e tipos só com o que existe", () => {
    const a24 = doc("acordo", "2026-11-01", { subtipo: "act", vigenciaInicio: "2024-05-01", vigenciaFim: "2025-04-30" });
    const a26 = doc("acordo", "2026-05-02", { subtipo: "act", vigenciaInicio: "2026-05-01", vigenciaFim: "2027-04-30" });
    const c25 = doc("acordo", "2025-05-02", { subtipo: "cct", vigenciaInicio: "2025-05-01", vigenciaFim: "2026-04-30" });
    const docs = [a24, a26, c25];
    expect(montarLista(docs, vazio, null, AGORA, 7).itens.map((i) => [i.id, i.ano])).toEqual([
      [a26.id, 2026],
      [c25.id, 2025],
      [a24.id, 2024],
    ]);
    expect(anosDisponiveis(docs)).toEqual([2026, 2025, 2024]);
    expect(contagemPorSubtipo("acordo", docs)).toEqual([
      { subtipo: "act", total: 2 },
      { subtipo: "cct", total: 1 },
    ]);
    expect(contagemPorSubtipo("edital", [doc("edital", "2026-01-01")])).toEqual([{ subtipo: "convocacao", total: 1 }]);
  });
});

describe("acordo vigente (topo de Acordos)", () => {
  it("o vigente com o início mais recente; sem vigente, nenhum", () => {
    const antigo = doc("acordo", "2025-05-02", { vigenciaInicio: "2025-05-01", vigenciaFim: "2027-04-30" });
    const novo = doc("acordo", "2026-05-02", { vigenciaInicio: "2026-05-01", vigenciaFim: "2027-04-30" });
    const encerrado = doc("acordo", "2024-05-02", { vigenciaInicio: "2024-05-01", vigenciaFim: "2025-04-30" });
    expect(acordoVigente([antigo, encerrado, novo], AGORA)?.id).toBe(novo.id);
    expect(acordoVigente([encerrado], AGORA)).toBeNull();
  });
});
