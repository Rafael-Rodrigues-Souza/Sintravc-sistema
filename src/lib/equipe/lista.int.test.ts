import { describe, expect, it } from "vitest";

import { banco } from "@/lib/db";
import { pessoaEquipe } from "@/lib/db/schema";

import { listarEquipe } from "./lista";

describe("listarEquipe (RF51)", () => {
  it("traz administradores, depois Comunicação, e os convites pendentes no fim, por nome", async () => {
    const sufixo = Date.now();
    await banco()
      .insert(pessoaEquipe)
      .values([
        { nome: "Zélia Pendente", email: `z-${sufixo}@lista.local`, perfil: "ADM", situacao: "pendente" },
        { nome: "Bia Comunicação", email: `b-${sufixo}@lista.local`, perfil: "COM", situacao: "ativa", duasEtapasAtivas: true },
        { nome: "Ana Admin", email: `a-${sufixo}@lista.local`, perfil: "ADM", situacao: "ativa", duasEtapasAtivas: true },
      ]);

    const nomes = (await listarEquipe()).filter((p) => p.email.endsWith(`${sufixo}@lista.local`)).map((p) => p.nome);
    expect(nomes).toEqual(["Ana Admin", "Bia Comunicação", "Zélia Pendente"]);
  });
});
