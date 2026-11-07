import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, pessoaEquipe, sessao } from "@/lib/db/schema";

import { confirmarCodigo, entrar } from "./entrar";
import { codigoTotp, cookiesDe, criarPessoaDeTeste, type PessoaDeTeste } from "./pessoas-de-teste";

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

async function errarSenha(p: PessoaDeTeste, vezes: number, agora = new Date()) {
  let ultimo;
  for (let i = 0; i < vezes; i++) ultimo = await entrar({ email: p.email, senha: "senha-errada-1" }, { agora });
  return ultimo;
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
