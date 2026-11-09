import { createHash } from "node:crypto";

import { count, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { banco } from "@/lib/db";
import { atividade, convite, pessoaEquipe } from "@/lib/db/schema";
import type { Enviar } from "@/lib/email";
import { dataHoraNaBahia } from "@/lib/datas";

import { convidarPessoa, criarConviteAdmin, ErroCriarAdmin } from "./convite";

const URL_SITE = "http://localhost:3000";
const HORA = 60 * 60 * 1000;

function enviarFalso() {
  return vi.fn<Enviar>(async () => ({ idMensagem: "teste" }));
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
    // M01: a data e a hora do fim do link, no horário da Bahia (48 h depois).
    expect(mensagem.texto).toContain(`O link vale até ${dataHoraNaBahia(registro!.expiraEm)}`);
    expect(mensagem.texto).toContain("Administrador geral");
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

describe("convidarPessoa (RF51, RN46; CA-US29.2)", () => {
  async function umAdm() {
    const [adm] = await banco()
      .insert(pessoaEquipe)
      .values({ nome: "Mariana Souza", email: `mariana-${Date.now()}@sintravc.local`, perfil: "ADM", situacao: "ativa" })
      .returning({ id: pessoaEquipe.id, nome: pessoaEquipe.nome });
    return adm!;
  }

  it("cria a pessoa de Comunicação pendente, o convite com quem convidou, a Atividade e o e-mail", async () => {
    const adm = await umAdm();
    const enviar = enviarFalso();

    const resultado = await convidarPessoa(
      { nome: "Paulo Lima", email: "paulo@sintravc.local", perfil: "COM" },
      { quem: adm, urlSite: URL_SITE, enviar },
    );

    const [pessoa] = await banco().select().from(pessoaEquipe).where(eq(pessoaEquipe.email, "paulo@sintravc.local"));
    expect(pessoa).toMatchObject({ id: resultado.pessoaId, nome: "Paulo Lima", perfil: "COM", situacao: "pendente" });

    const [registro] = await banco().select().from(convite).where(eq(convite.pessoaId, pessoa!.id));
    expect(registro?.criadoPor).toBe(adm.id);
    expect(registro!.expiraEm.getTime()).toBeGreaterThan(Date.now() + 47 * HORA);

    const [log] = await banco().select().from(atividade).where(eq(atividade.alvoId, pessoa!.id));
    expect(log).toMatchObject({
      atorTipo: "pessoa",
      atorId: adm.id,
      acao: "convite.enviar",
      area: "equipe",
      alvoRotulo: "Paulo Lima",
      detalhe: expect.objectContaining({ perfil: "COM", email: "paulo@sintravc.local" }),
    });

    expect(enviar).toHaveBeenCalledOnce();
    const mensagem = enviar.mock.calls[0]![0];
    expect(mensagem.para).toBe("paulo@sintravc.local");
    expect(mensagem.assunto).toBe("Você foi convidado para o painel do SINTRAVC");
    const link = mensagem.texto.match(/http:\/\/localhost:3000\/painel\/convite\/[\w-]+/)?.[0];
    expect(link).toBeDefined();
    expect(registro?.tokenHash).toBe(createHash("sha256").update(tokenDoLink(link!)).digest("hex"));
    expect(mensagem.texto).toContain("Mariana Souza convidou você");
    expect(mensagem.texto).toContain("Comunicação");
    expect(mensagem.html).toContain(link);
  });

  it("recusa o perfil Atendimento enquanto a Fase 2 não está ativa (CA-US29.3) e não cria nada", async () => {
    const adm = await umAdm();
    const antes = await contarLinhas();

    await expect(
      convidarPessoa({ nome: "Rita", email: "rita@sintravc.local", perfil: "ATD" }, { quem: adm, urlSite: URL_SITE }),
    ).rejects.toMatchObject({ name: "ErroConvite", campo: "perfil" });

    expect(await contarLinhas()).toEqual(antes);
  });

  it.each([
    [{ nome: "", email: "x@sintravc.local", perfil: "COM" }, "nome"],
    [{ nome: "Fulano", email: "nao-e-email", perfil: "COM" }, "email"],
    [{ nome: "Fulano", email: "y@sintravc.local", perfil: "CHEFE" }, "perfil"],
  ])("recusa dados inválidos %j apontando o campo", async (pedido, campo) => {
    const adm = await umAdm();
    await expect(
      convidarPessoa(pedido as never, { quem: adm, urlSite: URL_SITE, enviar: enviarFalso() }),
    ).rejects.toMatchObject({ name: "ErroConvite", campo });
  });

  it("recusa o e-mail de alguém que já está na equipe", async () => {
    const adm = await umAdm();
    await convidarPessoa(
      { nome: "Lia", email: "lia@sintravc.local", perfil: "COM" },
      { quem: adm, urlSite: URL_SITE, enviar: enviarFalso() },
    );
    await expect(
      convidarPessoa(
        { nome: "Lia de novo", email: "LIA@sintravc.local", perfil: "ADM" },
        { quem: adm, urlSite: URL_SITE, enviar: enviarFalso() },
      ),
    ).rejects.toMatchObject({ name: "ErroConvite", campo: "email" });
  });

  it("se o e-mail não sair, desfaz tudo", async () => {
    const adm = await umAdm();
    const antes = await contarLinhas();
    await expect(
      convidarPessoa(
        { nome: "Téo", email: "teo@sintravc.local", perfil: "COM" },
        { quem: adm, urlSite: URL_SITE, enviar: vi.fn(async () => Promise.reject(new Error("SMTP fora do ar"))) },
      ),
    ).rejects.toThrow(/SMTP/);
    expect(await contarLinhas()).toEqual(antes);
  });
});
