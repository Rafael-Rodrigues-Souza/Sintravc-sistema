import { describe, expect, it } from "vitest";

import { duracaoPorExtenso } from "./duracao";

// Os valores do Parametro (segundos ou horas) viram texto para a tela e os e-mails.
describe("duracaoPorExtenso", () => {
  it.each([
    [1, "1 segundo"],
    [30, "30 segundos"],
    [60, "1 minuto"],
    [120, "2 minutos"],
    [90, "90 segundos"],
    [3600, "1 hora"],
    [7200, "2 horas"],
    [5400, "90 minutos"],
  ])("%i segundos → %s", (segundos, texto) => {
    expect(duracaoPorExtenso(segundos)).toBe(texto);
  });
});
