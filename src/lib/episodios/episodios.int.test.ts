import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { lerConfigSite, limparCacheConfigSite } from "@/lib/config-site";
import { banco } from "@/lib/db";
import { categoria, episodio, midia, midiaUso } from "@/lib/db/schema";
import { SemPermissao } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";
import { IDS_SIMULADOS, youtubeSimulado, type Youtube } from "@/lib/youtube/youtube";
import { pessoaDaEquipe } from "@/testes/equipe";
import { atividadesDe } from "@/testes/noticias";

import {
  buscarVideo,
  excluirEpisodio,
  listarEpisodios,
  marcarUltimoPrograma,
  proximoNumero,
  salvarEpisodio,
  tirarDoSite,
} from "./episodios";
import { gravarProgramaAoVivo, lerProgramaAoVivo } from "./gravar-programa";
import { ConfirmarSaidaDoSite, ErroEpisodio, type CamposEpisodio } from "./regras";
import { episodiosDoSite, responderCapa, responderTranscricao, temasDoSite, ultimoPrograma } from "./site";
import { executarEntradaDoEpisodio } from "./tarefa";

/** 21/11/2026 às 12h00 na Bahia. */
const AGORA = new Date("2026-11-21T15:00:00Z");

function idDoYoutube(): string {
  return randomUUID().replace(/-/g, "").slice(0, 11);
}

let proximo = 1;
const campos = (mais: Partial<CamposEpisodio> = {}): CamposEpisodio => ({
  link: `https://youtu.be/${idDoYoutube()}`,
  numero: String(proximo++),
  titulo: "Saúde mental no volante",
  duracao: "28:10",
  resumo: "Psicóloga explica como lidar com o estresse do trânsito.",
  temaId: "",
  data: "2026-11-20",
  hora: "13:00",
  transcricao: "",
  capaMidiaId: "",
  ultimoPrograma: false,
  tituloYoutube: "",
  canalYoutube: "",
  ...mais,
});

async function linha(id: string) {
  const [l] = await banco().select().from(episodio).where(eq(episodio.id, id));
  return l;
}

async function publicado(mais: Partial<CamposEpisodio> = {}) {
  const quem = await pessoaDaEquipe("COM");
  const { fila } = filaEmMemoria();
  const r = await salvarEpisodio({ campos: campos(mais), modo: "programar" }, { quem, fila, agora: AGORA });
  return { ...r, quem };
}

async function temaDoRadio(nome = `Tema ${randomUUID().slice(0, 6)}`) {
  const [t] = await banco()
    .insert(categoria)
    .values({ nome, cor: "azul", ordem: 50, escopos: ["radio"] })
    .returning({ id: categoria.id, nome: categoria.nome });
  return t!;
}

/** O site mostra tudo o que está no ar: cada bloco que confere o site começa sem episódios. */
async function semEpisodios() {
  await banco().delete(midiaUso).where(eq(midiaUso.donoTipo, "episodio"));
  await banco().delete(episodio);
}

describe("Episódios: permissões (spec §4)", () => {
  it("ADM e COM gerenciam; ATD não", async () => {
    const atd = await pessoaDaEquipe("ATD");
    const { fila } = filaEmMemoria();
    await expect(salvarEpisodio({ campos: campos(), modo: "rascunho" }, { quem: atd, fila })).rejects.toBeInstanceOf(SemPermissao);
    await expect(listarEpisodios({ pagina: 1, porPagina: 20 }, { quem: atd })).rejects.toBeInstanceOf(SemPermissao);
    await expect(buscarVideo({ link: "https://youtu.be/ab12Cd34Ef5" }, { quem: atd, youtube: youtubeSimulado() })).rejects.toBeInstanceOf(
      SemPermissao,
    );
    const adm = await pessoaDaEquipe("ADM");
    await expect(salvarEpisodio({ campos: campos(), modo: "rascunho" }, { quem: adm, fila })).resolves.toMatchObject({
      situacao: "rascunho",
    });
  });
});

