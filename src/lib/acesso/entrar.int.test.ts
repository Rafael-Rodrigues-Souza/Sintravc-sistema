import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { banco } from "@/lib/db";
import type { Enviar, Mensagem } from "@/lib/email";
import { atividade, pessoaEquipe, sessao } from "@/lib/db/schema";

import * as codigosRecuperacao from "./codigos-recuperacao";
import { confirmarCodigo, entrar } from "./entrar";
import { codigoTotp, cookiesDe, criarPessoaDeTeste, type PessoaDeTeste } from "./pessoas-de-teste";

// Deixa um teste simular a falha da contagem de códigos; nos outros, a função é a original.
vi.mock("./codigos-recuperacao", async (original) => {
  const modulo = await original<typeof import("./codigos-recuperacao")>();
  return { ...modulo, quantosCodigosRestam: vi.fn(modulo.quantosCodigosRestam) };
});

// RN05 / CA-US19.2: 5 tentativas erradas bloqueiam por 15 minutos (valores iniciais do Parametro).
const MINUTO = 60_000;
let contador = 0;

async function novaPessoa(perfil: "ADM" | "COM" = "COM"): Promise<PessoaDeTeste> {
  contador += 1;
  return criarPessoaDeTeste({
    nome: `Pessoa ${contador}`,
    email: `pessoa${contador}-${Date.now()}@sintravc.local`,
    perfil,
    senha: "senha-certa-123",
  });
}

async function errarSenha(p: PessoaDeTeste, vezes: number, agora = new Date(), enviar?: Enviar) {
  let ultimo;
  for (let i = 0; i < vezes; i++) ultimo = await entrar({ email: p.email, senha: "senha-errada-1" }, { agora, enviar });
  return ultimo;
}

/** Guarda os e-mails em vez de enviar. */
function caixaDeSaida() {
  const enviados: Mensagem[] = [];
  const enviar: Enviar = async (mensagem) => {
    enviados.push(mensagem);
    return { idMensagem: String(enviados.length) };
  };
  return { enviados, enviar };
}

/** Senha e código certos. Devolve o resultado final. */
async function entrarDeVerdade(p: PessoaDeTeste, agora = new Date()) {
  const primeira = await entrar({ email: p.email, senha: p.senha }, { agora });
  if (primeira.tipo !== "precisa_codigo") return primeira;
  return confirmarCodigo(
    { codigo: await codigoTotp(p.segredoTotp) },
    { cabecalhos: new Headers({ cookie: cookiesDe(primeira.cabecalhos) }), agora },
  );
}

async function lerPessoa(id: string) {
  const [linha] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.id, id));
  return linha!;
}

async function acoesNaAtividade(id: string) {
  const linhas = await banco()
    .select({ acao: atividade.acao })
    .from(atividade)
    .where(and(eq(atividade.alvoId, id), eq(atividade.area, "acesso")));
  return linhas.map((l) => l.acao);
}

describe("entrar + confirmarCodigo (CA-US19.1)", () => {
  it("com senha e código certos, entra, cria a sessão e registra na Atividade", async () => {
    const p = await novaPessoa();

    const primeira = await entrar({ email: p.email, senha: p.senha });
    expect(primeira.tipo).toBe("precisa_codigo");

    const final = await entrarDeVerdade(p);
    expect(final.tipo).toBe("entrou");
    expect(await banco().select().from(sessao).where(eq(sessao.pessoaId, p.id))).toHaveLength(1);
    expect((await lerPessoa(p.id)).ultimoAcesso).toBeInstanceOf(Date);
    expect(await acoesNaAtividade(p.id)).toEqual(["acesso.entrar"]);
  });

  it("só a senha certa não basta: sem o código, não há sessão", async () => {
    const p = await novaPessoa();
    await entrar({ email: p.email, senha: p.senha });
    expect(await banco().select().from(sessao).where(eq(sessao.pessoaId, p.id))).toHaveLength(0);
  });

  it("e-mail sem as maiúsculas originais também entra", async () => {
    const p = await novaPessoa();
    const r = await entrar({ email: p.email.toUpperCase(), senha: p.senha });
    expect(r.tipo).toBe("precisa_codigo");
  });

  it("e-mail que não existe dá a mesma resposta de senha errada", async () => {
    expect(await entrar({ email: "ninguem@sintravc.local", senha: "qualquer-1" })).toEqual({ tipo: "invalido" });
  });

  it("confirmar código sem ter passado pela senha não entra", async () => {
    const r = await confirmarCodigo({ codigo: "123456" }, { cabecalhos: new Headers() });
    expect(r.tipo).toBe("desafio_vencido");
  });
});

