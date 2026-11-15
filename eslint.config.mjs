import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // O vaul está sem manutenção (E49): todo uso passa por src/components/ui/drawer.tsx, para a troca
    // (por um Dialog do radix-ui com cara de folha inferior) mexer só nesse arquivo.
    ignores: ["src/components/ui/drawer.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "vaul", message: "Use @/components/ui/drawer: o vaul só entra por ali (E49)." }] },
      ],
    },
  },
  globalIgnores([".next/**", ".next-e2e/**", "test-results/**", "playwright-report/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**"]),
]);