describe("Episódios: buscar o vídeo (CA-US25.1, CA-US25.2)", () => {
  it("link válido: título, canal e duração vêm do YouTube", async () => {
    const quem = await pessoaDaEquipe("COM");
    const r = await buscarVideo({ link: "https://www.youtube.com/watch?v=ab12Cd34Ef5" }, { quem, youtube: youtubeSimulado() });
    expect(r).toEqual({ tipo: "ok", youtubeId: "ab12Cd34Ef5", titulo: "Rádio Chofer — vídeo ab12Cd34Ef5", canal: "SINTRAVC", duracaoSeg: 1690 });
  });

  it("link que não é do YouTube: mensagem de link inválido", async () => {
    const quem = await pessoaDaEquipe("COM");
    await expect(buscarVideo({ link: "https://vimeo.com/123" }, { quem, youtube: youtubeSimulado() })).rejects.toMatchObject({
      campo: "link",
      message: expect.stringContaining("não é de um vídeo do YouTube"),
    });
  });

  it("vídeo privado: avisa; YouTube fora do ar: deixa preencher à mão", async () => {
    const quem = await pessoaDaEquipe("COM");
    await expect(
      buscarVideo({ link: `https://youtu.be/${IDS_SIMULADOS.naoEncontrado}` }, { quem, youtube: youtubeSimulado() }),
    ).rejects.toMatchObject({ message: expect.stringContaining("Não encontramos esse vídeo") });
    expect(await buscarVideo({ link: `https://youtu.be/${IDS_SIMULADOS.foraDoAr}` }, { quem, youtube: youtubeSimulado() })).toEqual({
      tipo: "fora_do_ar",
      youtubeId: IDS_SIMULADOS.foraDoAr,
    });
  });

  it("vídeo já cadastrado: diz em qual episódio", async () => {
    const yt = idDoYoutube();
    const { quem } = await publicado({ link: `https://youtu.be/${yt}`, numero: "4242" });
    await expect(buscarVideo({ link: `https://youtube.com/watch?v=${yt}` }, { quem, youtube: youtubeSimulado() })).rejects.toMatchObject({
      message: "Esse vídeo já está no Ep. 4242.",
    });
  });
});

