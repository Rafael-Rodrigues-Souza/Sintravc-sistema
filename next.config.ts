import type { NextConfig } from "next";

// Raiz fixa no próprio projeto. Sem isso, um package-lock.json numa pasta acima
// (ex.: C:\Users\<nome>) faz o Next vigiar a pasta do usuário inteira, e qualquer
// arquivo gravado ali (logs, por exemplo) recarrega a página sem parar.
const raiz = __dirname;

const nextConfig: NextConfig = {
  output: "standalone",
  // Os testes de ponta a ponta compilam em outra pasta, para não atrapalhar o pnpm dev.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  outputFileTracingRoot: raiz,
  turbopack: { root: raiz },
  // A fila de tarefas (E44) roda no Node, sem passar pelo empacotador.
  serverExternalPackages: ["pg-boss"],
  experimental: {
    // forbidden() e a tela 403 do painel (N1).
    authInterrupts: true,
  },
};

export default nextConfig;
