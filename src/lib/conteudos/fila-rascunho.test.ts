import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { noticiaVazia, type DadosNoticia } from "./dados";
import {
  armazemEmMemoria,
  criarFilaDoRascunho,
  limparAoSair,
  type PedidoEnvio,
  type RespostaEnvio,
} from "./fila-rascunho";

const ANA = "pessoa-ana";
const BRUNO = "pessoa-bruno";
const INTERVALO = 2000;
const dados = (titulo: string): DadosNoticia => ({ ...noticiaVazia(), titulo });

/** Servidor falso: guarda o que recebeu e responde como o salvamento real (revisão). */
function servidorFalso() {
  const recebidos: PedidoEnvio[] = [];
  let revisao = 0;
  let online = true;
  let proxima: RespostaEnvio | null = null;
  return {
    recebidos,
    ficarOffline: () => (online = false),
    ficarOnline: () => (online = true),
    online: () => online,
    responderUmaVez: (r: RespostaEnvio) => (proxima = r),
    salvarPorFora: () => (revisao += 1),
    enviar: vi.fn(async (pedido: PedidoEnvio): Promise<RespostaEnvio> => {
      if (!online) return { tipo: "sem_conexao" };
      recebidos.push(structuredClone(pedido));
      if (proxima) {
        const r = proxima;
        proxima = null;
        return r;
      }
      if (pedido.id && pedido.revisaoBase !== revisao) {
        return { tipo: "conflito", servidor: { revisao, dados: dados("Do servidor"), salvoPorNome: "Carlos", salvoEm: "2026-11-09T13:38:00Z" } };
      }
      revisao += 1;
      return { tipo: "salvo", id: pedido.id ?? "noticia-1", revisao, salvoEm: "2026-11-09T13:42:00Z", revisaoPublicada: null };
    }),
  };
}