describe("Episódios: salvar, agendar e publicar (E61)", () => {
  it("exibição no passado: vai ao ar na hora, com a Atividade na mesma transação", async () => {
    const { id } = await publicado();
    expect(await linha(id)).toMatchObject({ estado: "publicado", jaPublicado: true, publicadoEm: AGORA, duracaoSeg: 1690 });
    expect((await atividadesDe(id)).map((a) => a.acao)).toEqual(["episodio.criar", "episodio.publicar"]);
  });

  it("exibição no futuro: fica agendado e o pedido da T03 entra na fila", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila, pedidosEpisodio } = filaEmMemoria();
    const { id, situacao } = await salvarEpisodio(
      { campos: campos({ data: "2026-11-29", hora: "13:00" }), modo: "programar" },
      { quem, fila, agora: AGORA },
    );
    expect(situacao).toBe("agendado");
    expect(pedidosEpisodio).toEqual([{ episodioId: id, para: "2026-11-29T16:00:00.000Z" }]);
    expect((await atividadesDe(id)).map((a) => a.acao)).toEqual(["episodio.criar", "episodio.agendar"]);
  });

  it("número e vídeo repetidos são recusados, com o campo certo", async () => {
    const yt = idDoYoutube();
    const { quem } = await publicado({ link: `https://youtu.be/${yt}`, numero: "5100" });
    const { fila } = filaEmMemoria();
    await expect(salvarEpisodio({ campos: campos({ numero: "5100" }), modo: "rascunho" }, { quem, fila })).rejects.toMatchObject({
      campo: "numero",
      message: "Já existe o Ep. 5100. Use outro número.",
    });
    await expect(
      salvarEpisodio({ campos: campos({ link: `https://youtu.be/${yt}` }), modo: "rascunho" }, { quem, fila }),
    ).rejects.toMatchObject({ campo: "link", message: "Esse vídeo já está no Ep. 5100." });
  });

  it("o tema tem de ter o escopo Rádio Chofer (E15)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const [deNoticia] = await banco()
      .insert(categoria)
      .values({ nome: `Só notícia ${randomUUID().slice(0, 6)}`, cor: "azul", ordem: 60, escopos: ["noticias"] })
      .returning({ id: categoria.id });
    await expect(salvarEpisodio({ campos: campos({ temaId: deNoticia!.id }), modo: "rascunho" }, { quem, fila })).rejects.toMatchObject({
      campo: "tema",
    });
    const tema = await temaDoRadio();
    await expect(salvarEpisodio({ campos: campos({ temaId: tema.id }), modo: "rascunho" }, { quem, fila })).resolves.toBeTruthy();
  });

  it("a capa trocada fica presa ao episódio pela Mídia (RN16)", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const [imagem] = await banco()
      .insert(midia)
      .values({ chaveR2: `teste/${randomUUID()}.jpg`, nomeArquivo: "capa.jpg", tipo: "imagem", mime: "image/jpeg", bytes: 10, enviadoPor: quem.id })
      .returning({ id: midia.id });
    const { id } = await salvarEpisodio({ campos: campos({ capaMidiaId: imagem!.id }), modo: "rascunho" }, { quem, fila });
    const usos = await banco()
      .select({ midiaId: midiaUso.midiaId, donoTipo: midiaUso.donoTipo, donoId: midiaUso.donoId })
      .from(midiaUso)
      .where(eq(midiaUso.donoId, id));
    expect(usos).toEqual([{ midiaId: imagem!.id, donoTipo: "episodio", donoId: id }]);
  });

  it("no ar, “Salvar rascunho” não vale; editar vale na hora e vai para a Atividade", async () => {
    const { id, quem } = await publicado();
    const { fila } = filaEmMemoria();
    const atual = await linha(id);
    const base = campos({ link: `https://youtu.be/${atual!.youtubeId}`, numero: String(atual!.numero) });
    await expect(salvarEpisodio({ id, campos: base, modo: "rascunho" }, { quem, fila, agora: AGORA })).rejects.toBeInstanceOf(ErroEpisodio);
    await salvarEpisodio({ id, campos: { ...base, titulo: "Título novo" }, modo: "programar" }, { quem, fila, agora: AGORA });
    expect((await linha(id))!.titulo).toBe("Título novo");
    const editar = (await atividadesDe(id)).find((a) => a.acao === "episodio.editar");
    expect(editar?.detalhe).toMatchObject({ titulo: { de: "Saúde mental no volante", para: "Título novo" } });
  });

  it("no ar, mover a exibição para o futuro pede confirmação; confirmado, sai do site até lá e o topo cai no mais recente no ar", async () => {
    await semEpisodios();
    await publicado({ numero: "801", data: "2026-11-10" });
    const { id, quem } = await publicado({ numero: "802", data: "2026-11-15", ultimoPrograma: true });
    const { fila, pedidosEpisodio } = filaEmMemoria();
    const atual = await linha(id);
    const futuro = campos({
      link: `https://youtu.be/${atual!.youtubeId}`,
      numero: "802",
      data: "2026-11-29",
      hora: "13:00",
      ultimoPrograma: true,
    });

    // Sem a confirmação, o servidor recusa e nada muda.
    await expect(salvarEpisodio({ id, campos: futuro, modo: "programar" }, { quem, fila, agora: AGORA })).rejects.toBeInstanceOf(
      ConfirmarSaidaDoSite,
    );
    expect((await linha(id))!.estado).toBe("publicado");

    // Confirmado: vira agendado, a marca de último programa fica, e o topo mostra o mais recente no ar.
    const r = await salvarEpisodio({ id, campos: futuro, modo: "programar", confirmarSaidaDoSite: true }, { quem, fila, agora: AGORA });
    expect(r.situacao).toBe("agendado");
    expect(await linha(id)).toMatchObject({ estado: "agendado", ultimoPrograma: true });
    expect(pedidosEpisodio).toEqual([{ episodioId: id, para: "2026-11-29T16:00:00.000Z" }]);
    expect((await ultimoPrograma(AGORA))?.numero).toBe(801);
    expect((await ultimoPrograma(new Date("2026-11-29T16:00:00Z")))?.numero).toBe(802);
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "episodio.agendar", detalhe: { saiu_do_site: true } });
  });
});

