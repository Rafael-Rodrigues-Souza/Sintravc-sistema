import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, convite, pessoaEquipe } from "@/lib/db/schema";

import { auth } from "@/lib/acesso/auth";
import { cookiesDe } from "@/lib/acesso/cookies";
import { confirmarCodigo, entrar } from "@/lib/acesso/entrar";
import { codigoTotp } from "@/lib/acesso/totp";

import { abrirConvite, concluirConvite, confirmarDuasEtapas, criarSenhaDoConvite, etapaDoConvite } from "./aceite";
import { criarConviteAdmin, hashDoToken, reenviarConvite } from "./convite";

const URL_SITE = "http://localhost:3000";
let contador = 0;

/** Um convite novo, pelo mesmo caminho do pnpm criar-admin --sem-email. */
async function novoConvite(nome = "Pessoa Convidada") {
  contador += 1;
  const email = `aceite${contador}-${Date.now()}@sintravc.local`;
  const { link, pessoaId } = await criarConviteAdmin({ email, nome, enviarEmail: false }, { urlSite: URL_SITE });
  return { token: link.split("/").at(-1)!, pessoaId, email, nome };
}

describe("abrirConvite (CA-US40.1, CA-US40.4)", () => {
  it("o convite novo vale e diz de quem é", async () => {
    const c = await novoConvite("Paula Reis");
    expect(await abrirConvite(c.token)).toMatchObject({
      tipo: "valido",
      pessoa: { id: c.pessoaId, nome: "Paula Reis", email: c.email, perfil: "ADM" },
    });
  });

  it("o convite que passou de 48 h não vale", async () => {
    const c = await novoConvite();
    await banco()
      .update(convite)
      .set({ expiraEm: new Date(Date.now() - 1000) })
      .where(eq(convite.tokenHash, hashDoToken(c.token)));
    expect(await abrirConvite(c.token)).toEqual({ tipo: "invalido" });
  });

  it("o convite já usado não vale", async () => {
    const c = await novoConvite();
    await banco().update(convite).set({ usadoEm: new Date() }).where(eq(convite.tokenHash, hashDoToken(c.token)));
    expect(await abrirConvite(c.token)).toEqual({ tipo: "invalido" });
  });

  it.each([["inexistente"], [""], ["a".repeat(500)]])("token desconhecido %# não vale", async (token) => {
    expect(await abrirConvite(token)).toEqual({ tipo: "invalido" });
  });
});

describe("reenviarConvite (RN46)", () => {
  it("o link novo vale, o anterior deixa de valer e o reenvio vai para a Atividade", async () => {
    const c = await novoConvite("Rui Prado");
    const mensagens: string[] = [];

    await reenviarConvite(c.pessoaId, {
      quem: { id: c.pessoaId, nome: "Quem reenviou" },
      urlSite: URL_SITE,
      enviar: async (m) => {
        mensagens.push(m.texto);
        return { idMensagem: "teste" };
      },
    });

    expect(await abrirConvite(c.token)).toEqual({ tipo: "invalido" });
    const novoToken = mensagens[0]!.match(/\/painel\/convite\/([\w-]+)/)![1]!;
    expect(await abrirConvite(novoToken)).toMatchObject({ tipo: "valido", pessoa: { id: c.pessoaId } });

    const acoes = await banco().select({ acao: atividade.acao }).from(atividade).where(eq(atividade.alvoId, c.pessoaId));
    expect(acoes.map((a) => a.acao)).toEqual(["convite.enviar", "convite.reenviar"]);
  });

  it("não reenvia para quem não está pendente", async () => {
    const c = await novoConvite();
    await banco().update(pessoaEquipe).set({ situacao: "ativa" }).where(eq(pessoaEquipe.id, c.pessoaId));
    await expect(
      reenviarConvite(c.pessoaId, { quem: { id: c.pessoaId, nome: "X" }, urlSite: URL_SITE, enviar: async () => ({ idMensagem: "" }) }),
    ).rejects.toMatchObject({ name: "ErroConvite" });
  });
});

const SENHA = "rodoviario2026";

async function criarSenha(c: { token: string }, senha = SENHA) {
  const r = await criarSenhaDoConvite({ token: c.token, senha, confirmacao: senha });
  if (r.tipo !== "ok") throw new Error(`criarSenhaDoConvite: ${JSON.stringify(r)}`);
  return new Headers({ cookie: cookiesDe(r.cabecalhos) });
}

