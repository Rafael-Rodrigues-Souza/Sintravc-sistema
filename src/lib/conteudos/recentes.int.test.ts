import { describe, expect, it } from "vitest";

import { edicaoDe, pessoaDaEquipe } from "@/testes/equipe";
import { noticiaCompleta, rascunhoSalvo } from "@/testes/noticias";

import { publicarNoticia } from "./publicar";
import { noticiasRecentes } from "./recentes";
import { salvarRascunhoNoticia } from "./salvar";

describe("noticiasRecentes (coluna da página Comunicados, E58)", () => {
  it("só as publicadas, da mais nova para a mais velha, com o título da versão no ar e o endereço da notícia", async () => {
    const quem = await pessoaDaEquipe("COM");
    const marca = Date.now();
    const primeira = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: `Recente A ${marca}` }));
    const segunda = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: `Recente B ${marca}` }));
    const rascunho = await rascunhoSalvo(quem, await noticiaCompleta({ titulo: `Só rascunho ${marca}` }));
    await publicarNoticia({ id: primeira.id, revisaoBase: primeira.revisao }, { quem });
    const publicada = await publicarNoticia({ id: segunda.id, revisaoBase: segunda.revisao }, { quem });

    // Editar depois de publicar não muda o site até publicar de novo.
    if (publicada.tipo !== "publicada") throw new Error("esperava publicada");
    const revisao = publicada.revisaoPublicada;
    await salvarRascunhoNoticia({ id: segunda.id, revisaoBase: revisao, dados: await noticiaCompleta({ titulo: `Em edição ${marca}` }) }, edicaoDe(quem));

    const recentes = await noticiasRecentes(50);
    const minhas = recentes.filter((n) => n.titulo.endsWith(String(marca)));
    expect(minhas.map((n) => n.titulo)).toEqual([`Recente B ${marca}`, `Recente A ${marca}`]);
    expect(recentes.some((n) => n.id === rascunho.id)).toBe(false);
    expect(minhas[0]).toMatchObject({ href: expect.stringMatching(/^\/noticias\/.+/), capa: null });
  });

  it("devolve no máximo o limite pedido", async () => {
    expect((await noticiasRecentes(1)).length).toBeLessThanOrEqual(1);
  });
});
