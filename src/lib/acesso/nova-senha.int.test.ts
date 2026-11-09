import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, pessoaEquipe, sessao } from "@/lib/db/schema";
import type { Enviar, Mensagem } from "@/lib/email";

import { entrar } from "./entrar";
import { abrirLinkDeSenha, pedirNovaSenha, trocarSenhaPeloLink } from "./nova-senha";
import { criarPessoaDeTeste, type PessoaDeTeste } from "./pessoas-de-teste";

// RN48 / US41: link de 1 h (equipe.link_senha_horas), uso único, resposta igual para todo e-mail.
const URL_SITE = "http://localhost:3000";
const HORA = 60 * 60_000;
let contador = 0;

async function novaPessoa(perfil: "ADM" | "COM" = "COM"): Promise<PessoaDeTeste> {
  contador += 1;
  return criarPessoaDeTeste({
    nome: `Recupera ${contador}`,
    email: `recupera${contador}-${Date.now()}@sintravc.local`,
    perfil,
    senha: "senha-antiga-123",
  });
}

function caixaDeSaida() {
  const enviados: Mensagem[] = [];
  const enviar: Enviar = async (mensagem) => {
    enviados.push(mensagem);
    return { idMensagem: String(enviados.length) };
  };
  return { enviados, enviar };
}

/** O token do link que chegou no e-mail. */
function tokenDoEmail(mensagem: Mensagem | undefined): string {
  const achado = mensagem?.texto.match(/\/painel\/nova-senha\/([\w-]+)/);
  if (!achado?.[1]) throw new Error("O e-mail não tem o link de nova senha.");
  return achado[1];
}

/** Pede o link e devolve o token que chegou por e-mail. */
async function pedirLink(p: PessoaDeTeste, agora = new Date()) {
  const { enviados, enviar } = caixaDeSaida();
  await pedirNovaSenha({ email: p.email }, { urlSite: URL_SITE, enviar, agora });
  return tokenDoEmail(enviados[0]);
}

describe("pedir o link de nova senha (CA-US41.1, CA-US41.2)", () => {
  it("quem tem acesso recebe o e-mail com um link que abre", async () => {
    const p = await novaPessoa();
    const { enviados, enviar } = caixaDeSaida();

    await pedirNovaSenha({ email: ` ${p.email.toUpperCase()} ` }, { urlSite: URL_SITE, enviar });

    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.para).toBe(p.email);
    expect(enviados[0]!.assunto).toBe("Redefinir sua senha do painel");
    const aberto = await abrirLinkDeSenha(tokenDoEmail(enviados[0]));
    expect(aberto).toMatchObject({ tipo: "valido", pessoa: { id: p.id, email: p.email } });
  });

  it("e-mail que não existe: nada é enviado e não dá erro", async () => {
    const { enviados, enviar } = caixaDeSaida();
    await pedirNovaSenha({ email: "ninguem@sintravc.local" }, { urlSite: URL_SITE, enviar });
    expect(enviados).toEqual([]);
  });

  it.each([["pendente"], ["desativada"]] as const)("pessoa %s não recebe o link", async (situacao) => {
    const p = await novaPessoa();
    await banco().update(pessoaEquipe).set({ situacao }).where(eq(pessoaEquipe.id, p.id));
    const { enviados, enviar } = caixaDeSaida();

    await pedirNovaSenha({ email: p.email }, { urlSite: URL_SITE, enviar });

    expect(enviados).toEqual([]);
  });

  it("se o e-mail falhar, não dá erro na tela (a resposta é a mesma)", async () => {
    const p = await novaPessoa();
    const enviar: Enviar = async () => {
      throw new Error("SMTP fora do ar");
    };
    await expect(pedirNovaSenha({ email: p.email }, { urlSite: URL_SITE, enviar })).resolves.toBeUndefined();
  });

  it("pedir de novo antes de 1 minuto não manda outro e-mail, e o link anterior continua valendo", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    const primeiro = await pedirLink(p, agora);
    const { enviados, enviar } = caixaDeSaida();

    await pedirNovaSenha({ email: p.email }, { urlSite: URL_SITE, enviar, agora: new Date(agora.getTime() + 59_000) });

    expect(enviados).toEqual([]);
    expect((await abrirLinkDeSenha(primeiro, new Date(agora.getTime() + 59_000))).tipo).toBe("valido");
  });

  it("depois de 1 minuto, pode pedir outro", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    await pedirLink(p, agora);
    const { enviados, enviar } = caixaDeSaida();

    await pedirNovaSenha({ email: p.email }, { urlSite: URL_SITE, enviar, agora: new Date(agora.getTime() + 60_000) });

    expect(enviados).toHaveLength(1);
  });

  it("o pedido fica na Atividade", async () => {
    const p = await novaPessoa();
    await pedirLink(p);
    const linhas = await banco()
      .select({ acao: atividade.acao })
      .from(atividade)
      .where(and(eq(atividade.alvoId, p.id), eq(atividade.area, "acesso")));
    expect(linhas.map((l) => l.acao)).toEqual(["acesso.pedir_nova_senha"]);
  });
});