describe("Episódios: último programa (R12)", () => {
  it("só um; marcar outro substitui o anterior e a Atividade guarda qual era", async () => {
    await semEpisodios();
    const a = await publicado({ ultimoPrograma: true, numero: "601" });
    const b = await publicado({ ultimoPrograma: true, numero: "602" });
    expect((await linha(a.id))!.ultimoPrograma).toBe(false);
    expect((await linha(b.id))!.ultimoPrograma).toBe(true);
    const marcar = (await atividadesDe(b.id)).find((x) => x.acao === "episodio.marcar_ultimo");
    expect(marcar?.detalhe).toEqual({ anterior: "Ep. 601 — Saúde mental no volante" });

    await marcarUltimoPrograma({ id: a.id }, { quem: a.quem });
    expect((await linha(a.id))!.ultimoPrograma).toBe(true);
    expect((await linha(b.id))!.ultimoPrograma).toBe(false);
  });

  it("desmarcar pelo modal também vai para a Atividade, na mesma transação", async () => {
    const { id, quem } = await publicado({ ultimoPrograma: true, numero: "620" });
    const { fila } = filaEmMemoria();
    const atual = await linha(id);
    const base = campos({ link: `https://youtu.be/${atual!.youtubeId}`, numero: "620", ultimoPrograma: false });
    await salvarEpisodio({ id, campos: base, modo: "programar" }, { quem, fila, agora: AGORA });
    expect((await linha(id))!.ultimoPrograma).toBe(false);
    expect((await atividadesDe(id)).map((a) => a.acao)).toContain("episodio.desmarcar_ultimo");
  });

  it("duas marcações ao mesmo tempo: fica uma só, sem erro", async () => {
    await semEpisodios();
    const eps = await Promise.all([publicado({ numero: "611" }), publicado({ numero: "612" }), publicado({ numero: "613" })]);
    await Promise.all(eps.map((e) => marcarUltimoPrograma({ id: e.id }, { quem: e.quem })));
    const [{ total }] = (await banco().execute(sql`SELECT count(*)::int AS total FROM episodio WHERE ultimo_programa`)) as unknown as [
      { total: number },
    ];
    expect(total).toBe(1);
  });
});

describe("Episódios: tirar do site e excluir (E61)", () => {
  it("tirar do site: volta a rascunho, perde a marca de último e não pode mais ser excluído", async () => {
    const { id, quem } = await publicado({ ultimoPrograma: true });
    await tirarDoSite({ id }, { quem, agora: AGORA });
    expect(await linha(id)).toMatchObject({ estado: "rascunho", ultimoPrograma: false, jaPublicado: true });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({
      acao: "episodio.tirar_do_site",
      detalhe: { situacao_antes: "no_ar", era_ultimo_programa: true },
    });
    await expect(excluirEpisodio({ id }, { quem })).rejects.toMatchObject({ message: expect.stringContaining("nunca foi ao ar") });
  });

  it("agendado que já passou da hora (T03 atrasada) conta como já publicado ao tirar do site", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const { id } = await salvarEpisodio({ campos: campos({ data: "2026-11-29" }), modo: "programar" }, { quem, fila, agora: AGORA });
    await tirarDoSite({ id }, { quem, agora: new Date("2026-11-30T12:00:00Z") });
    expect(await linha(id)).toMatchObject({ estado: "rascunho", jaPublicado: true });
  });

  it("excluir: só o rascunho que nunca foi ao ar", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const { id } = await salvarEpisodio({ campos: campos(), modo: "rascunho" }, { quem, fila });
    await excluirEpisodio({ id }, { quem });
    expect(await linha(id)).toBeUndefined();
    expect((await atividadesDe(id)).map((a) => a.acao)).toEqual(["episodio.criar", "episodio.excluir"]);

    const { id: noAr } = await publicado();
    await expect(excluirEpisodio({ id: noAr }, { quem })).rejects.toBeInstanceOf(ErroEpisodio);
  });
});

describe("T03 · Episódios agendados (spec §6)", () => {
  it("na hora, acerta o estado e grava a entrada no ar com o ator sistema e o atraso", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila, pedidosEpisodio } = filaEmMemoria();
    const { id } = await salvarEpisodio({ campos: campos({ data: "2026-11-29", hora: "13:00" }), modo: "programar" }, { quem, fila, agora: AGORA });
    const pedido = pedidosEpisodio[0]!;
    expect(await executarEntradaDoEpisodio(pedido, { agora: new Date("2026-11-29T16:00:30Z") })).toEqual({ tipo: "feita" });
    expect(await linha(id)).toMatchObject({ estado: "publicado", jaPublicado: true, publicadoEm: new Date("2026-11-29T16:00:00Z") });
    expect((await atividadesDe(id)).at(-1)).toMatchObject({ acao: "episodio.entrar_no_ar", atorTipo: "sistema", detalhe: { atraso_segundos: 30 } });

    // Idempotente: rodar de novo não faz nada.
    expect(await executarEntradaDoEpisodio(pedido)).toEqual({ tipo: "ignorada" });
  });

  it("pedido velho (exibição mudou ou voltou a rascunho) não faz nada", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila, pedidosEpisodio } = filaEmMemoria();
    const c = campos({ data: "2026-11-29", hora: "13:00" });
    const { id } = await salvarEpisodio({ campos: c, modo: "programar" }, { quem, fila, agora: AGORA });
    await salvarEpisodio({ id, campos: { ...c, data: "2026-11-30" }, modo: "programar" }, { quem, fila, agora: AGORA });
    expect(await executarEntradaDoEpisodio(pedidosEpisodio[0]!)).toEqual({ tipo: "ignorada" });
    expect((await linha(id))!.estado).toBe("agendado");

    await salvarEpisodio({ id, campos: { ...c, data: "2026-11-30" }, modo: "rascunho" }, { quem, fila, agora: AGORA });
    expect(await executarEntradaDoEpisodio(pedidosEpisodio[1]!)).toEqual({ tipo: "ignorada" });
  });
});

