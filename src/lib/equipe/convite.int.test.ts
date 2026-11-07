import { createHash } from "node:crypto";

import { count, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { banco } from "@/lib/db";
import { atividade, convite, pessoaEquipe } from "@/lib/db/schema";
import type { Mensagem } from "@/lib/email";

import { criarConviteAdmin, ErroCriarAdmin } from "./convite";

const URL_SITE = "http://localhost:3000";
const HORA = 60 * 60 * 1000;

function enviarFalso() {
  return vi.fn<(mensagem: Mensagem) => Promise<{ idMensagem: string }>>(async () => ({ idMensagem: "teste" }));
}

async function contarLinhas() {
  const [[p], [c], [a]] = await Promise.all([
    banco().select({ n: count() }).from(pessoaEquipe),
    banco().select({ n: count() }).from(convite),
    banco().select({ n: count() }).from(atividade),
  ]);
  return { pessoas: p?.n, convites: c?.n, atividades: a?.n };
}

function tokenDoLink(link: string) {
  const prefixo = `${URL_SITE}/painel/convite/`;
  expect(link.startsWith(prefixo)).toBe(true);
  return link.slice(prefixo.length);
}

describe("criarConviteAdmin", () => {
  it("cria o Administrador geral pendente, o convite de 48 h, a Atividade e envia o e-mail com o link", async () => {
    const enviar = enviarFalso();
    const antes = Date.now();

    const resultado = await criarConviteAdmin(
      { email: "ana@sintravc.local", nome: "Ana Souza", enviarEmail: true },
      { urlSite: URL_SITE, enviar },
    );

    const [pessoa] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.email, "ana@sintravc.local"));
    expect(pessoa).toMatchObject({ nome: "Ana Souza", perfil: "ADM", situacao: "pendente" });

    const token = tokenDoLink(resultado.link);
    const [registro] = await banco().select().from(convite).where(eq(convite.pessoaId, pessoa!.id));
    expect(registro?.tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(registro?.tokenHash).not.toContain(token);
    expect(registro?.usadoEm).toBeNull();
    expect(registro?.criadoPor).toBeNull();
    expect(registro!.expiraEm.getTime()).toBeGreaterThanOrEqual(antes + 48 * HORA - 1000);
    expect(registro!.expiraEm.getTime()).toBeLessThanOrEqual(Date.now() + 48 * HORA + 1000);

    const [log] = await banco().select().from(atividade).where(eq(atividade.alvoId, pessoa!.id));
    expect(log).toMatchObject({
      atorTipo: "sistema",
      atorId: null,
      acao: "convite.enviar",
      area: "equipe",
      alvoTipo: "pessoa_equipe",
      alvoRotulo: "Ana Souza",
      detalhe: expect.objectContaining({ origem: "criar-admin", perfil: "ADM", emailEnviado: true }),
    });

    expect(enviar).toHaveBeenCalledOnce();
    const mensagem = enviar.mock.calls[0]![0];
    expect(mensagem.para).toBe("ana@sintravc.local");
    expect(mensagem.texto).toContain(resultado.link);
    expect(mensagem.texto).toContain("48 horas");
    expect(resultado.emailEnviado).toBe(true);
  });

  it("--sem-email: cria a pessoa, o convite e a Atividade, devolve o link e não envia nada", async () => {
    const enviar = enviarFalso();

    const resultado = await criarConviteAdmin(
      { email: "bruno@sintravc.local", nome: "Bruno Lima", enviarEmail: false },
      { urlSite: URL_SITE, enviar },
    );

    expect(enviar).not.toHaveBeenCalled();
    expect(resultado.emailEnviado).toBe(false);

    const [pessoa] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.email, "bruno@sintravc.local"));
    expect(pessoa).toMatchObject({ perfil: "ADM", situacao: "pendente" });

    const token = tokenDoLink(resultado.link);
    const [registro] = await banco().select().from(convite).where(eq(convite.pessoaId, pessoa!.id));
    expect(registro?.tokenHash).toBe(createHash("sha256").update(token).digest("hex"));

    const [log] = await banco().select().from(atividade).where(eq(atividade.alvoId, pessoa!.id));
    expect(log?.acao).toBe("convite.enviar");
    expect(log?.detalhe).toMatchObject({ emailEnviado: false });
  });

  it.each([["nao-e-email"], ["ana@"], [""], ["  "]])("recusa o e-mail inválido %j e não cria nada", async (email) => {
    const antes = await contarLinhas();
    const enviar = enviarFalso();

    await expect(
      criarConviteAdmin({ email, nome: "Fulano", enviarEmail: true }, { urlSite: URL_SITE, enviar }),
    ).rejects.toThrow(ErroCriarAdmin);

    expect(await contarLinhas()).toEqual(antes);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("recusa nome vazio e não cria nada", async () => {
    const antes = await contarLinhas();
    await expect(
      criarConviteAdmin({ email: "sem-nome@sintravc.local", nome: "  ", enviarEmail: false }, { urlSite: URL_SITE }),
    ).rejects.toThrow(/nome/i);
    expect(await contarLinhas()).toEqual(antes);
  });

  it("recusa e-mail já cadastrado, mesmo com outras maiúsculas, e não cria nada", async () => {
    await criarConviteAdmin(
      { email: "carla@sintravc.local", nome: "Carla", enviarEmail: false },
      { urlSite: URL_SITE },
    );
    const antes = await contarLinhas();
    const enviar = enviarFalso();

    await expect(
      criarConviteAdmin({ email: "Carla@SINTRAVC.local", nome: "Carla de novo", enviarEmail: true }, { urlSite: URL_SITE, enviar }),
    ).rejects.toThrow(/já/);

    expect(await contarLinhas()).toEqual(antes);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("se o e-mail não sair, desfaz tudo: nem pessoa, nem convite, nem Atividade", async () => {
    const antes = await contarLinhas();
    const enviar = vi.fn(async () => {
      throw new Error("SMTP fora do ar");
    });

    await expect(
      criarConviteAdmin({ email: "davi@sintravc.local", nome: "Davi", enviarEmail: true }, { urlSite: URL_SITE, enviar }),
    ).rejects.toThrow(/SMTP fora do ar/);

    expect(await contarLinhas()).toEqual(antes);
  });
});
