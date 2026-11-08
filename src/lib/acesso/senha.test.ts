import { describe, expect, it } from "vitest";

import { validarSenhaDaEquipe } from "./senha";

// RN47: mínimo de 10 caracteres (valor do Parametro), letras e números, diferente do e-mail e do nome.
const pessoa = { email: "ana.souza@sintravc.org.br", nome: "Ana Souza", minimo: 10 };

describe("validarSenhaDaEquipe (RN47)", () => {
  it("aceita uma senha com 10 caracteres, letras e números", () => {
    expect(validarSenhaDaEquipe({ ...pessoa, senha: "onibus2026" })).toEqual([]);
  });

  it("recusa a senha mais curta que o mínimo do Parametro", () => {
    expect(validarSenhaDaEquipe({ ...pessoa, senha: "onibus202" })).toEqual(["minimo"]);
    expect(validarSenhaDaEquipe({ ...pessoa, senha: "onibus2026", minimo: 12 })).toEqual(["minimo"]);
  });

  it("exige letras e números", () => {
    expect(validarSenhaDaEquipe({ ...pessoa, senha: "somenteletras" })).toEqual(["letras_e_numeros"]);
    expect(validarSenhaDaEquipe({ ...pessoa, senha: "1234567890" })).toEqual(["letras_e_numeros"]);
    expect(validarSenhaDaEquipe({ ...pessoa, senha: "ônibus2026" })).toEqual([]);
  });

  it("recusa a senha igual ao e-mail ou à parte antes do @, sem ligar para maiúsculas", () => {
    const outra = { email: "ana2026souza@sintravc.org.br", nome: "Ana Souza", minimo: 10 };
    expect(validarSenhaDaEquipe({ ...outra, senha: "ana2026souza@sintravc.org.br" })).toEqual(["diferente_do_email"]);
    expect(validarSenhaDaEquipe({ ...outra, senha: "Ana2026Souza" })).toEqual(["diferente_do_email"]);
  });

  it("recusa a senha igual ao nome, sem ligar para acentos, maiúsculas e espaços", () => {
    const outra = { email: "jose@sintravc.org.br", nome: "José Antônio 2º", minimo: 10 };
    expect(validarSenhaDaEquipe({ ...outra, senha: "joseantonio2º" })).toEqual(["diferente_do_nome"]);
    expect(validarSenhaDaEquipe({ ...outra, senha: "José Antônio 2º" })).toEqual(["diferente_do_nome"]);
  });

  it("aceita a senha que só contém o nome no meio de outras coisas", () => {
    expect(validarSenhaDaEquipe({ ...pessoa, senha: "anasouza-linha-42" })).toEqual([]);
  });
});