function montar(opcoes: { pessoaId?: string; id?: string | null; revisao?: number } = {}) {
  const servidor = servidorFalso();
  const armazem = armazemEmMemoria();
  const fila = criarFilaDoRascunho({
    pessoaId: opcoes.pessoaId ?? ANA,
    id: opcoes.id ?? null,
    revisao: opcoes.revisao ?? 0,
    intervaloMs: INTERVALO,
    enviar: servidor.enviar,
    online: servidor.online,
    armazem,
  });
  return { servidor, armazem, fila };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("salvamento automático (RF38, CA-US21.1)", () => {
  it("espera a pessoa parar de digitar pelo intervalo e envia só a última versão", async () => {
    const { servidor, fila } = montar();

    fila.alterar(dados("P"));
    await vi.advanceTimersByTimeAsync(1000);
    fila.alterar(dados("Plantão"));
    await vi.advanceTimersByTimeAsync(INTERVALO - 1);
    expect(servidor.recebidos).toHaveLength(0);
    expect(fila.estado().situacao).toBe("pendente");

    await vi.advanceTimersByTimeAsync(1);

    expect(servidor.recebidos.map((p) => p.dados.titulo)).toEqual(["Plantão"]);
    expect(fila.estado()).toMatchObject({ situacao: "sincronizado", id: "noticia-1", revisao: 1, salvoEm: "2026-11-09T13:42:00Z" });
  });

  it("depois de criada, os próximos salvamentos vão com o id e a revisão que o servidor devolveu", async () => {
    const { servidor, fila } = montar();
    fila.alterar(dados("Um"));
    await vi.advanceTimersByTimeAsync(INTERVALO);
    fila.alterar(dados("Dois"));
    await vi.advanceTimersByTimeAsync(INTERVALO);

    expect(servidor.recebidos.map(({ id, revisaoBase }) => ({ id, revisaoBase }))).toEqual([
      { id: undefined, revisaoBase: undefined },
      { id: "noticia-1", revisaoBase: 1 },
    ]);
  });

  it("“Salvar rascunho” e Ctrl+S enviam na hora", async () => {
    const { servidor, fila } = montar();
    fila.alterar(dados("Agora"));
    await fila.salvarAgora();
    expect(servidor.recebidos).toHaveLength(1);
  });

  it("o que a pessoa digita enquanto o envio está a caminho não se perde", async () => {
    const { servidor, fila } = montar();
    let liberar!: () => void;
    servidor.enviar.mockImplementationOnce(
      (pedido) =>
        new Promise((resolve) => {
          servidor.recebidos.push(structuredClone(pedido));
          liberar = () => resolve({ tipo: "salvo", id: "noticia-1", revisao: servidor.salvarPorFora(), salvoEm: "x", revisaoPublicada: null });
        }),
    );
    fila.alterar(dados("Antes"));
    await vi.advanceTimersByTimeAsync(INTERVALO);
    fila.alterar(dados("Durante o envio"));
    liberar();
    await vi.advanceTimersByTimeAsync(INTERVALO);

    expect(servidor.recebidos.map((p) => p.dados.titulo)).toEqual(["Antes", "Durante o envio"]);
    expect(fila.estado().situacao).toBe("sincronizado");
  });

  it("há pendência (modal “Sair sem salvar?”) enquanto algo não chegou ao servidor", async () => {
    const { fila } = montar();
    expect(fila.temPendencia()).toBe(false);
    fila.alterar(dados("x"));
    expect(fila.temPendencia()).toBe(true);
    await vi.advanceTimersByTimeAsync(INTERVALO);
    expect(fila.temPendencia()).toBe(false);
  });

  it("erro do servidor (ex.: manchete longa demais) fica no estado, com a mensagem, e a cópia continua guardada", async () => {
    const { servidor, fila } = montar();
    servidor.responderUmaVez({ tipo: "erro", mensagem: "A manchete pode ter até 110 caracteres.", campo: "titulo" });
    fila.alterar(dados("x"));
    await vi.advanceTimersByTimeAsync(INTERVALO);

    expect(fila.estado()).toMatchObject({ situacao: "erro", erro: { mensagem: "A manchete pode ter até 110 caracteres.", campo: "titulo" } });
    expect(fila.temPendencia()).toBe(true);
  });
});

describe("sem internet (E02, RF34)", () => {
  it("guarda no navegador e envia sozinho quando a conexão volta; depois apaga a cópia", async () => {
    const { servidor, armazem, fila } = montar({ id: "noticia-1", revisao: 0 });
    servidor.ficarOffline();

    fila.alterar(dados("Escrito sem internet"));
    await vi.advanceTimersByTimeAsync(INTERVALO);

    expect(fila.estado().situacao).toBe("sem_internet");
    expect(armazem.chaves()).toEqual([`sintravc:rascunho:${ANA}:noticia:noticia-1`]);

    servidor.ficarOnline();
    await fila.conexaoVoltou();

    expect(servidor.recebidos.map((p) => p.dados.titulo)).toEqual(["Escrito sem internet"]);
    expect(fila.estado().situacao).toBe("sincronizado");
    expect(armazem.chaves()).toEqual([]);
  });

  it("notícia nova escrita sem internet fica guardada como “nova” e é criada quando a conexão volta", async () => {
    const { servidor, armazem, fila } = montar();
    servidor.ficarOffline();
    fila.alterar(dados("Nova sem internet"));
    await vi.advanceTimersByTimeAsync(INTERVALO);
    expect(armazem.chaves()).toEqual([`sintravc:rascunho:${ANA}:noticia:nova`]);

    servidor.ficarOnline();
    await fila.conexaoVoltou();

    expect(fila.estado()).toMatchObject({ situacao: "sincronizado", id: "noticia-1" });
    expect(armazem.chaves()).toEqual([]);
  });
});

describe("conflito de versões (E02, N4)", () => {
  it("se o servidor tem uma versão mais nova, a fila para e mostra as duas", async () => {
    const { servidor, fila } = montar({ id: "noticia-1", revisao: 0 });
    servidor.salvarPorFora();
    fila.alterar(dados("Minha"));
    await vi.advanceTimersByTimeAsync(INTERVALO);

    expect(fila.estado()).toMatchObject({
      situacao: "conflito",
      conflito: { minha: { titulo: "Minha" }, servidor: { revisao: 1, salvoPorNome: "Carlos" } },
    });

    // Enquanto não escolhe, o salvamento automático fica parado.
    fila.alterar(dados("Minha, mais um pouco"));
    await vi.advanceTimersByTimeAsync(INTERVALO * 3);
    expect(servidor.recebidos).toHaveLength(1);
    expect(fila.estado().conflito?.minha.titulo).toBe("Minha, mais um pouco");
  });

  it("depois da escolha, a fila segue da revisão que o servidor devolveu", async () => {
    const { servidor, fila } = montar({ id: "noticia-1", revisao: 0 });
    servidor.salvarPorFora();
    fila.alterar(dados("Minha"));
    await vi.advanceTimersByTimeAsync(INTERVALO);

    fila.conflitoResolvido({ tipo: "salvo", id: "noticia-1", revisao: 5, salvoEm: "y" });
    fila.alterar(dados("Continua"));
    await vi.advanceTimersByTimeAsync(INTERVALO);

    expect(servidor.recebidos.at(-1)).toMatchObject({ id: "noticia-1", revisaoBase: 5 });
  });

  it("se o servidor mudou de novo enquanto a pessoa escolhia, o conflito passa a mostrar a versão mais nova", async () => {
    const { servidor, fila } = montar({ id: "noticia-1", revisao: 0 });
    servidor.salvarPorFora();
    fila.alterar(dados("Minha"));
    await vi.advanceTimersByTimeAsync(INTERVALO);

    fila.conflitoAtualizado({ revisao: 7, dados: dados("Mais nova"), salvoPorNome: "Bia", salvoEm: "w" });

    expect(fila.estado()).toMatchObject({
      situacao: "conflito",
      conflito: { minha: { titulo: "Minha" }, servidor: { revisao: 7, salvoPorNome: "Bia" } },
    });
  });

  it("ao abrir, uma cópia guardada sobre uma revisão antiga vira conflito; sobre a atual, é retomada", () => {
    const armazem = armazemEmMemoria();
    const servidor = servidorFalso();
    const comum = { pessoaId: ANA, id: "noticia-1", intervaloMs: INTERVALO, enviar: servidor.enviar, online: servidor.online, armazem };
    criarFilaDoRascunho({ ...comum, revisao: 3 }).alterar(dados("Guardada na revisão 3"));

    const naMesma = criarFilaDoRascunho({ ...comum, revisao: 3 }).retomar();
    expect(naMesma).toMatchObject({ tipo: "retomada", dados: { titulo: "Guardada na revisão 3" } });

    const depoisDeOutraPessoaSalvar = criarFilaDoRascunho({ ...comum, revisao: 4 }).retomar();
    expect(depoisDeOutraPessoaSalvar).toMatchObject({ tipo: "conflito", minha: { titulo: "Guardada na revisão 3" } });
  });
});

describe("computador compartilhado (ajuste 1 da aprovação)", () => {
  it("outra pessoa no mesmo navegador nunca vê nem envia o rascunho guardado", async () => {
    const armazem = armazemEmMemoria();
    const servidor = servidorFalso();
    servidor.ficarOffline();
    const comum = { id: "noticia-1", revisao: 0, intervaloMs: INTERVALO, enviar: servidor.enviar, online: servidor.online, armazem };
    criarFilaDoRascunho({ ...comum, pessoaId: ANA }).alterar(dados("Rascunho da Ana"));

    servidor.ficarOnline();
    const doBruno = criarFilaDoRascunho({ ...comum, pessoaId: BRUNO });
    expect(doBruno.retomar()).toEqual({ tipo: "nada" });
    await doBruno.conexaoVoltou();

    expect(servidor.recebidos).toHaveLength(0);
    expect(criarFilaDoRascunho({ ...comum, pessoaId: ANA }).retomar()).toMatchObject({ tipo: "retomada" });
  });

  it("ao sair do painel, apaga as cópias já sincronizadas da pessoa e mantém as pendentes e as de outras pessoas", () => {
    const armazem = armazemEmMemoria();
    const chave = (pessoa: string, id: string) => `sintravc:rascunho:${pessoa}:noticia:${id}`;
    const registro = (pendente: boolean) => JSON.stringify({ dados: dados("x"), revisaoBase: 1, guardadoEm: "z", pendente });
    armazem.gravar(chave(ANA, "a"), registro(false));
    armazem.gravar(chave(ANA, "b"), registro(true));
    armazem.gravar(chave(BRUNO, "c"), registro(false));
    armazem.gravar("outra-coisa", "1");

    limparAoSair(armazem, ANA);

    expect(armazem.chaves().sort()).toEqual([chave(ANA, "b"), chave(BRUNO, "c"), "outra-coisa"].sort());
  });

  it("“Descartar” apaga a cópia guardada", () => {
    const { armazem, fila } = montar({ id: "noticia-1" });
    fila.alterar(dados("x"));
    fila.descartar();
    expect(armazem.chaves()).toEqual([]);
    expect(fila.temPendencia()).toBe(false);
  });
});

describe("rascunho do documento oficial no navegador (E02, E46)", () => {
  it("fica numa chave própria, que não se mistura com a notícia nem entre edital e acordo novos", () => {
    const armazem = armazemEmMemoria();
    const servidor = servidorFalso();
    servidor.ficarOffline();
    const comum = { pessoaId: ANA, revisao: 0, intervaloMs: INTERVALO, enviar: servidor.enviar, online: servidor.online, armazem };

    criarFilaDoRascunho({ ...comum, id: null, tipo: "documento", nova: "edital-nova" }).alterar(dados("Edital"));
    criarFilaDoRascunho({ ...comum, id: null, tipo: "documento", nova: "acordo-nova" }).alterar(dados("Acordo"));
    criarFilaDoRascunho({ ...comum, id: null }).alterar(dados("Notícia"));

    expect(armazem.chaves().sort()).toEqual([
      `sintravc:rascunho:${ANA}:documento:acordo-nova`,
      `sintravc:rascunho:${ANA}:documento:edital-nova`,
      `sintravc:rascunho:${ANA}:noticia:nova`,
    ]);
  });
});
