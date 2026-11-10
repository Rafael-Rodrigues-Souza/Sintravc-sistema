import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { pararAntesDeDesligar } from "./desligar";

describe("pararAntesDeDesligar: no SIGTERM/SIGINT, a fila para com calma antes do Next encerrar (E44)", () => {
  it("espera a fila parar e só então passa o sinal para quem já escutava (o Next)", async () => {
    const processo = new EventEmitter();
    const ordem: string[] = [];
    processo.on("SIGTERM", () => ordem.push("next encerra"));
    let terminar!: () => void;
    const parar = () =>
      new Promise<void>((resolve) => {
        ordem.push("fila parando");
        terminar = () => {
          ordem.push("fila parou");
          resolve();
        };
      });

    pararAntesDeDesligar(processo, parar);
    processo.emit("SIGTERM", "SIGTERM");
    await Promise.resolve();
    expect(ordem).toEqual(["fila parando"]);

    terminar();
    await new Promise((r) => setTimeout(r, 0));
    expect(ordem).toEqual(["fila parando", "fila parou", "next encerra"]);
  });

  it("vale também para SIGINT, e um segundo sinal não para a fila de novo", async () => {
    const processo = new EventEmitter();
    let paradas = 0;
    const recebidos: string[] = [];
    processo.on("SIGINT", (s) => recebidos.push(s));

    pararAntesDeDesligar(processo, async () => {
      paradas++;
    });
    processo.emit("SIGINT", "SIGINT");
    processo.emit("SIGINT", "SIGINT");
    await new Promise((r) => setTimeout(r, 0));

    expect(paradas).toBe(1);
    expect(recebidos).toEqual(["SIGINT"]);
  });

  it("se a fila der erro ao parar, o Next encerra mesmo assim", async () => {
    const processo = new EventEmitter();
    const recebidos: string[] = [];
    processo.on("SIGTERM", (s) => recebidos.push(s));

    pararAntesDeDesligar(processo, async () => {
      throw new Error("banco fora do ar");
    });
    processo.emit("SIGTERM", "SIGTERM");
    await new Promise((r) => setTimeout(r, 0));

    expect(recebidos).toEqual(["SIGTERM"]);
  });
});