describe("link vencido ou substituído (CA-US41.3)", () => {
  it("vale por 1 hora e depois não abre mais", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    const token = await pedirLink(p, agora);

    expect((await abrirLinkDeSenha(token, new Date(agora.getTime() + HORA - 1000))).tipo).toBe("valido");
    expect(await abrirLinkDeSenha(token, new Date(agora.getTime() + HORA))).toEqual({ tipo: "invalido" });
  });

  it("pedir outro link faz o anterior deixar de valer", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    const primeiro = await pedirLink(p, agora);
    const segundo = await pedirLink(p, new Date(agora.getTime() + 60_000));

    const depois = new Date(agora.getTime() + 61_000);
    expect(await abrirLinkDeSenha(primeiro, depois)).toEqual({ tipo: "invalido" });
    expect((await abrirLinkDeSenha(segundo, depois)).tipo).toBe("valido");
  });

  it("token inventado não abre", async () => {
    expect(await abrirLinkDeSenha("token-que-nao-existe")).toEqual({ tipo: "invalido" });
  });
});

const NOVA = "senha-nova-456";

async function trocar(token: string, senha = NOVA, enviar?: Enviar, agora?: Date) {
  return trocarSenhaPeloLink({ token, senha, confirmacao: senha }, { enviar: enviar ?? caixaDeSaida().enviar, agora });
}

async function acoesNaAtividade(id: string) {
  const linhas = await banco()
    .select({ acao: atividade.acao })
    .from(atividade)
    .where(and(eq(atividade.alvoId, id), eq(atividade.area, "acesso")))
    .orderBy(atividade.id);
  return linhas.map((l) => l.acao);
}

async function sessoesDe(id: string) {
  return banco().select().from(sessao).where(eq(sessao.pessoaId, id));
}

