// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TabelaConteudos } from "./tabela-conteudos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

/**
 * O rodapé vem do servidor (PaginaConteudos). Numa navegação, o Flight pode entregá-lo adiado: uma
 * referência “$L” (a linha do payload passou do tamanho máximo) cujo valor é outra referência, a do
 * elemento que ainda espera as linhas de que depende. As duas são montadas aqui como o cliente do
 * Flight monta (react-server-dom: createLazyChunkWrapper), para o teste não depender do tempo da rede.
 */
function rodapeAdiadoPeloFlight() {
  const rodape = <footer>Mostrando 1–20 de 42 conteúdos</footer>;
  const lazy = Symbol.for("react.lazy");
  const doElemento = { $$typeof: lazy, _payload: rodape, _init: (valor: unknown) => valor, _store: { validated: 0 } };
  const daLinha = {
    $$typeof: lazy,
    _payload: { status: "fulfilled", value: doElemento },
    _init: (chunk: { value: unknown }) => chunk.value,
    _store: { validated: 0 },
  };
  return daLinha as unknown as React.ReactNode;
}

describe("TabelaConteudos", () => {
  afterEach(() => vi.restoreAllMocks());

  it("o rodapé que chega adiado do servidor não gera aviso de key no console (só aparece no modo de desenvolvimento)", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const react = createRoot(raiz);

    await act(async () => react.render(<TabelaConteudos arquivados={false} linhas={[]} rodape={rodapeAdiadoPeloFlight()} />));

    expect(raiz.querySelector("footer")?.textContent).toBe("Mostrando 1–20 de 42 conteúdos");
    const avisosDeKey = erro.mock.calls.filter((args) => args.some((a) => typeof a === "string" && a.includes('unique "key"')));
    expect(avisosDeKey, "aviso de key no console").toEqual([]);
    await act(async () => react.unmount());
  });
});
