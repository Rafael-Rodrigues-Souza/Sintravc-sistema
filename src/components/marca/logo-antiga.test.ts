import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** Todos os arquivos de código de uma pasta, com o caminho a partir da raiz do projeto. */
function arquivos(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) return arquivos(caminho);
    return /\.(tsx?|css)$/.test(item.name) ? [caminho] : [];
  });
}

describe("logo antiga (#61)", () => {
  it("saiu do projeto e nenhum código aponta para ela", () => {
    expect(existsSync("public/painel/logo-sempre-branca.png")).toBe(false);
    const citam = ["src", "e2e"].flatMap(arquivos).filter((f) => readFileSync(f, "utf8").includes("logo-sempre-branca"));
    // Este teste cita o nome de propósito.
    expect(citam.filter((f) => !f.endsWith("logo-antiga.test.ts"))).toEqual([]);
  });
});
