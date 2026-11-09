import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { confirmarCodigo, entrar } from "@/lib/acesso/entrar";
import { codigoTotp, cookiesDe, criarPessoaDeTeste } from "@/lib/acesso/pessoas-de-teste";
import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import type { Perfil } from "@/lib/permissoes";
import { armazenamentoEmMemoria } from "@/testes/armazenamento-memoria";
import { heicDeExemplo, imagem } from "@/testes/arquivos/gerar";

import { tratarEnvioMidia } from "./rota-envio";

const URL_SITE = "http://localhost:3000";
const HORA = 60 * 60 * 1000;
let contador = 0;

/** Entra de verdade (senha + código) e devolve o cabeçalho Cookie da sessão. */
async function sessaoDe(perfil: Perfil): Promise<string> {
  contador += 1;
  const p = await criarPessoaDeTeste({
    nome: `Rota ${contador}`,
    email: `rota${contador}-${Date.now()}@sintravc.local`,
    perfil,
    senha: "senha-certa-123",
  });
  const primeira = await entrar({ email: p.email, senha: p.senha });
  if (primeira.tipo !== "precisa_codigo") throw new Error(`login: ${primeira.tipo}`);
  const final = await confirmarCodigo(
    { codigo: await codigoTotp(p.segredoTotp) },
    { cabecalhos: new Headers({ cookie: cookiesDe(primeira.cabecalhos) }) },
  );
  if (final.tipo !== "entrou") throw new Error(`código: ${final.tipo}`);
  return cookiesDe(final.cabecalhos);
}

async function pedido(opcoes: { cookie?: string; origin?: string | null; arquivo?: File; contentLength?: string }) {
  const corpo = new FormData();
  if (opcoes.arquivo) corpo.set("arquivo", opcoes.arquivo);
  const cabecalhos = new Headers();
  if (opcoes.cookie) cabecalhos.set("cookie", opcoes.cookie);
  if (opcoes.origin !== null) cabecalhos.set("origin", opcoes.origin ?? URL_SITE);
  const request = new Request(`${URL_SITE}/api/midia`, { method: "POST", headers: cabecalhos, body: corpo });
  if (opcoes.contentLength) {
    // O Request calcula o Content-Length do FormData; para simular um corpo grande, troca o cabeçalho.
    const comTamanho = new Headers(request.headers);
    comTamanho.set("content-length", opcoes.contentLength);
    return new Request(request, { headers: comTamanho });
  }
  return request;
}

const png = async () => new File([await imagem("png")], "logo.png", { type: "image/png" });

describe("POST /api/midia (tratarEnvioMidia)", () => {
  it("COM com a sessão válida e o Origin do site: 201 com o id; o HEIC vira JPG", async () => {
    const cookie = await sessaoDe("COM");
    const { armazenamento } = armazenamentoEmMemoria();
    const arquivo = new File([heicDeExemplo().slice()], "IMG_0001.HEIC", { type: "application/octet-stream" });

    const resposta = await tratarEnvioMidia(await pedido({ cookie, arquivo }), { urlSite: URL_SITE, armazenamento });

    expect(resposta.status).toBe(201);
    const { id } = (await resposta.json()) as { id: string };
    const [linha] = await banco().select().from(midia).where(eq(midia.id, id));
    expect(linha).toMatchObject({ nomeArquivo: "IMG_0001.jpg", mime: "image/jpeg" });
  });

  it("sem sessão: 401", async () => {
    const resposta = await tratarEnvioMidia(await pedido({ arquivo: await png() }), { urlSite: URL_SITE });
    expect(resposta.status).toBe(401);
    expect(await resposta.json()).toEqual({ erro: "Sua sessão expirou. Entre de novo para enviar arquivos." });
  });

  it("sessão com mais de 12 h desde o login (E05): 401", async () => {
    const cookie = await sessaoDe("COM");
    const resposta = await tratarEnvioMidia(await pedido({ cookie, arquivo: await png() }), {
      urlSite: URL_SITE,
      agora: new Date(Date.now() + 13 * HORA),
    });
    expect(resposta.status).toBe(401);
  });

  it("perfil Atendimento: 403", async () => {
    const cookie = await sessaoDe("ATD");
    const resposta = await tratarEnvioMidia(await pedido({ cookie, arquivo: await png() }), { urlSite: URL_SITE });
    expect(resposta.status).toBe(403);
  });

  it.each([
    ["de outro site", "https://golpe.example"],
    ["ausente", null],
    ["com outra porta", "http://localhost:3100"],
  ])("Origin %s: 403, antes mesmo de olhar a sessão", async (_caso, origin) => {
    const cookie = await sessaoDe("ADM");
    const { armazenamento, objetos } = armazenamentoEmMemoria();
    const resposta = await tratarEnvioMidia(await pedido({ cookie, origin, arquivo: await png() }), {
      urlSite: URL_SITE,
      armazenamento,
    });
    expect(resposta.status).toBe(403);
    expect(objetos.size).toBe(0);
  });

  it("corpo acima do limite (Content-Length): 413 com a mensagem de tamanho", async () => {
    const cookie = await sessaoDe("COM");
    const resposta = await tratarEnvioMidia(
      await pedido({ cookie, arquivo: await png(), contentLength: String(20 * 1024 * 1024) }),
      { urlSite: URL_SITE },
    );
    expect(resposta.status).toBe(413);
    expect(await resposta.json()).toEqual({ erro: expect.stringContaining("10 MB") });
  });

  it("formato recusado: 422 com a mensagem de formato", async () => {
    const cookie = await sessaoDe("COM");
    const gif = new File([await imagem("gif")], "convite-assembleia.gif", { type: "image/gif" });
    const resposta = await tratarEnvioMidia(await pedido({ cookie, arquivo: gif }), { urlSite: URL_SITE });
    expect(resposta.status).toBe(422);
    expect(await resposta.json()).toEqual({ erro: expect.stringMatching(/^Formato não aceito/) });
  });

  it("sem arquivo no formulário: 400", async () => {
    const cookie = await sessaoDe("COM");
    const resposta = await tratarEnvioMidia(await pedido({ cookie }), { urlSite: URL_SITE });
    expect(resposta.status).toBe(400);
  });
});