describe("criarSenhaDoConvite e etapaDoConvite (CA-US40.1, CA-US40.2)", () => {
  it("com a senha certa, segue para as duas etapas com o QR code de quem foi convidado", async () => {
    const c = await novoConvite("Paulo Lima");
    const cabecalhos = await criarSenha(c);

    const etapa = await etapaDoConvite(c.token, cabecalhos);
    expect(etapa).toMatchObject({ tipo: "duas_etapas", pessoa: { id: c.pessoaId } });
    if (etapa.tipo !== "duas_etapas") return;
    const uri = new URL(etapa.uri);
    expect(uri.protocol).toBe("otpauth:");
    expect(decodeURIComponent(uri.pathname)).toContain(c.email);
    expect(uri.searchParams.get("issuer")).toBe("SINTRAVC");
    expect(uri.searchParams.get("secret")).toBe(etapa.chave);
  });

  it("sem o cookie desta pessoa, o link mostra Criar senha", async () => {
    const c = await novoConvite();
    await criarSenha(c);
    expect(await etapaDoConvite(c.token, new Headers())).toMatchObject({ tipo: "criar_senha" });
  });

  it("depois de criar a senha, ainda não entra pelo login: falta ativar as duas etapas", async () => {
    const c = await novoConvite();
    await criarSenha(c);
    expect(await entrar({ email: c.email, senha: SENHA })).toEqual({ tipo: "invalido" });
  });

  it("recusa a senha que não atende à RN47 e diz o que falta", async () => {
    const c = await novoConvite("Paulo Lima");
    expect(await criarSenhaDoConvite({ token: c.token, senha: "curta1", confirmacao: "curta1" })).toEqual({
      tipo: "senha_fraca",
      faltando: ["minimo"],
    });
    expect(await criarSenhaDoConvite({ token: c.token, senha: "PauloLima", confirmacao: "PauloLima" })).toEqual({
      tipo: "senha_fraca",
      faltando: ["minimo", "letras_e_numeros", "diferente_do_nome"],
    });
  });

  it("recusa quando a confirmação é diferente", async () => {
    const c = await novoConvite();
    expect(await criarSenhaDoConvite({ token: c.token, senha: SENHA, confirmacao: "outra-senha-1" })).toEqual({
      tipo: "confirmacao_diferente",
    });
  });

  it("com o link vencido, não cria nada", async () => {
    expect(await criarSenhaDoConvite({ token: "inexistente", senha: SENHA, confirmacao: SENHA })).toEqual({
      tipo: "invalido",
    });
    expect(await etapaDoConvite("inexistente", new Headers())).toEqual({ tipo: "invalido" });
  });

  it("abrir o link de novo e criar outra senha recomeça: a sessão e o segredo antigos deixam de valer", async () => {
    const c = await novoConvite();
    const primeira = await criarSenha(c, "primeira-senha-1");
    const etapaAntiga = await etapaDoConvite(c.token, primeira);

    const segunda = await criarSenha(c, "segunda-senha-2");

    expect(await etapaDoConvite(c.token, primeira)).toMatchObject({ tipo: "criar_senha" });
    const etapaNova = await etapaDoConvite(c.token, segunda);
    expect(etapaNova.tipo).toBe("duas_etapas");
    if (etapaNova.tipo !== "duas_etapas" || etapaAntiga.tipo !== "duas_etapas") return;
    expect(etapaNova.chave).not.toBe(etapaAntiga.chave);
  });
});

/** Convite → senha. Devolve os cabeçalhos da sessão provisória e o segredo mostrado na tela. */
async function ateAsDuasEtapas(nome = "Pessoa Convidada") {
  const c = await novoConvite(nome);
  const cabecalhos = await criarSenha(c);
  const etapa = await etapaDoConvite(c.token, cabecalhos);
  if (etapa.tipo !== "duas_etapas") throw new Error("Não chegou às duas etapas.");
  return { ...c, cabecalhos, chave: etapa.chave };
}

async function lerPessoa(id: string) {
  const [linha] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.id, id));
  return linha!;
}

describe("confirmarDuasEtapas (CA-US40.2, RN49)", () => {
  it("com o código errado, não ativa as duas etapas", async () => {
    const c = await ateAsDuasEtapas();
    expect(await confirmarDuasEtapas({ token: c.token, codigo: "000000" }, { cabecalhos: c.cabecalhos })).toEqual({
      tipo: "codigo_errado",
    });
    expect((await lerPessoa(c.pessoaId)).duasEtapasAtivas).toBe(false);
  });

  it("com o código do aplicativo, ativa as duas etapas e devolve os 8 códigos de recuperação", async () => {
    const c = await ateAsDuasEtapas();
    const r = await confirmarDuasEtapas(
      { token: c.token, codigo: await codigoTotp(c.chave) },
      { cabecalhos: c.cabecalhos },
    );
    expect(r.tipo).toBe("ok");
    if (r.tipo !== "ok") return;
    expect(r.codigos).toHaveLength(8);
    expect((await lerPessoa(c.pessoaId)).duasEtapasAtivas).toBe(true);
    // Ainda pendente: só entra depois de confirmar que guardou os códigos.
    expect((await lerPessoa(c.pessoaId)).situacao).toBe("pendente");
  });

  it("sem a sessão provisória desta pessoa, não confere nada", async () => {
    const c = await ateAsDuasEtapas();
    expect(
      await confirmarDuasEtapas({ token: c.token, codigo: await codigoTotp(c.chave) }, { cabecalhos: new Headers() }),
    ).toEqual({ tipo: "sem_sessao" });
  });
});