describe("bloqueio por tentativas (RN05, CA-US19.2)", () => {
  it("4 senhas erradas ainda deixam entrar", async () => {
    const p = await novaPessoa();
    expect(await errarSenha(p, 4)).toEqual({ tipo: "invalido" });
    expect((await entrarDeVerdade(p)).tipo).toBe("entrou");
  });

  it("a 5ª senha errada bloqueia por 15 minutos e registra o bloqueio", async () => {
    const p = await novaPessoa();
    const agora = new Date();

    const r = await errarSenha(p, 5, agora);

    expect(r).toEqual({ tipo: "bloqueada", ate: new Date(agora.getTime() + 15 * MINUTO) });
    expect((await lerPessoa(p.id)).bloqueadaAte).toEqual(new Date(agora.getTime() + 15 * MINUTO));
    expect(await acoesNaAtividade(p.id)).toEqual(["acesso.bloquear"]);
  });

  it("bloqueada, nem a senha certa entra", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    await errarSenha(p, 5, agora);

    const r = await entrar({ email: p.email, senha: p.senha }, { agora: new Date(agora.getTime() + 14 * MINUTO) });
    expect(r.tipo).toBe("bloqueada");
  });

  it("depois de 15 minutos, desbloqueia (registrado) e a senha certa volta a valer", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    await errarSenha(p, 5, agora);

    const depois = new Date(agora.getTime() + 15 * MINUTO);
    expect((await entrarDeVerdade(p, depois)).tipo).toBe("entrou");
    expect(await acoesNaAtividade(p.id)).toEqual(["acesso.bloquear", "acesso.desbloquear", "acesso.entrar"]);
  });

  it("depois do desbloqueio, a contagem recomeça do zero", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    await errarSenha(p, 5, agora);

    const depois = new Date(agora.getTime() + 16 * MINUTO);
    expect(await errarSenha(p, 4, depois)).toEqual({ tipo: "invalido" });
  });

  it("código errado conta na mesma contagem da senha", async () => {
    const p = await novaPessoa();
    await errarSenha(p, 4);

    const primeira = await entrar({ email: p.email, senha: p.senha });
    expect(primeira.tipo).toBe("precisa_codigo");
    if (primeira.tipo !== "precisa_codigo") return;
    const r = await confirmarCodigo(
      { codigo: "000000" },
      { cabecalhos: new Headers({ cookie: cookiesDe(primeira.cabecalhos) }) },
    );

    expect(r.tipo).toBe("bloqueada");
  });

  it("entrar com sucesso zera a contagem", async () => {
    const p = await novaPessoa();
    await errarSenha(p, 4);
    expect((await entrarDeVerdade(p)).tipo).toBe("entrou");

    expect(await errarSenha(p, 4)).toEqual({ tipo: "invalido" });
    expect((await lerPessoa(p.id)).bloqueadaAte).toBeNull();
  });
});

describe("quem não entra", () => {
  it.each([["pendente"], ["desativada"]] as const)("pessoa %s não entra, nem com a senha certa", async (situacao) => {
    const p = await novaPessoa();
    await banco().update(pessoaEquipe).set({ situacao }).where(eq(pessoaEquipe.id, p.id));

    expect(await entrar({ email: p.email, senha: p.senha })).toEqual({ tipo: "invalido" });
  });

  it("pessoa sem as duas etapas ativas não entra (RNF02)", async () => {
    const p = await novaPessoa();
    await banco().update(pessoaEquipe).set({ duasEtapasAtivas: false }).where(eq(pessoaEquipe.id, p.id));

    expect(await entrar({ email: p.email, senha: p.senha })).toEqual({ tipo: "invalido" });
    expect(await banco().select().from(sessao).where(eq(sessao.pessoaId, p.id))).toHaveLength(0);
  });
});

/** Senha certa e, no lugar do código do aplicativo, um código de recuperação (US42). */
async function entrarComRecuperacao(p: PessoaDeTeste, codigo: string, agora = new Date()) {
  const primeira = await entrar({ email: p.email, senha: p.senha }, { agora });
  if (primeira.tipo !== "precisa_codigo") return primeira;
  return confirmarCodigo(
    { codigo, tipo: "recuperacao" },
    { cabecalhos: new Headers({ cookie: cookiesDe(primeira.cabecalhos) }), agora },
  );
}