describe("trocar a senha pelo link (CA-US41.4, RN47)", () => {
  it("a senha nova passa a valer, a antiga não, e o código das duas etapas continua sendo pedido", async () => {
    const p = await novaPessoa();
    const token = await pedirLink(p);

    expect(await trocar(token)).toEqual({ tipo: "ok" });

    expect((await entrar({ email: p.email, senha: NOVA })).tipo).toBe("precisa_codigo");
    expect(await entrar({ email: p.email, senha: p.senha })).toEqual({ tipo: "invalido" });
  });

  it("encerra todas as sessões abertas", async () => {
    const p = await novaPessoa();
    await banco()
      .insert(sessao)
      .values({ pessoaId: p.id, token: `sessao-${p.id}`, expiraEm: new Date(Date.now() + HORA) });
    const token = await pedirLink(p);

    await trocar(token);

    expect(await sessoesDe(p.id)).toEqual([]);
  });

  it("envia o e-mail de senha alterada", async () => {
    const p = await novaPessoa();
    const token = await pedirLink(p);
    const { enviados, enviar } = caixaDeSaida();

    await trocar(token, NOVA, enviar);

    expect(enviados.map((m) => [m.para, m.assunto])).toEqual([[p.email, "Sua senha do painel foi alterada"]]);
  });

  it("se o e-mail de senha alterada falhar, a senha continua trocada", async () => {
    const p = await novaPessoa();
    const token = await pedirLink(p);
    const enviar: Enviar = async () => {
      throw new Error("SMTP fora do ar");
    };

    expect(await trocar(token, NOVA, enviar)).toEqual({ tipo: "ok" });
    expect((await entrar({ email: p.email, senha: NOVA })).tipo).toBe("precisa_codigo");
  });

  it("o link só vale uma vez", async () => {
    const p = await novaPessoa();
    const token = await pedirLink(p);
    await trocar(token);

    expect(await abrirLinkDeSenha(token)).toEqual({ tipo: "invalido" });
    expect(await trocar(token, "outra-senha-789")).toEqual({ tipo: "invalido" });
  });

  it("link vencido não troca a senha", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    const token = await pedirLink(p, agora);

    expect(await trocar(token, NOVA, undefined, new Date(agora.getTime() + HORA))).toEqual({ tipo: "invalido" });
    expect((await entrar({ email: p.email, senha: p.senha })).tipo).toBe("precisa_codigo");
  });

  it("não aceita a senha atual (RN47)", async () => {
    const p = await novaPessoa();
    expect(await trocar(await pedirLink(p), p.senha)).toEqual({ tipo: "senha_repetida" });
  });

  it("não aceita nenhuma das 3 últimas, contando a atual; a 4ª para trás volta a valer (RN47, E37)", async () => {
    const p = await novaPessoa();
    // Cada troca com um link novo, com 2 minutos entre os pedidos (um link por minuto).
    let minuto = 0;
    const trocarDeNovo = async (senha: string) => {
      const agora = new Date(Date.now() + (minuto += 2) * 60_000);
      return trocar(await pedirLink(p, agora), senha, undefined, agora);
    };
    await trocarDeNovo("segunda-senha-1");
    await trocarDeNovo("terceira-senha-2");

    expect(await trocarDeNovo(p.senha)).toEqual({ tipo: "senha_repetida" });

    await trocarDeNovo("quarta-senha-3");
    expect(await trocarDeNovo(p.senha)).toEqual({ tipo: "ok" });
  });

  it("senha fraca ou confirmação diferente não trocam e o link continua valendo", async () => {
    const p = await novaPessoa();
    const token = await pedirLink(p);

    expect(await trocarSenhaPeloLink({ token, senha: "curta1", confirmacao: "curta1" })).toEqual({
      tipo: "senha_fraca",
      faltando: ["minimo"],
    });
    expect(await trocarSenhaPeloLink({ token, senha: NOVA, confirmacao: "outra-coisa-1" })).toEqual({
      tipo: "confirmacao_diferente",
    });
    expect((await abrirLinkDeSenha(token)).tipo).toBe("valido");
  });

  it("fica na Atividade", async () => {
    const p = await novaPessoa();
    await trocar(await pedirLink(p));
    expect(await acoesNaAtividade(p.id)).toEqual(["acesso.pedir_nova_senha", "acesso.trocar_senha"]);
  });
});

describe("conta bloqueada e nova senha (E38)", () => {
  it("trocar a senha pelo link libera a conta e registra o desbloqueio", async () => {
    const p = await novaPessoa();
    const agora = new Date();
    for (let i = 0; i < 5; i++) await entrar({ email: p.email, senha: "errada-123456" }, { agora, enviar: caixaDeSaida().enviar });
    const token = await pedirLink(p, agora);

    await trocar(token, NOVA, undefined, agora);

    expect((await entrar({ email: p.email, senha: NOVA }, { agora })).tipo).toBe("precisa_codigo");
    expect(await acoesNaAtividade(p.id)).toEqual([
      "acesso.bloquear",
      "acesso.pedir_nova_senha",
      "acesso.desbloquear",
      "acesso.trocar_senha",
    ]);
  });
});

