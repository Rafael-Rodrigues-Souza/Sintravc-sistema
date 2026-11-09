import { describe, expect, it } from "vitest";

import { navegadorDe } from "./navegador";

// O "Onde" dos e-mails de segurança (M03, M04). Exemplos reais de User-Agent.
describe("navegadorDe", () => {
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Navegador Chrome · Windows",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
      "Navegador Edge · Windows",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; SM-A146M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      "Navegador Chrome · Android",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Navegador Safari · iPhone",
    ],
    ["Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0", "Navegador Firefox · Linux"],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      "Navegador Safari · Mac",
    ],
  ])("%s", (agente, esperado) => {
    expect(navegadorDe(agente)).toBe(esperado);
  });

  it("sem User-Agent, diz que não sabe", () => {
    expect(navegadorDe(undefined)).toBe("Navegador não identificado");
    expect(navegadorDe("curl/8.4.0")).toBe("Navegador não identificado");
  });
});
