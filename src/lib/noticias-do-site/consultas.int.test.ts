import { describe, expect, it } from "vitest";

import { agendarNoticia } from "@/lib/conteudos/agendar";
import { carregarNoticia } from "@/lib/conteudos/carregar";
import { arquivarConteudos, ocultarConteudos } from "@/lib/conteudos/ciclo-de-vida";
import type { DadosNoticia } from "@/lib/conteudos/dados";
import { fixarNoticia } from "@/lib/conteudos/fixar";
import { publicarNoticia } from "@/lib/conteudos/publicar";
import { salvarRascunhoNoticia } from "@/lib/conteudos/salvar";
import type { QuemDaEquipe } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";
import { idDaCategoria, noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import {
  categoriasDoSite,
  inicioDaJanela,
  leiaTambem,
  listarNoticiasDoSite,
  maisLidas,
  noticiaEmDestaque,
  noticiaPeloSlug,
  registrarVisualizacao,
} from "./consultas";

/**
 * Leituras públicas das notícias (RF02, CA-US02.1, CA-US02.2, CA-US21.6, CA-US21.8, E30, E59). O banco
 * é o mesmo para o arquivo inteiro: cada teste procura pelas próprias notícias (uma marca no título)
 * e usa um relógio próprio, depois de tudo o que os outros arquivos publicam.
 */

// Cada publicação deste arquivo acontece um dia depois da anterior, a partir de 2032.
let relogio = new Date("2032-01-01T12:00:00Z").getTime();
function proximoDia() {
  relogio += 24 * 60 * 60 * 1000;
  return new Date(relogio);
}

function marca() {
  return `m${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

async function publicada(quem: QuemDaEquipe, dados: Partial<DadosNoticia>) {
  const agora = proximoDia();
  const { id, revisao } = await rascunhoSalvo(quem, await noticiaCompleta(dados));
  const r = await publicarNoticia({ id, revisaoBase: revisao }, { quem, fila: filaEmMemoria().fila, agora });
  if (r.tipo !== "publicada") throw new Error("esperava publicada");
  return { id, slug: r.slug, revisao: r.revisaoPublicada, agora };
}

describe("lista de notícias do site (CA-US02.1)", () => {
  it("filtrar por categoria mostra só as publicadas dessa categoria, pela categoria que está no ar", async () => {
    const quem = await pessoaDaEquipe("COM");
    const m = marca();
    const juridico = await idDaCategoria("Jurídico");
    const geral = await idDaCategoria("Geral");
    const noJuridico = await publicada(quem, { titulo: `Plantão ${m}`, categoriaId: juridico });
    const noGeral = await publicada(quem, { titulo: `Feriado ${m}`, categoriaId: geral });
    // Mudar a categoria na cópia de trabalho não muda o site antes de publicar (E42).
    const atual = (await carregarNoticia(noJuridico.id, { quem }))!;
    await salvarRascunhoNoticia({ id: noJuridico.id, revisaoBase: atual.revisao, dados: { ...atual.dados, categoriaId: geral } }, edicaoDe(quem));

    const { itens } = await listarNoticiasDoSite({ categoriaId: juridico, busca: m });

    expect(itens.map((n) => n.id)).toEqual([noJuridico.id]);
    expect(itens[0]).toMatchObject({ categoria: { nome: "Jurídico", slug: "juridico" }, href: `/noticias/${noJuridico.slug}` });
    expect((await listarNoticiasDoSite({ categoriaId: geral, busca: m })).itens.map((n) => n.id)).toEqual([noGeral.id]);
  });

  it("a busca vale para manchete, linha fina e lide, sem diferença de acento nem de maiúsculas", async () => {
    const quem = await pessoaDaEquipe("COM");
    const m = marca();
    const pelaLinhaFina = await publicada(quem, { titulo: `Assembleia ${m}`, linhaFina: "Reajuste em votação na sede" });
    await publicada(quem, { titulo: `Outra ${m}` });

    const { itens } = await listarNoticiasDoSite({ busca: "REAJUSTE EM VOTACAO" });

    expect(itens.map((n) => n.id)).toContain(pelaLinhaFina.id);
    expect((await listarNoticiasDoSite({ busca: `${m} 100%` })).itens).toEqual([]);
  });

  it("“Carregar mais” (página 2) respeita categoria, busca e ordem e não repete itens nem o Destaque", async () => {
    const quem = await pessoaDaEquipe("COM");
    const m = marca();
    const beneficios = await idDaCategoria("Benefícios");
    const ids: string[] = [];
    for (const letra of ["A", "B", "C", "D", "E"]) ids.push((await publicada(quem, { titulo: `Convênio ${letra} ${m}`, categoriaId: beneficios })).id);
    await publicada(quem, { titulo: `Fora da categoria ${m}`, categoriaId: await idDaCategoria("Esportes") });
    const destaque = ids[1]!;
    const filtros = { categoriaId: beneficios, busca: m, ordem: "antigas" as const, porPagina: 2, excluir: destaque };

    const p1 = await listarNoticiasDoSite({ ...filtros, pagina: 1 });
    const p2 = await listarNoticiasDoSite({ ...filtros, pagina: 2 });
    const p3 = await listarNoticiasDoSite({ ...filtros, pagina: 3 });

    expect(p1).toMatchObject({ total: 4, paginas: 2 });
    expect(p1.itens.map((n) => n.id)).toEqual([ids[0], ids[2]]);
    expect(p2.itens.map((n) => n.id)).toEqual([ids[3], ids[4]]);
    // Página além do fim mostra a última, sem inventar itens.
    expect(p3.itens.map((n) => n.id)).toEqual([ids[3], ids[4]]);
  });

  it("as categorias com notícia no ar aparecem na ordem das Configurações, com a contagem", async () => {
    const quem = await pessoaDaEquipe("COM");
    await publicada(quem, { titulo: `Copa ${marca()}`, categoriaId: await idDaCategoria("Esportes") });

    const categorias = await categoriasDoSite();

    const nomes = categorias.map((c) => c.nome);
    expect(nomes).toContain("Esportes");
    expect(nomes.indexOf("Jurídico")).toBeLessThan(nomes.indexOf("Esportes"));
    expect(categorias.find((c) => c.nome === "Esportes")!.total).toBeGreaterThan(0);
    expect(nomes).not.toContain("Assembleias");
  });
});

describe("conteúdo não publicado não aparece (CA-US02.2)", () => {
  it("rascunho, agendada, oculta e arquivada ficam fora da lista e do endereço direto", async () => {
    const quem = await pessoaDaEquipe("COM");
    const m = marca();
    const rascunho = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: `Rascunho ${m}` }));
    const agendada = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: `Agendada ${m}` }));
    await agendarNoticia(
      { id: agendada.id, revisaoBase: agendada.revisao, para: new Date("2040-01-01T12:00:00Z") },
      { quem, fila: filaEmMemoria().fila, agora: new Date("2032-01-01T00:00:00Z") },
    );
    const oculta = await publicada(quem, { titulo: `Oculta ${m}` });
    await ocultarConteudos({ ids: [oculta.id], motivo: "Revisão" }, { quem });
    const arquivada = await publicada(quem, { titulo: `Arquivada ${m}` });
    await arquivarConteudos({ ids: [arquivada.id] }, { quem });
    const noAr = await publicada(quem, { titulo: `No ar ${m}` });

    expect((await listarNoticiasDoSite({ busca: m })).itens.map((n) => n.id)).toEqual([noAr.id]);
    expect(await noticiaPeloSlug(oculta.slug)).toBeNull();
    expect(await noticiaPeloSlug(arquivada.slug)).toBeNull();
    expect(await noticiaPeloSlug(noAr.slug)).toMatchObject({ id: noAr.id, dados: { titulo: `No ar ${m}` }, atualizadoEm: null });
    expect((await listarNoticiasDoSite({ busca: m })).itens.map((n) => n.id)).not.toContain(rascunho.id);
  });

  it("a notícia aberta mostra o retrato no ar, não a cópia em edição; republicada, diz quando foi atualizada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const m = marca();
    const n = await publicada(quem, { titulo: `Original ${m}` });
    const atual = (await carregarNoticia(n.id, { quem }))!;
    const salvo = await salvarRascunhoNoticia(
      { id: n.id, revisaoBase: atual.revisao, dados: { ...atual.dados, titulo: `Em edição ${m}` } },
      edicaoDe(quem),
    );
    expect((await noticiaPeloSlug(n.slug))!.dados.titulo).toBe(`Original ${m}`);

    if (salvo.tipo !== "salvo") throw new Error("esperava salvo");
    await publicarNoticia({ id: n.id, revisaoBase: salvo.revisao }, { quem, fila: filaEmMemoria().fila, agora: proximoDia() });

    const aberta = (await noticiaPeloSlug(n.slug))!;
    expect(aberta.dados.titulo).toBe(`Em edição ${m}`);
    expect(aberta.atualizadoEm).toBeInstanceOf(Date);
  });
});

describe("bloco DESTAQUE (RN58)", () => {
  it("CA-US21.6: a fixada aparece no Destaque até a data e depois sai sozinha", async () => {
    const quem = await pessoaDaEquipe("COM");
    const fixada = await publicada(quem, { titulo: `Fixada ${marca()}` });
    const maisNova = await publicada(quem, { titulo: `Mais nova ${marca()}` });
    const dia = maisNova.agora.toISOString().slice(0, 10);
    await fixarNoticia({ id: fixada.id, ate: dia }, { quem, fila: filaEmMemoria().fila, agora: maisNova.agora });

    expect(await noticiaEmDestaque(maisNova.agora)).toMatchObject({ id: fixada.id, fixada: true });
    const depois = new Date(maisNova.agora.getTime() + 2 * 24 * 60 * 60 * 1000);
    expect(await noticiaEmDestaque(depois)).toMatchObject({ id: maisNova.id, fixada: false });
  });

  it("CA-US21.8: sem fixada, o Destaque é a mais recente", async () => {
    const quem = await pessoaDaEquipe("COM");
    const recente = await publicada(quem, { titulo: `Recente ${marca()}` });

    expect(await noticiaEmDestaque(new Date(recente.agora.getTime() + 1000))).toMatchObject({ id: recente.id, fixada: false });
  });
});

describe("“Leia também” (RF02)", () => {
  it("primeiro as da mesma categoria, depois as recentes de outras, sem repetir a própria", async () => {
    const quem = await pessoaDaEquipe("COM");
    const radio = await idDaCategoria("Rádio Chofer");
    const base = await publicada(quem, { titulo: `Base ${marca()}`, categoriaId: radio });
    const irma = await publicada(quem, { titulo: `Irmã ${marca()}`, categoriaId: radio });
    const outra = await publicada(quem, { titulo: `Outra ${marca()}`, categoriaId: await idDaCategoria("Geral") });

    const lista = await leiaTambem(base.id, radio, 3);

    expect(lista).toHaveLength(3);
    expect(lista[0]!.id).toBe(irma.id);
    expect(lista.map((n) => n.id)).not.toContain(base.id);
    expect(lista.slice(1).map((n) => n.id)).toContain(outra.id);
  });
});

describe("Mais lidas e contador anônimo (E30, E59, T17)", () => {
  it("soma por dia e mostra as mais vistas dos últimos 7 dias, na ordem", async () => {
    const quem = await pessoaDaEquipe("COM");
    const [a, b, c, velha] = [
      await publicada(quem, { titulo: `Lida A ${marca()}` }),
      await publicada(quem, { titulo: `Lida B ${marca()}` }),
      await publicada(quem, { titulo: `Lida C ${marca()}` }),
      await publicada(quem, { titulo: `Lida velha ${marca()}` }),
    ];
    const hoje = new Date("2035-06-10T15:00:00Z");
    const ha6dias = new Date("2035-06-04T15:00:00Z");
    const ha7dias = new Date("2035-06-03T15:00:00Z");
    for (let i = 0; i < 3; i++) await registrarVisualizacao(b.id, hoje);
    for (let i = 0; i < 2; i++) await registrarVisualizacao(a.id, ha6dias);
    await registrarVisualizacao(c.id, hoje);
    // Fora da janela: não conta, por mais vista que tenha sido.
    for (let i = 0; i < 10; i++) await registrarVisualizacao(velha.id, ha7dias);

    expect((await maisLidas(hoje)).map((n) => n.id)).toEqual([b.id, a.id, c.id]);
  });

  it("com pouco dado, completa com as mais recentes", async () => {
    const quem = await pessoaDaEquipe("COM");
    const vista = await publicada(quem, { titulo: `Única vista ${marca()}` });
    const hoje = new Date("2036-03-10T15:00:00Z");
    await registrarVisualizacao(vista.id, hoje);

    const lista = await maisLidas(hoje);

    expect(lista).toHaveLength(3);
    expect(lista[0]!.id).toBe(vista.id);
  });

  it("não conta notícia fora do ar", async () => {
    const quem = await pessoaDaEquipe("COM");
    const rascunho = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: `Não conta ${marca()}` }));

    expect(await registrarVisualizacao(rascunho.id)).toBe(false);
  });

  it("a janela usa o calendário da Bahia", () => {
    // 02h00 UTC de 10/06 ainda é 09/06 na Bahia.
    expect(inicioDaJanela(new Date("2035-06-10T02:00:00Z"), 7)).toBe("2035-06-03");
  });
});
