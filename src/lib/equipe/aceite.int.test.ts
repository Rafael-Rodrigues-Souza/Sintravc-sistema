import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { atividade, convite, pessoaEquipe } from "@/lib/db/schema";

import { abrirConvite } from "./aceite";
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