describe("Rádio Chofer no site (RF05, E61)", () => {
  beforeEach(semEpisodios);

  it("segue o relógio: o agendado aparece na hora da exibição, o rascunho nunca", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    await salvarEpisodio({ campos: campos({ numero: "701", data: "2026-11-29" }), modo: "programar" }, { quem, fila, agora: AGORA });
    await salvarEpisodio({ campos: campos({ numero: "702" }), modo: "rascunho" }, { quem, fila, agora: AGORA });
    const filtros = { busca: "", tema: null, leva: 1 };
    expect((await episodiosDoSite(filtros, AGORA)).itens).toEqual([]);
    const depois = await episodiosDoSite(filtros, new Date("2026-11-29T16:00:00Z"));
    expect(depois.itens.map((e) => e.numero)).toEqual([701]);
  });

  it("topo: o último programa no ar ou, sem ele, o mais recente", async () => {
    await publicado({ numero: "711", data: "2026-11-10" });
    const marcado = await publicado({ numero: "712", data: "2026-11-01", ultimoPrograma: true });
    expect((await ultimoPrograma(AGORA))?.numero).toBe(712);
    await tirarDoSite({ id: marcado.id }, { quem: marcado.quem, agora: AGORA });
    expect((await ultimoPrograma(AGORA))?.numero).toBe(711);
  });

  it("grade do mais novo ao mais antigo, 6 por leva; busca pelo texto, sem acento, e pelo número", async () => {
    for (let i = 0; i < 7; i++) {
      await publicado({ numero: String(720 + i), data: `2026-11-${String(10 + i).padStart(2, "0")}`, titulo: i === 3 ? "Jornada e escala" : `Programa ${i}` });
    }
    const primeira = await episodiosDoSite({ busca: "", tema: null, leva: 1 }, AGORA);
    expect(primeira.itens.map((e) => e.numero)).toEqual([726, 725, 724, 723, 722, 721]);
    expect(primeira).toMatchObject({ total: 7, temMais: true });
    expect((await episodiosDoSite({ busca: "", tema: null, leva: 2 }, AGORA)).itens).toHaveLength(7);
    expect((await episodiosDoSite({ busca: "JORNÁDA", tema: null, leva: 1 }, AGORA)).itens.map((e) => e.numero)).toEqual([723]);
    expect((await episodiosDoSite({ busca: "ep 721", tema: null, leva: 1 }, AGORA)).itens.map((e) => e.numero)).toEqual([721]);
  });

  it("tema: o seletor lista só os temas com episódio no ar; tema sem episódio dá lista vazia", async () => {
    const saude = await temaDoRadio("Saúde do rodoviário");
    const vazio = await temaDoRadio("Tema sem episódio");
    await publicado({ numero: "731", temaId: saude.id });
    await publicado({ numero: "732" });
    const temas = await temasDoSite(AGORA);
    expect(temas.map((t) => t.nome)).toContain(saude.nome);
    expect(temas.map((t) => t.nome)).not.toContain(vazio.nome);
    expect((await episodiosDoSite({ busca: "", tema: "saude-do-rodoviario", leva: 1 }, AGORA)).itens.map((e) => e.numero)).toEqual([731]);
    expect((await episodiosDoSite({ busca: "", tema: "tema-sem-episodio", leva: 1 }, AGORA)).itens).toEqual([]);
  });

  it("a capa vai pela nossa rota, nunca pelo i.ytimg.com", async () => {
    const yt = idDoYoutube();
    await publicado({ link: `https://youtu.be/${yt}` });
    const [ep] = (await episodiosDoSite({ busca: "", tema: null, leva: 1 }, AGORA)).itens;
    expect(ep!.capaUrl).toBe(`/radio-chofer/capa/${yt}`);
  });
});

