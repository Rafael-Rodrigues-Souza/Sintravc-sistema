import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unidade",
          include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
          exclude: ["**/*.int.test.ts"],
        },
      },
      {
        // Testes com Postgres real. Usam um banco próprio (sintravc_teste), recriado a cada
        // rodada, porque a Atividade não deixa apagar nada (RN18).
        extends: true,
        test: {
          name: "integracao",
          include: ["src/**/*.int.test.ts", "scripts/**/*.int.test.ts"],
          globalSetup: ["./src/testes/preparar-banco.ts"],
          setupFiles: ["./src/testes/usar-banco-teste.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
