import { describe, expect, it } from "vitest";

import { estadoDaSessao } from "./sessao";

// E05 / RNF02: a sessão da equipe termina depois de 2 h sem uso ou 12 h após o login,
// o que vier primeiro. Os limites vêm do Parametro; aqui, os valores iniciais.
const limites = { semUsoHoras: 2, maximaHoras: 12 };
const login = new Date("2026-11-07T08:00:00Z");
const h = (horas: number, minutos = 0) => new Date(login.getTime() + (horas * 60 + minutos) * 60_000);

describe("estadoDaSessao", () => {
  it("logo depois do login, vale", () => {
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: login, agora: h(0, 1), limites })).toBe("valida");
  });

  it("1h59 sem uso ainda vale", () => {
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: h(3), agora: h(4, 59), limites })).toBe("valida");
  });

  it("2 h sem uso encerra", () => {
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: h(3), agora: h(5), limites })).toBe("expirada_sem_uso");
  });

  it("usando sem parar, ainda vale com 11h59 de login", () => {
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: h(11, 58), agora: h(11, 59), limites })).toBe("valida");
  });

  it("12 h após o login encerra, mesmo em uso", () => {
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: h(11, 59), agora: h(12), limites })).toBe("expirada_maxima");
  });

  it("quando as duas valem, a de 12 h é a informada", () => {
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: h(9), agora: h(13), limites })).toBe("expirada_maxima");
  });

  it("segue os limites do Parametro", () => {
    const outros = { semUsoHoras: 1, maximaHoras: 4 };
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: login, agora: h(1), limites: outros })).toBe("expirada_sem_uso");
    expect(estadoDaSessao({ criadaEm: login, ultimoUso: h(3, 30), agora: h(4), limites: outros })).toBe("expirada_maxima");
  });
});