describe("concluirConvite (CA-US40.3, CA-US29.1)", () => {
  async function ateOsCodigos(nome?: string) {
    const c = await ateAsDuasEtapas(nome);
    const r = await confirmarDuasEtapas({ token: c.token, codigo: await codigoTotp(c.chave) }, { cabecalhos: c.cabecalhos });
    if (r.tipo !== "ok") throw new Error("Não confirmou as duas etapas.");
    return { ...c, codigos: r.codigos };
  }

  it("deixa a pessoa ativa, gasta o convite e registra o aceite na Atividade", async () => {
    const c = await ateOsCodigos("Paulo Lima");

    expect(await concluirConvite({ token: c.token }, { cabecalhos: c.cabecalhos })).toEqual({
      tipo: "ok",
      pessoaId: c.pessoaId,
    });

    expect(await lerPessoa(c.pessoaId)).toMatchObject({ situacao: "ativa", emailVerificado: true, duasEtapasAtivas: true });
    expect(await abrirConvite(c.token)).toEqual({ tipo: "invalido" });
    const [log] = await banco()
      .select()
      .from(atividade)
      .where(and(eq(atividade.alvoId, c.pessoaId), eq(atividade.acao, "convite.aceitar")));
    expect(log).toMatchObject({ atorTipo: "pessoa", atorId: c.pessoaId, area: "equipe", alvoRotulo: "Paulo Lima" });
  });

  it("o mesmo link não serve duas vezes", async () => {
    const c = await ateOsCodigos();
    await concluirConvite({ token: c.token }, { cabecalhos: c.cabecalhos });
    expect(await concluirConvite({ token: c.token }, { cabecalhos: c.cabecalhos })).toEqual({ tipo: "invalido" });
  });

  it("não conclui sem as duas etapas ativas (CA-US40.2)", async () => {
    const c = await ateAsDuasEtapas();
    expect(await concluirConvite({ token: c.token }, { cabecalhos: c.cabecalhos })).toEqual({ tipo: "sem_duas_etapas" });
    expect((await lerPessoa(c.pessoaId)).situacao).toBe("pendente");
  });

  it("depois do aceite, entra pelo login normal com a senha e o código do app; e com um código de recuperação no lugar do app", async () => {
    const c = await ateOsCodigos();
    await concluirConvite({ token: c.token }, { cabecalhos: c.cabecalhos });

    // Segunda entrada: senha nova + código do aplicativo (segredo gerado no aceite).
    const senha = await entrar({ email: c.email, senha: SENHA });
    expect(senha.tipo).toBe("precisa_codigo");
    if (senha.tipo !== "precisa_codigo") return;
    const comApp = await confirmarCodigo(
      { codigo: await codigoTotp(c.chave) },
      { cabecalhos: new Headers({ cookie: cookiesDe(senha.cabecalhos) }) },
    );
    expect(comApp).toMatchObject({ tipo: "entrou", pessoaId: c.pessoaId });

    // Terceira entrada: senha + um dos 8 códigos de recuperação, conferido pelo plugin.
    const usado = c.codigos[3]!;
    const outra = await entrar({ email: c.email, senha: SENHA });
    if (outra.tipo !== "precisa_codigo") throw new Error(outra.tipo);
    const comCodigo = await auth().api.verifyBackupCode({
      body: { code: usado },
      headers: new Headers({ cookie: cookiesDe(outra.cabecalhos) }),
      returnHeaders: true,
    });
    expect(comCodigo.response.user.id).toBe(c.pessoaId);
    expect(cookiesDe(comCodigo.headers)).toMatch(/session_token=/);

    // O código usado deixa de valer; sobram 7.
    const restantes = (await auth().api.viewBackupCodes({ body: { userId: c.pessoaId } })).backupCodes;
    expect(restantes).toHaveLength(7);
    expect(restantes).not.toContain(usado);
    const maisUma = await entrar({ email: c.email, senha: SENHA });
    if (maisUma.tipo !== "precisa_codigo") throw new Error(maisUma.tipo);
    await expect(
      auth().api.verifyBackupCode({ body: { code: usado }, headers: new Headers({ cookie: cookiesDe(maisUma.cabecalhos) }) }),
    ).rejects.toThrow();
  });
});
