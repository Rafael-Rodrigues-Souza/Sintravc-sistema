import { describe, expect, it } from "vitest";

import { CAPA_BYTES_MAX, youtubeReal } from "./youtube";

function respostaJson(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

describe("youtubeReal", () => {
  it("lê título e canal pelo oEmbed e a duração pela Data API, quando há a chave", async () => {
    const pedidos: string[] = [];
    const yt = youtubeReal({
      chaveDataApi: "chave",
      buscar: async (url) => {
        pedidos.push(String(url));
        if (String(url).includes("oembed")) return respostaJson(200, { title: " Saúde no volante ", author_name: "SINTRAVC" });
        return respostaJson(200, { items: [{ contentDetails: { duration: "PT28M10S" } }] });
      },
    });
    expect(await yt.buscarVideo("ab12Cd34Ef5")).toEqual({
      tipo: "ok",
      video: { id: "ab12Cd34Ef5", titulo: "Saúde no volante", canal: "SINTRAVC", duracaoSeg: 1690 },
    });
    expect(pedidos[0]).toContain("url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dab12Cd34Ef5");
  });

  it("sem a chave (D4), não chama a Data API e a duração fica vazia", async () => {
    const pedidos: string[] = [];
    const yt = youtubeReal({
      buscar: async (url) => {
        pedidos.push(String(url));
        return respostaJson(200, { title: "T", author_name: "C" });
      },
    });
    const r = await yt.buscarVideo("ab12Cd34Ef5");
    expect(r).toMatchObject({ tipo: "ok", video: { duracaoSeg: null } });
    expect(pedidos).toHaveLength(1);
  });

  it("vídeo privado ou apagado: não encontrado; falha de rede: fora do ar", async () => {
    expect(await youtubeReal({ buscar: async () => respostaJson(401, {}) }).buscarVideo("ab12Cd34Ef5")).toEqual({
      tipo: "nao_encontrado",
    });
    expect(await youtubeReal({ buscar: async () => respostaJson(404, {}) }).buscarVideo("ab12Cd34Ef5")).toEqual({
      tipo: "nao_encontrado",
    });
    expect(await youtubeReal({ buscar: async () => respostaJson(500, {}) }).buscarVideo("ab12Cd34Ef5")).toEqual({
      tipo: "fora_do_ar",
    });
    expect(
      await youtubeReal({
        buscar: async () => {
          throw new Error("rede");
        },
      }).buscarVideo("ab12Cd34Ef5"),
    ).toEqual({ tipo: "fora_do_ar" });
  });

  it("capa: tenta a maior e depois a média; recusa tipo e tamanho errados", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const pedidos: string[] = [];
    const yt = youtubeReal({
      buscar: async (url) => {
        pedidos.push(String(url));
        if (String(url).includes("maxresdefault")) return new Response("", { status: 404 });
        return new Response(jpeg, { headers: { "content-type": "image/jpeg" } });
      },
    });
    expect(await yt.baixarCapa("ab12Cd34Ef5")).toEqual({ bytes: jpeg, tipo: "image/jpeg" });
    expect(pedidos).toEqual([
      "https://i.ytimg.com/vi/ab12Cd34Ef5/maxresdefault.jpg",
      "https://i.ytimg.com/vi/ab12Cd34Ef5/hqdefault.jpg",
    ]);

    const html = youtubeReal({ buscar: async () => new Response("<html>", { headers: { "content-type": "text/html" } }) });
    expect(await html.baixarCapa("ab12Cd34Ef5")).toBeNull();

    const grande = youtubeReal({
      buscar: async () => new Response(new Uint8Array(CAPA_BYTES_MAX + 1), { headers: { "content-type": "image/jpeg" } }),
    });
    expect(await grande.baixarCapa("ab12Cd34Ef5")).toBeNull();
  });
});
