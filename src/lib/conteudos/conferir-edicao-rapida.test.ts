import { describe, expect, it } from "vitest";

import { conferirEdicaoRapida } from "./conferir-edicao-rapida";
import { LIMITE_MANCHETE } from "./dados";

const base = { titulo: "Assembleia no sábado", categoriaId: "c1", situacao: "oculto" as const, estado: "publicado" as const };

describe("conferirEdicaoRapida: antes de salvar ou de abrir a confirmação (E23)", () => {
  it("tudo certo: nada a apontar", () => {
    expect(conferirEdicaoRapida(base)).toBeNull();
  });

  it("publicada ou oculta sem categoria: aponta o campo", () => {
    expect(conferirEdicaoRapida({ ...base, categoriaId: "" })).toEqual({ campo: "categoriaId", mensagem: "Escolha a categoria." });
    expect(conferirEdicaoRapida({ ...base, estado: "oculto", situacao: "publicado", categoriaId: "" })).toMatchObject({
      campo: "categoriaId",
    });
  });

  it("rascunho que continua rascunho pode ficar sem categoria", () => {
    expect(conferirEdicaoRapida({ ...base, estado: "rascunho", situacao: "rascunho", categoriaId: "" })).toBeNull();
  });

  it("título acima do limite da manchete: aponta o título (E40)", () => {
    expect(conferirEdicaoRapida({ ...base, titulo: "a".repeat(LIMITE_MANCHETE + 1) })).toEqual({
      campo: "titulo",
      mensagem: `A manchete pode ter até ${LIMITE_MANCHETE} caracteres.`,
    });
  });
});