describe("Rota da capa (E61)", () => {
  beforeEach(semEpisodios);

  it("serve a capa do YouTube só para episódio no ar, com cache público", async () => {
    const yt = idDoYoutube();
    await publicado({ link: `https://youtu.be/${yt}` });
    const pedidos: string[] = [];
    const youtube: Youtube = {
      ...youtubeSimulado(),
      async baixarCapa(id) {
        pedidos.push(id);
        return { bytes: new Uint8Array([0xff, 0xd8, 0xff]), tipo: "image/jpeg" };
      },
    };
    const r = await responderCapa({ youtubeId: yt }, { youtube, agora: AGORA });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect(r.headers.get("cache-control")).toContain("public");
    expect(pedidos).toEqual([yt]);
  });

  it("id fora do ar ou malformado: 404, sem pedir nada ao YouTube", async () => {
    const quem = await pessoaDaEquipe("COM");
    const { fila } = filaEmMemoria();
    const rascunho = idDoYoutube();
    await salvarEpisodio({ campos: campos({ link: `https://youtu.be/${rascunho}` }), modo: "rascunho" }, { quem, fila });
    const pedidos: string[] = [];
    const youtube: Youtube = {
      ...youtubeSimulado(),
      async baixarCapa(id) {
        pedidos.push(id);
        return null;
      },
    };
    expect((await responderCapa({ youtubeId: rascunho }, { youtube, agora: AGORA })).status).toBe(404);
    expect((await responderCapa({ youtubeId: "dQw4w9WgXcQ" }, { youtube, agora: AGORA })).status).toBe(404);
    expect((await responderCapa({ youtubeId: "../../etc" }, { youtube, agora: AGORA })).status).toBe(404);
    expect(pedidos).toEqual([]);
  });

  it("YouTube fora do ar: serve a capa padrão do Rádio Chofer", async () => {
    await publicado({ link: `https://youtu.be/${IDS_SIMULADOS.foraDoAr}` });
    const r = await responderCapa({ youtubeId: IDS_SIMULADOS.foraDoAr }, { youtube: youtubeSimulado(), agora: AGORA });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect(r.headers.get("x-capa-padrao")).toBe("1");
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("transcrição: só do episódio no ar e com texto", async () => {
    const yt = idDoYoutube();
    await publicado({ link: `https://youtu.be/${yt}`, transcricao: "Bom dia, rodoviários!\nHoje vamos falar de saúde." });
    const r = await responderTranscricao({ youtubeId: yt }, { agora: AGORA });
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("Bom dia, rodoviários!\nHoje vamos falar de saúde.");
    const semTexto = idDoYoutube();
    await publicado({ link: `https://youtu.be/${semTexto}` });
    expect((await responderTranscricao({ youtubeId: semTexto }, { agora: AGORA })).status).toBe(404);
  });
});

describe("Programa ao vivo (E61, P10)", () => {
  it("seed: de segunda a sexta, das 13h às 14h, no canal das redes", async () => {
    limparCacheConfigSite();
    const config = await lerConfigSite();
    expect(config.programa).toEqual({ ativo: true, canal: config.redes.youtube, dias: [1, 2, 3, 4, 5], inicio: "13:00", fim: "14:00" });
  });

  it("ADM e COM gravam, com a Atividade; ATD não; dados inválidos são recusados", async () => {
    const com = await pessoaDaEquipe("COM");
    const atd = await pessoaDaEquipe("ATD");
    const antes = await lerProgramaAoVivo({ quem: com });
    const novo = { ativo: false, canal: "https://www.youtube.com/@sintravc", dias: [5, 1], inicio: "12:00", fim: "13:30" };
    await expect(gravarProgramaAoVivo(novo, { quem: atd })).rejects.toBeInstanceOf(SemPermissao);
    await expect(gravarProgramaAoVivo({ ...novo, fim: "11:00" }, { quem: com })).rejects.toMatchObject({ campo: "fim" });
    await expect(gravarProgramaAoVivo({ ...novo, canal: "https://vimeo.com/x" }, { quem: com })).rejects.toMatchObject({ campo: "canal" });

    await gravarProgramaAoVivo(novo, { quem: com });
    expect(await lerProgramaAoVivo({ quem: com })).toEqual({ ...novo, dias: [1, 5] });
    const [registro] = await atividadesDe("programa").then((l) => l.filter((a) => a.acao === "radio.programa_editar").slice(-1));
    expect(registro).toMatchObject({ atorId: com.id, detalhe: { de: antes, para: { ...novo, dias: [1, 5] } } });

    await gravarProgramaAoVivo(antes, { quem: com });
  });

  it("número sugerido: o maior + 1", async () => {
    const { quem } = await publicado({ numero: "9000" });
    expect(await proximoNumero({ quem })).toBe(9001);
  });
});