describe("código de recuperação (US42, RN49)", () => {
  it("um código válido entra, cria a sessão e fica registrado na Atividade (CA-US42.1)", async () => {
    const p = await novaPessoa();

    const r = await entrarComRecuperacao(p, p.codigosRecuperacao[0]!);

    expect(r.tipo).toBe("entrou");
    expect(await banco().select().from(sessao).where(eq(sessao.pessoaId, p.id))).toHaveLength(1);
    const [registro] = await banco()
      .select({ acao: atividade.acao, detalhe: atividade.detalhe })
      .from(atividade)
      .where(and(eq(atividade.alvoId, p.id), eq(atividade.area, "acesso")));
    expect(registro?.acao).toBe("acesso.entrar");
    expect(registro?.detalhe).toMatchObject({ metodo: "codigo_recuperacao", codigosRestantes: 7 });
  });

  it("um código já usado não vale mais e não entra (CA-US42.2)", async () => {
    const p = await novaPessoa();
    const codigo = p.codigosRecuperacao[0]!;
    await entrarComRecuperacao(p, codigo);

    expect(await entrarComRecuperacao(p, codigo)).toEqual({ tipo: "invalido" });
  });

  it("se a contagem dos códigos restantes falhar, entra mesmo assim e registra sem o número", async () => {
    const p = await novaPessoa();
    vi.mocked(codigosRecuperacao.quantosCodigosRestam).mockRejectedValueOnce(new Error("decifragem falhou"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await entrarComRecuperacao(p, p.codigosRecuperacao[0]!);

    expect(r.tipo).toBe("entrou");
    const [registro] = await banco()
      .select({ detalhe: atividade.detalhe })
      .from(atividade)
      .where(and(eq(atividade.alvoId, p.id), eq(atividade.acao, "acesso.entrar")));
    expect(registro?.detalhe).toMatchObject({ metodo: "codigo_recuperacao", codigosRestantes: null });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("códigos de recuperação errados contam com as senhas erradas e bloqueiam na 5ª (RN05)", async () => {
    const p = await novaPessoa();
    await errarSenha(p, 3);
    expect(await entrarComRecuperacao(p, "AAAAA-BBBBB")).toEqual({ tipo: "invalido" });

    const r = await entrarComRecuperacao(p, "AAAAA-CCCCC");

    expect(r.tipo).toBe("bloqueada");
    expect(await acoesNaAtividade(p.id)).toEqual(["acesso.bloquear"]);
  });
});

describe("e-mail de conta bloqueada (CA-US19.4, RN59, M04)", () => {
  it("4 tentativas erradas não mandam e-mail", async () => {
    const p = await novaPessoa();
    const { enviados, enviar } = caixaDeSaida();

    await errarSenha(p, 4, new Date(), enviar);

    expect(enviados).toEqual([]);
  });

  it("no bloqueio, avisa a pessoa e cada administrador geral ativo", async () => {
    const adm = await novaPessoa("ADM");
    const admDesativado = await novaPessoa("ADM");
    await banco().update(pessoaEquipe).set({ situacao: "desativada" }).where(eq(pessoaEquipe.id, admDesativado.id));
    const p = await novaPessoa();
    const { enviados, enviar } = caixaDeSaida();

    await errarSenha(p, 5, new Date(), enviar);

    const paraPessoa = enviados.filter((m) => m.para === p.email);
    expect(paraPessoa).toHaveLength(1);
    expect(paraPessoa[0]!.assunto).toBe("Seu acesso ao painel foi bloqueado por 15 minutos");
    const paraAdm = enviados.filter((m) => m.para === adm.email);
    expect(paraAdm).toHaveLength(1);
    expect(paraAdm[0]!.assunto).toBe(`A conta de ${p.nome} foi bloqueada por tentativas`);
    expect(enviados.some((m) => m.para === admDesativado.email)).toBe(false);
  });

  it("se quem foi bloqueado é administrador geral, recebe só o aviso da própria conta", async () => {
    const adm = await novaPessoa("ADM");
    const { enviados, enviar } = caixaDeSaida();

    await errarSenha(adm, 5, new Date(), enviar);

    expect(enviados.filter((m) => m.para === adm.email).map((m) => m.assunto)).toEqual([
      "Seu acesso ao painel foi bloqueado por 15 minutos",
    ]);
  });

  it("se o e-mail falhar, a conta continua bloqueada", async () => {
    const p = await novaPessoa();
    const enviar: Enviar = async () => {
      throw new Error("SMTP fora do ar");
    };

    const r = await errarSenha(p, 5, new Date(), enviar);

    expect(r?.tipo).toBe("bloqueada");
    expect((await lerPessoa(p.id)).bloqueadaAte).not.toBeNull();
  });
});

